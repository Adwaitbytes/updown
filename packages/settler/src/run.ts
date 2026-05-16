import { Transaction } from "@mysten/sui/transactions";
import { runMigrations } from "./migrate.js";

import { getPool, query, withTx, type OpenPositionRow } from "./db.js";
import { loadEnv } from "./env.js";
import { log } from "./log.js";
import { getSettlerSigner, getSuiClient } from "./sui.js";

// Map win-count thresholds to the on-chain u8 tier value. The Move side
// asserts `tier <= 2`, so we must NEVER pass the threshold (e.g. 3/7/30)
// as the tier — only 0/1/2 are valid.
const STREAK_TIERS = [
  { wins: 3, tier: 0 }, // Bronze
  { wins: 7, tier: 1 }, // Silver
  { wins: 30, tier: 2 }, // Gold
] as const;

interface SettlementOutcome {
  positionId: string;
  payoutMicros: bigint;
  won: boolean;
}

let migrationsApplied = false;

async function ensureMigrations(): Promise<void> {
  if (migrationsApplied) return;
  await runMigrations(getPool());
  migrationsApplied = true;
  log.info("migrations applied");
}

export async function runOnce(): Promise<{ settled: number; errors: number }> {
  await ensureMigrations();

  const env = loadEnv();
  let settled = 0;
  let errors = 0;

  // 1. Atomically transition expired open positions to 'settling'.
  // FOR UPDATE SKIP LOCKED makes concurrent ticks see disjoint sets; the
  // status flip means a future tick won't re-process even if this one crashes.
  const { rows } = await query<OpenPositionRow>(
    `UPDATE positions
        SET status = 'settling'
      WHERE id IN (
        SELECT id FROM positions
         WHERE status = 'open'
           AND expiry_ms < $1
         ORDER BY expiry_ms ASC
         LIMIT 200
         FOR UPDATE SKIP LOCKED
      )
      RETURNING id, telegram_user_id, sui_address, account_id,
                predict_manager_id, betting_account_id, market_key,
                oracle_id, is_up,
                stake_micros::text AS stake_micros,
                expiry_ms::text AS expiry_ms,
                strike_micros::text AS strike_micros`,
    [Date.now()],
  );

  if (rows.length === 0) {
    log.debug("no expired positions");
    return { settled, errors };
  }

  // 2. Group by manager_id (one PTB per manager).
  const groups = new Map<string, OpenPositionRow[]>();
  for (const r of rows) {
    const list = groups.get(r.predict_manager_id) ?? [];
    list.push(r);
    groups.set(r.predict_manager_id, list);
  }

  for (const [managerId, group] of groups) {
    try {
      const outcomes = await settleGroup(env, managerId, group);
      const settledIds = new Set(outcomes.map((o) => o.positionId));
      for (const o of outcomes) {
        await onSettled(o, group.find((r) => r.id === o.positionId));
        settled += 1;
      }
      // Any rows that were transitioned to 'settling' but did not produce a
      // PositionRedeemed event with is_settled=true (oracle not yet settled,
      // Move-side abort, missing event, etc.) are rolled back to 'open' so a
      // future tick can retry them.
      const unsettled = group.filter((r) => !settledIds.has(r.id));
      if (unsettled.length > 0) {
        await query(
          `UPDATE positions
              SET status = 'open'
            WHERE id = ANY($1::text[])
              AND status = 'settling'`,
          [unsettled.map((r) => r.id)],
        );
        log.warn(
          { managerId, count: unsettled.length },
          "rolled back unsettled rows",
        );
      }
    } catch (err) {
      errors += 1;
      log.error({ err, managerId }, "settle group failed");
      // PTB failed entirely — release the lock so retry works on next tick.
      await query(
        `UPDATE positions
            SET status = 'open'
          WHERE id = ANY($1::text[])
            AND status = 'settling'`,
        [group.map((r) => r.id)],
      ).catch((e) =>
        log.error({ err: e, managerId }, "rollback to open failed"),
      );
    }
  }

  return { settled, errors };
}

