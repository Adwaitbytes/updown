import { Transaction } from "@mysten/sui/transactions";
import { runMigrations } from "@updown/shared/migrate";

import { getPool, query, withTx, type OpenPositionRow } from "./db.js";
import { loadEnv } from "./env.js";
import { log } from "./log.js";
import { getSettlerSigner, getSuiClient } from "./sui.js";

const STREAK_TIERS = [3, 7, 30] as const;

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
      // PositionSettled event (Move-side abort, missing event, etc.) are
      // rolled back to 'open' so a future tick can retry them.
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
    tx.moveCall({
      target: `${env.PREDICT_PACKAGE_ID}::predict::redeem_permissionless`,
      typeArguments: [env.DUSDC_TYPE],
      arguments: [
        tx.object(env.PREDICT_OBJ_ID),
        tx.object(managerId),
        tx.pure.string(pos.market_key),
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
  const settledType = `${env.PREDICT_PACKAGE_ID}::predict::PositionSettled`;
  for (const ev of result.events ?? []) {
    if (ev.type !== settledType) continue;
    const json = ev.parsedJson as Record<string, unknown> | undefined;
    if (!json) continue;
    const marketKey = typeof json.market_key === "string" ? json.market_key : null;
    const payout = typeof json.payout === "string" ? BigInt(json.payout) : 0n;
    const won = json.won === true;
    if (!marketKey) continue;
    const match = group.find((r) => r.market_key === marketKey);
    if (!match) continue;
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
    // Only flip 'settling' -> 'settled' so we never overwrite a row that was
    // already settled by a previous tick (defence in depth on top of the
    // SKIP LOCKED guard above).
    await client.query(
      `UPDATE positions
          SET status = 'settled',
              payout_micros = $1,
              won = $2,
              settled_at = NOW()
        WHERE id = $3
          AND status = 'settling'`,
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

    // Tier crossing → enqueue mint job.
    const tier = STREAK_TIERS.find(
      (t) => nextStreak === t && prev.last_tier_minted < t,
    );
    if (tier !== undefined) {
      const recipient = pos.sui_address;
      const accountId = pos.account_id ?? pos.betting_account_id;
      if (!recipient || !accountId) {
        log.warn(
          {
            telegramUserId: pos.telegram_user_id,
            tier,
            hasRecipient: !!recipient,
            hasAccount: !!accountId,
          },
          "skipping streak mint enqueue: missing recipient/account_id",
        );
      } else {
        const env = loadEnv();
        const imageUrl = `${env.STREAK_IMAGE_BASE_URL}/${tier}.svg`;
        await client.query(
          `INSERT INTO streak_mint_jobs
                (telegram_user_id, recipient, tier, wins, account_id,
                 image_url, status, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())`,
          [
            pos.telegram_user_id,
            recipient,
            tier,
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
