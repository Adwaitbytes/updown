import type { BotContext } from "../types.js";
import { parseBetIntent, ParseError } from "../parsing.js";
import { getUserByTelegramId, getPool } from "../db.js";
import { logger } from "../log.js";
import { deriveMarketKey } from "../markets.js";
import { buildPlaceBetTx } from "../sui/predict.js";
import { sponsorAndExecute } from "../sui/enoki.js";
import { deriveDelegatedKeypair } from "../sui/keys.js";
import { usdToMicros, microsToUsd } from "../sui/scale.js";
import { formatLockedMessage } from "../format.js";
import { getEnv } from "../env.js";

const PAYOUT_MULTIPLIER = 1.7; // 70% on a win — for display only, real number from chain.

const DAILY_CAP_DUSDC = 500;
const DAILY_CAP_MICROS = usdToMicros(DAILY_CAP_DUSDC);

interface DailySumRow {
  sum: string | null;
}

export async function handleBet(
  ctx: BotContext,
  side: "up" | "down",
): Promise<void> {
  const tgUserId = ctx.from?.id;
  if (tgUserId === undefined) {
    await ctx.reply("Could not identify you.");
    return;
  }

  const argText = (ctx.match ?? "").toString();
  let intent;
  try {
    intent = parseBetIntent(side, argText);
  } catch (err) {
    if (err instanceof ParseError) {
      await ctx.reply(err.userMessage);
      return;
    }
    throw err;
  }

  const user = await getUserByTelegramId(BigInt(tgUserId));
  if (!user) {
    await ctx.reply(
      "You are not onboarded yet. Tap /start and set up your wallet in the Mini App.",
    );
    return;
  }

  const amountMicros = usdToMicros(intent.amountDusdc);
  const pool = getPool();

  // ----- B2: enforce daily cap before submitting the tx -----
  const dailyRes = await pool.query<DailySumRow>(
    `SELECT COALESCE(SUM(stake_micros), 0)::text AS sum
       FROM positions
      WHERE telegram_user_id = $1
        AND opened_at::date = (NOW() AT TIME ZONE 'UTC')::date
        AND status IN ('open','settling','settled')`,
    [tgUserId.toString()],
  );
  const stakedMicros = BigInt(dailyRes.rows[0]?.sum ?? "0");
  if (stakedMicros + amountMicros > DAILY_CAP_MICROS) {
    const stakedUsd = microsToUsd(stakedMicros).toFixed(0);
    await ctx.reply(
      [
        "Daily cap reached.",
        `You've staked \`${stakedUsd}\` dUSDC of your \`$${DAILY_CAP_DUSDC}\` daily limit.`,
        "The cap resets at 00:00 UTC.",
      ].join("\n"),
      { parse_mode: "Markdown" },
    );
    return;
  }
  // ----------------------------------------------------------

  const market = deriveMarketKey(intent);
  const env = getEnv();

  // For now we use the predict_manager_id row also as the oracle id; this
  // gets disambiguated once the on-chain Oracle objects are deployed.
  const oracleId = user.oracle_id ?? user.predict_manager_id;

  const tx = buildPlaceBetTx({
    accountId: user.account_id,
    ownerCapId: user.owner_cap_id,
    predictManagerId: user.predict_manager_id,
    amountMicros,
    marketKey: market.bytes,
    isUp: side === "up",
    expiryMs: market.expiryMs,
    strikeScaled: market.strikeScaled,
    oracleId,
  });

  const signer = deriveDelegatedKeypair(BigInt(tgUserId));

  let digest: string;
  try {
    const out = await sponsorAndExecute({
      tx,
      sender: user.sui_address,
      signer,
      allowedMoveCallTargets: [
        `${env.UPDOWN_PACKAGE_ID}::account::place_bet`,
        `${env.PREDICT_PACKAGE_ID}::predict::mint`,
      ],
    });
    digest = out.digest;
  } catch (err) {
    logger.error({ err, tgUserId }, "place_bet failed");
    await ctx.reply(
      "Bet failed to submit. Check /balance — funds were not debited.",
    );
    return;
  }

  // Provisional position id; the indexer reconciles to the real event-emitted
  // id once the BetPlaced event is processed.
  const positionId = `${digest}:0`;

  await pool.query(
    `INSERT INTO positions
       (id, telegram_user_id, sui_address, account_id, predict_manager_id,
        betting_account_id, sui_tx_digest, market_key, oracle_id,
        expiry_ms, strike_micros, is_up, stake_micros, status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'open')
     ON CONFLICT (id) DO NOTHING`,
    [
      positionId,
      tgUserId.toString(),
      user.sui_address,
      user.account_id,
      user.predict_manager_id,
      user.account_id,
      digest,
      market.hash,
      oracleId,
      market.expiryMs.toString(),
      market.strikeScaled.toString(),
      side === "up",
      amountMicros.toString(),
    ],
  );

  await pool.query(
    `INSERT INTO daily_volume (telegram_user_id, day, total_stake_micros)
     VALUES ($1, (NOW() AT TIME ZONE 'UTC')::date, $2)
     ON CONFLICT (telegram_user_id, day)
     DO UPDATE SET total_stake_micros =
       daily_volume.total_stake_micros + EXCLUDED.total_stake_micros`,
    [tgUserId.toString(), amountMicros.toString()],
  );

  await ctx.reply(
    formatLockedMessage({
      intent,
      potentialPayoutDusdc: Math.round(intent.amountDusdc * PAYOUT_MULTIPLIER),
      txDigest: digest,
      network: "testnet",
    }),
  );
}