async function settleGroup(
  env: ReturnType<typeof loadEnv>,
  managerId: string,
  group: ReadonlyArray<OpenPositionRow>,
): Promise<SettlementOutcome[]> {
  const tx = new Transaction();
  for (const pos of group) {
    if (!pos.oracle_id) {
      log.warn(
        { positionId: pos.id, managerId },
        "skipping redeem: position is missing oracle_id (cannot reconstruct MarketKey)",
      );
      continue;
    }
    if (!pos.strike_micros) {
      log.warn(
        { positionId: pos.id },
        "skipping redeem: missing strike_micros",
      );
      continue;
    }
    // The bot's place_bet writes the 1e9-scaled strike into `strike_micros`
    // (yes, the column name predates the rename) so we can pipe it straight
    // into market_key::{up,down} which expects u64.
    const strikeScaled = BigInt(pos.strike_micros);
    const expiryMs = BigInt(pos.expiry_ms);

    const marketKey = tx.moveCall({
      target: `${env.PREDICT_PACKAGE_ID}::market_key::${pos.is_up ? "up" : "down"}`,
      arguments: [
        tx.pure.id(pos.oracle_id),
        tx.pure.u64(expiryMs),
        tx.pure.u64(strikeScaled),
      ],
    });

    tx.moveCall({
      target: `${env.PREDICT_PACKAGE_ID}::predict::redeem_permissionless`,
      typeArguments: [env.DUSDC_TYPE],
      arguments: [
        tx.object(env.PREDICT_OBJ_ID), // &mut Predict<DUSDC>
        tx.object(managerId), // &mut PredictManager<DUSDC>
        tx.object(pos.oracle_id), // &Oracle<DUSDC>
        marketKey, // MarketKey
        tx.pure.u64(BigInt(pos.stake_micros)), // quantity
        tx.object("0x6"), // &Clock
      ],
    });
  }

  const client = getSuiClient();

  // For now, use the local signer; in production this is sponsored via Enoki.
  const signer = getSettlerSigner();
  const txBytes = await tx.build({ client });
  const result = await client.signAndExecuteTransaction({
    transaction: txBytes,
    signer,
    options: { showEvents: true, showEffects: true },
  });

  log.info(
    { managerId, digest: result.digest, count: group.length },
    "settled batch",
  );

  return parseSettlementEvents(env, group, result);
}

interface ParsedTxResult {
  events?: ReadonlyArray<{ type: string; parsedJson?: unknown }> | null;
}

function parseSettlementEvents(
  env: ReturnType<typeof loadEnv>,
  group: ReadonlyArray<OpenPositionRow>,
  result: ParsedTxResult,
): SettlementOutcome[] {
  const outcomes: SettlementOutcome[] = [];
  // DeepBook Predict actually emits `PositionRedeemed` (NOT `PositionSettled`)
  // from `predict::redeem_permissionless`. ABI fields:
  //   predict_id, manager_id, owner, executor, quote_asset, oracle_id,
  //   expiry, strike, is_up, quantity, payout, bid_price, is_settled
  // The event does NOT carry our DB row id or market_key — we have to match
  // the (oracle_id, expiry, strike, is_up) tuple against the open positions
  // row. Both event.strike and our DB `strike_micros` column are at 1e9
  // scale (USD * 1e9) — `strike_micros` is a legacy column name; place_bet
  // in bot/src/commands/_bet.ts writes the 1e9-scaled value (see
  // bot/src/sui/scale.ts:STRIKE_SCALE).
  const redeemedType = `${env.PREDICT_PACKAGE_ID}::predict::PositionRedeemed`;
  for (const ev of result.events ?? []) {
    if (ev.type !== redeemedType) continue;
    const json = ev.parsedJson as Record<string, unknown> | undefined;
    if (!json) continue;

    // Gate: oracle hasn't actually settled this position yet. Treat as
    // "still settling, retry later" — leave the row in 'settling' so the
    // outer loop rolls it back to 'open' for a future tick.
    if (json.is_settled !== true) continue;

    const oracleId = typeof json.oracle_id === "string" ? json.oracle_id : null;
    const expiryStr = typeof json.expiry === "string" ? json.expiry : null;
    const strikeStr = typeof json.strike === "string" ? json.strike : null;
    const isUp =
      typeof json.is_up === "boolean"
        ? json.is_up
        : json.is_up === "true"
          ? true
          : json.is_up === "false"
            ? false
            : null;
    const payout =
      typeof json.payout === "string" ? BigInt(json.payout) : 0n;
    if (!oracleId || !expiryStr || !strikeStr || isUp === null) continue;

    const eventExpiry = BigInt(expiryStr);
    const eventStrike = BigInt(strikeStr);
    const match = group.find(
      (r) =>
        r.oracle_id === oracleId &&
        BigInt(r.expiry_ms) === eventExpiry &&
        r.strike_micros !== null &&
        BigInt(r.strike_micros) === eventStrike &&
        r.is_up === isUp,
    );
    if (!match) continue;

    const won = payout > 0n;
    outcomes.push({ positionId: match.id, payoutMicros: payout, won });
  }
  return outcomes;
}

