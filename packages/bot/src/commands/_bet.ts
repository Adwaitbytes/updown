import { createHash } from "node:crypto";
import type { BotContext } from "../types.js";
import { parseBetIntent, ParseError } from "../parsing.js";
import { getUserByTelegramId, getPool } from "../db.js";
import { logger } from "../log.js";
import { deriveMarketKey } from "../markets.js";
import { buildPlaceBetTx } from "../sui/predict.js";
import { getSuiClient } from "../sui/client.js";
import { sponsorAndExecute } from "../sui/enoki.js";
import { deriveDelegatedKeypair } from "../sui/keys.js";
import { usdToMicros, microsToUsd, strikeToScale } from "../sui/scale.js";
import { formatLockedMessage } from "../format.js";
import { getEnv } from "../env.js";
import { resolveBtcOracle, type Tier } from "../sui/oracles.js";

const ORACLE_TIERS: ReadonlySet<Tier> = new Set(["15m", "1h", "1d", "1w"]);

const PAYOUT_MULTIPLIER = 1.7; // 70% on a win — for display only, real number from chain.

const DAILY_CAP_DUSDC = 500;
const DAILY_CAP_MICROS = usdToMicros(DAILY_CAP_DUSDC);

interface DailySumRow {
  sum: string | null;
}

/**
 * Compose the message hash that `account::place_bet` re-derives on-chain.
 *
 * Layout (all little-endian for u64s, hex strings dropped to raw bytes):
 *   account_id (32B) || market_key (32B) || is_up (1B) || expiry_ms (u64 LE)
 *     || strike_scaled (u64 LE) || amount_micros (u64 LE)
 *
 * The Move side does not constrain the byte layout — it just verifies the
 * Ed25519 signature is over `msg_hash || le_bytes(nonce)`. So as long as the
 * bot deterministically derives the same hash here that it signs, it's
 * accepted; the indexer/UI uses these fields to display the locked message.
 */
function buildMsgHash(args: {
  accountId: string;
  marketKeyHash: string;
  isUp: boolean;
  expiryMs: bigint;
  strikeScaled: bigint;
  amountMicros: bigint;
}): Uint8Array {
  const h = createHash("sha256");
  h.update(hexToBytes(args.accountId));
  h.update(hexToBytes(args.marketKeyHash));
  h.update(Uint8Array.of(args.isUp ? 1 : 0));
  h.update(u64le(args.expiryMs));
  h.update(u64le(args.strikeScaled));
  h.update(u64le(args.amountMicros));
  const digest = h.digest();
  return new Uint8Array(digest.buffer, digest.byteOffset, digest.byteLength);
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) throw new Error(`hex odd length: ${hex}`);
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function u64le(v: bigint): Uint8Array {
  const out = new Uint8Array(8);
  let x = v;
  for (let i = 0; i < 8; i++) {
    out[i] = Number(x & 0xffn);
    x >>= 8n;
  }
  return out;
}

/**
 * Read the current `nonce` field on the user's BettingAccount<DUSDC>. The
 * Move-side `place_bet` requires the signature to be over
 * `msg_hash || le_bytes(nonce)` so we must fetch fresh.
 */
async function readAccountNonce(accountId: string): Promise<bigint> {
  const client = getSuiClient();
  const obj = await client.getObject({
    id: accountId,
    options: { showContent: true },
  });
  const content = obj.data?.content;
  if (
    !content ||
    content.dataType !== "moveObject" ||
    typeof content.fields !== "object" ||
    content.fields === null
  ) {
    throw new Error(`account ${accountId} has no readable content`);
  }
  const fields = content.fields as Record<string, unknown>;
  const raw = fields.nonce;
  if (typeof raw !== "string" && typeof raw !== "number" && typeof raw !== "bigint") {
    throw new Error(`account ${accountId} missing nonce field`);
  }
  return BigInt(raw);
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

  // Resolve the next-rolling active BTC oracle for the requested tier. We
  // intentionally throw (operational alert) rather than silently fall back
  // to a placeholder oracle id — a wrong oracle would just abort on-chain.
  if (!ORACLE_TIERS.has(intent.windowLabel as Tier)) {
    await ctx.reply(
      `Window \`${intent.windowLabel}\` has no on-chain oracle yet. Use one of: 15m, 1h, 1d, 1w.`,
      { parse_mode: "Markdown" },
    );
    return;
  }
  const tier = intent.windowLabel as Tier;
  let oracleId: string;
  let oracleExpiryMs: bigint;
  try {
    const oracle = await resolveBtcOracle(tier);
    oracleId = oracle.oracle_id;
    // The on-chain MarketKey is keyed by the ORACLE's expiry; using our own
    // floor-to-minute timestamp would create a phantom market the pool has
    // never priced. Always defer to the indexer's `expiry_ms`.
    oracleExpiryMs = BigInt(oracle.expiry_ms);
  } catch (err) {
    logger.error({ err, tier, tgUserId }, "oracle resolution failed");
    await ctx.reply(
      `No active BTC oracle for the ${tier} tier right now. Try again in a moment.`,
    );
    return;
  }

  const strikeScaled = strikeToScale(intent.strikeUsd);

  // Read the chain-side nonce and sign `msg_hash || le_bytes(nonce)`.
  let nonce: bigint;
  try {
    nonce = await readAccountNonce(user.account_id);
  } catch (err) {
    logger.error({ err, tgUserId, accountId: user.account_id }, "nonce read failed");
    await ctx.reply("Could not read your on-chain account state. Try again.");
    return;
  }

  const msgHash = buildMsgHash({
    accountId: user.account_id,
    marketKeyHash: market.hash,
    isUp: side === "up",
    expiryMs: oracleExpiryMs,
    strikeScaled,
    amountMicros,
  });

  const signedMsg = new Uint8Array(msgHash.length + 8);
  signedMsg.set(msgHash, 0);
  signedMsg.set(u64le(nonce), msgHash.length);

  const signer = deriveDelegatedKeypair(BigInt(tgUserId));
  const sigOut = await signer.sign(signedMsg);
  const delegatedSig =
    sigOut instanceof Uint8Array ? sigOut : new Uint8Array(sigOut as ArrayBuffer);

  const tx = buildPlaceBetTx({
    user,
    amountMicros,
    strikeUsd: intent.strikeUsd,
    isUp: side === "up",
    expiryMs: oracleExpiryMs,
    oracleId,
    delegatedSig,
    msgHash,
  });

  let digest: string;
  try {
    const out = await sponsorAndExecute({
      tx,
      sender: user.sui_address,
      signer,
      allowedMoveCallTargets: [
        `${env.UPDOWN_PACKAGE_ID}::account::place_bet`,
        `${env.PREDICT_PACKAGE_ID}::predict_manager::deposit`,
        `${env.PREDICT_PACKAGE_ID}::market_key::up`,
        `${env.PREDICT_PACKAGE_ID}::market_key::down`,
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
      oracleExpiryMs.toString(),
      strikeScaled.toString(),
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
