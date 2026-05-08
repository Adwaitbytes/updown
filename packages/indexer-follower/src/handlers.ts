import { z } from "zod";

import { query } from "./db.js";
import { loadEnv } from "./env.js";
import { log } from "./log.js";

export interface SuiEvent {
  type: string;
  parsedJson: unknown;
  id: { txDigest: string; eventSeq: string };
  timestampMs?: string | null;
}

// ---------------------------------------------------------------------------
// zod schemas — runtime validation for on-chain event payloads.
// On-chain JSON encodes u64 / object ids as strings; booleans pass through.
// All fields are intentionally permissive (some are optional / extras allowed)
// so that schema evolution doesn't crash the indexer.
// ---------------------------------------------------------------------------

const PositionMintedSchema = z
  .object({
    position_id: z.string(),
    market_key: z.string(),
    oracle_id: z.string().optional(),
    expiry_ms: z.union([z.string(), z.number()]).optional(),
    strike: z.union([z.string(), z.number()]).optional(),
    is_up: z.boolean().optional(),
    account_id: z.string().optional(),
    sui_address: z.string().optional(),
    telegram_user_id: z.union([z.string(), z.number()]).optional(),
    predict_manager_id: z.string().optional(),
    betting_account_id: z.string().optional(),
    stake: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();
type PositionMintedJson = z.infer<typeof PositionMintedSchema>;

const PositionSettledSchema = z
  .object({
    position_id: z.string(),
    market_key: z.string().optional(),
    payout: z.union([z.string(), z.number()]).optional(),
    won: z.boolean().optional(),
  })
  .passthrough();
type PositionSettledJson = z.infer<typeof PositionSettledSchema>;

const OracleSVIUpdatedSchema = z
  .object({
    oracle_id: z.string(),
    last_update_ms: z.union([z.string(), z.number()]).optional(),
  })
  .passthrough();
type OracleSVIUpdatedJson = z.infer<typeof OracleSVIUpdatedSchema>;

const AccountCreatedSchema = z
  .object({
    account_id: z.string().optional(),
    owner: z.string().optional(),
  })
  .passthrough();
type AccountCreatedJson = z.infer<typeof AccountCreatedSchema>;

const StreakMintedSchema = z
  .object({
    telegram_user_id: z.union([z.string(), z.number()]).optional(),
    sui_address: z.string().optional(),
    tier: z.union([z.string(), z.number()]).optional(),
    nft_id: z.string().optional(),
  })
  .passthrough();
type StreakMintedJson = z.infer<typeof StreakMintedSchema>;

function tryParse<T>(
  schema: z.ZodType<T>,
  raw: unknown,
  ev: SuiEvent,
): T | null {
  const r = schema.safeParse(raw);
  if (!r.success) {
    log.warn(
      {
        type: ev.type,
        txDigest: ev.id.txDigest,
        eventSeq: ev.id.eventSeq,
        issues: r.error.issues.slice(0, 3),
      },
      "skipping event: zod validation failed",
    );
    return null;
  }
  return r.data;
}

export async function handleEvent(ev: SuiEvent): Promise<void> {
  const env = loadEnv();
  const predictType = (n: string) =>
    `${env.PREDICT_PACKAGE_ID}::predict::${n}`;
  const updownType = (mod: string, n: string) =>
    `${env.UPDOWN_PACKAGE_ID}::${mod}::${n}`;

  switch (ev.type) {
    case predictType("PositionMinted"): {
      const j = tryParse(PositionMintedSchema, ev.parsedJson, ev);
      if (j) await onPositionMinted(j, ev);
      return;
    }
    case predictType("PositionSettled"): {
      const j = tryParse(PositionSettledSchema, ev.parsedJson, ev);
      if (j) await onPositionSettled(j);
      return;
    }
    case predictType("OracleSVIUpdated"): {
      const j = tryParse(OracleSVIUpdatedSchema, ev.parsedJson, ev);
      if (j) await onOracleUpdated(j);
      return;
    }
    case updownType("account", "AccountCreated"): {
      const j = tryParse(AccountCreatedSchema, ev.parsedJson, ev);
      if (j) await onAccountCreated(j);
      return;
    }
    case updownType("streak", "StreakMinted"): {
      const j = tryParse(StreakMintedSchema, ev.parsedJson, ev);
      if (j) await onStreakMinted(j);
      return;
    }
    default:
      log.debug({ type: ev.type }, "skipping event");
  }
}

function asString(v: unknown): string | null {
  if (v === undefined || v === null) return null;
  return String(v);
}

async function onPositionMinted(
  j: PositionMintedJson,
  ev: SuiEvent,
): Promise<void> {
  if (!j.position_id || !j.market_key) return;

  const telegramUserId = asString(j.telegram_user_id);
  // telegram_user_id is BIGINT NOT NULL on positions; if the on-chain event
  // doesn't carry it we cannot insert. Skip and let the bot's authoritative
  // write path handle it. (Bot writes positions row at place-bet time.)
  if (!telegramUserId) {
    log.debug(
      { position_id: j.position_id },
      "PositionMinted has no telegram_user_id; skipping insert",
    );
    return;
  }

  await query(
    `INSERT INTO positions
        (id, telegram_user_id, sui_address, account_id, predict_manager_id,
         betting_account_id, sui_tx_digest, market_key, oracle_id, expiry_ms,
         strike_micros, is_up, stake_micros, status, opened_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'open', $14)
     ON CONFLICT (id) DO UPDATE
        SET market_key         = EXCLUDED.market_key,
            oracle_id          = EXCLUDED.oracle_id,
            expiry_ms          = EXCLUDED.expiry_ms,
            strike_micros      = EXCLUDED.strike_micros,
            is_up              = EXCLUDED.is_up,
            sui_address        = COALESCE(positions.sui_address, EXCLUDED.sui_address),
            account_id         = COALESCE(positions.account_id, EXCLUDED.account_id),
            predict_manager_id = COALESCE(positions.predict_manager_id, EXCLUDED.predict_manager_id),
            betting_account_id = COALESCE(positions.betting_account_id, EXCLUDED.betting_account_id),
            sui_tx_digest      = COALESCE(positions.sui_tx_digest, EXCLUDED.sui_tx_digest)`,
    [
      j.position_id,
      telegramUserId,
      j.sui_address ?? null,
      j.account_id ?? null,
      j.predict_manager_id ?? null,
      j.betting_account_id ?? null,
      ev.id.txDigest,
      j.market_key,
      j.oracle_id ?? null,
      asString(j.expiry_ms) ?? "0",
      asString(j.strike) ?? null,
      j.is_up ?? false,
      asString(j.stake) ?? "0",
      ev.timestampMs ? new Date(Number(ev.timestampMs)) : new Date(),
    ],
  );
}

async function onPositionSettled(j: PositionSettledJson): Promise<void> {
  if (!j.position_id) return;
  await query(
    `UPDATE positions
        SET status = 'settled',
            payout_micros = $1,
            won = $2,
            settled_at = COALESCE(settled_at, NOW())
      WHERE id = $3`,
    [asString(j.payout) ?? "0", j.won ?? false, j.position_id],
  );
}

async function onOracleUpdated(j: OracleSVIUpdatedJson): Promise<void> {
  if (!j.oracle_id) return;
  await query(
    `INSERT INTO oracle_health (oracle_id, last_update_ms, observed_at)
     VALUES ($1, $2, NOW())
     ON CONFLICT (oracle_id) DO UPDATE
        SET last_update_ms = EXCLUDED.last_update_ms,
            observed_at    = NOW()`,
    [j.oracle_id, asString(j.last_update_ms) ?? "0"],
  );
}

async function onAccountCreated(j: AccountCreatedJson): Promise<void> {
  // The on-chain event does not carry telegram_user_id (off-chain concept).
  // The miniapp webhook is authoritative for the `users` table — log only
  // here for audit / observability.
  log.info(
    { account_id: j.account_id, owner: j.owner },
    "AccountCreated (audit log only; users row owned by miniapp webhook)",
  );
}

async function onStreakMinted(j: StreakMintedJson): Promise<void> {
  const telegramUserId = asString(j.telegram_user_id);
  if (!telegramUserId || !j.nft_id) return;
  const tier = Number(asString(j.tier) ?? "0");
  await query(
    `UPDATE streaks
        SET nft_obj_id = $1,
            last_tier_minted = GREATEST(last_tier_minted, $2)
      WHERE telegram_user_id = $3`,
    [j.nft_id, tier, telegramUserId],
  );
}