async function onSettled(
  outcome: SettlementOutcome,
  pos: OpenPositionRow | undefined,
): Promise<void> {
  if (!pos) return;
  await withTx(async (client) => {
    // Accept either 'settling' or 'settled' so this UPDATE still goes through
    // if the indexer raced us and wrote 'settled' first from its own WS
    // subscription on PositionRedeemed. The `won IS DISTINCT FROM` guard
    // keeps us idempotent: once won/payout matches we no-op.
    await client.query(
      `UPDATE positions
          SET status = 'settled',
              payout_micros = $1,
              won = $2,
              settled_at = COALESCE(settled_at, NOW())
        WHERE id = $3
          AND status IN ('settling', 'settled')
          AND won IS DISTINCT FROM $2`,
      [outcome.payoutMicros.toString(), outcome.won, outcome.positionId],
    );

    const lastOutcome = outcome.won ? "win" : "loss";

    // Lock the streak row (or insert a fresh one) so we can compute the next
    // streak/tier in a single round-trip without races between concurrent
    // settlements for the same user.
    const cur = await client.query<{
      current_streak: number;
      best_streak: number;
      last_tier_minted: number;
    }>(
      `INSERT INTO streaks (telegram_user_id, current_streak, best_streak,
                            last_outcome, last_tier_minted, last_updated)
            VALUES ($1, 0, 0, NULL, -1, NOW())
       ON CONFLICT (telegram_user_id) DO UPDATE
            SET telegram_user_id = streaks.telegram_user_id
        RETURNING current_streak, best_streak, last_tier_minted`,
      [pos.telegram_user_id],
    );
    const prev = cur.rows[0] ?? {
      current_streak: 0,
      best_streak: 0,
      last_tier_minted: -1,
    };
    const nextStreak = outcome.won ? prev.current_streak + 1 : 0;
    const nextBest = Math.max(prev.best_streak, nextStreak);

    await client.query(
      `UPDATE streaks
          SET current_streak = $1,
              best_streak = $2,
              last_outcome = $3,
              last_updated = NOW()
        WHERE telegram_user_id = $4`,
      [nextStreak, nextBest, lastOutcome, pos.telegram_user_id],
    );

    // Tier crossing → enqueue mint job. Pick the HIGHEST tier the user now
    // qualifies for that hasn't already been minted. We scan in reverse so
    // a user who somehow jumps multiple thresholds in one settlement still
    // gets the top tier (the lower tiers are auto-shadowed by the
    // last_tier_minted gate, since the worker bumps it on success).
    const crossed = [...STREAK_TIERS]
      .reverse()
      .find(
        (t) =>
          nextStreak >= t.wins && t.tier > prev.last_tier_minted,
      );
    if (crossed !== undefined) {
      const recipient = pos.sui_address;
      const accountId = pos.account_id ?? pos.betting_account_id;
      if (!recipient || !accountId) {
        log.warn(
          {
            telegramUserId: pos.telegram_user_id,
            tier: crossed.tier,
            wins: nextStreak,
            hasRecipient: !!recipient,
            hasAccount: !!accountId,
          },
          "skipping streak mint enqueue: missing recipient/account_id",
        );
      } else {
        const env = loadEnv();
        const imageUrl = `${env.STREAK_IMAGE_BASE_URL}/${crossed.tier}.svg`;
        await client.query(
          `INSERT INTO streak_mint_jobs
                (telegram_user_id, recipient, tier, wins, account_id,
                 image_url, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())`,
          [
            pos.telegram_user_id,
            recipient,
            crossed.tier,
            nextStreak,
            accountId,
            imageUrl,
          ],
        );
        // Note: last_tier_minted is bumped by the streak-nft worker on
        // success so a failed mint job can be retried at the same tier.
      }
    }
  });

  await sendDmNotification(pos, outcome).catch((err) =>
    log.warn({ err, positionId: outcome.positionId }, "dm failed"),
  );
}

async function sendDmNotification(
  pos: OpenPositionRow,
  outcome: SettlementOutcome,
): Promise<void> {
  const env = loadEnv();
  if (!env.TELEGRAM_BOT_TOKEN) return;
  const text = outcome.won
    ? `You won ${(Number(outcome.payoutMicros) / 1_000_000).toFixed(2)} dUSDC on ${pos.market_key}.`
    : `Position ${pos.market_key} settled — better luck next round.`;
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: pos.telegram_user_id,
      text,
      parse_mode: "HTML",
    }),
  });
  if (!res.ok) {
    throw new Error(`telegram sendMessage ${res.status}`);
  }
}

// CLI entrypoint
if (process.argv[1] && process.argv[1].endsWith("run.ts")) {
  runOnce()
    .then((r) => {
      log.info(r, "run complete");
      process.exit(0);
    })
    .catch((err) => {
      log.error({ err }, "run failed");
      process.exit(1);
    });
}
