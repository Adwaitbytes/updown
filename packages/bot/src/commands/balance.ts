import type { Bot } from "grammy";
import type { BotContext } from "../types.js";
import { getPool, getUserByTelegramId } from "../db.js";
import { getSuiClient } from "../sui/client.js";
import { microsToUsd } from "../sui/scale.js";
import { logger } from "../log.js";
import { requirePrivateChat } from "./_guard.js";

const DAILY_CAP_DUSDC = 500;

interface OpenPositionRow {
  is_up: boolean;
  strike_micros: string;
  expiry_ms: string;
  stake_micros: string;
}

interface DailyVolumeRow {
  total_stake_micros: string | null;
}

interface OpenCountRow {
  count: string;
}

/**
 * Read the dUSDC balance locked in the user's BettingAccount<DUSDC> object.
 * This is NOT the same as the user's gas-coin dUSDC balance — we only show
 * what's available to bet with.
 *
 * Returns `null` if we can't resolve it (object missing, RPC error, or the
 * field layout doesn't match what we expect). Caller falls back gracefully.
 */
async function readAccountDusdcMicros(accountId: string): Promise<bigint | null> {
  try {
    const sui = getSuiClient();
    const obj = await sui.getObject({
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
      return null;
    }
    const fields = content.fields as Record<string, unknown>;
    const bal = fields.balance;
    // Sui's JSON-RPC content view encodes `Balance<T>` as either a raw u64
    // string OR `{ value: "<n>" }` depending on the RPC version. Handle both.
    if (typeof bal === "string" || typeof bal === "number") {
      return BigInt(bal);
    }
    if (bal !== null && typeof bal === "object") {
      const inner = bal as Record<string, unknown>;
      const v = inner.value ?? (inner.fields as Record<string, unknown> | undefined)?.value;
      if (typeof v === "string" || typeof v === "number") {
        return BigInt(v);
      }
    }
    return null;
  } catch (err) {
    logger.warn({ err, accountId }, "readAccountDusdcMicros failed");
    return null;
  }
}

export function registerBalance(bot: Bot<BotContext>): void {
  bot.command("balance", async (ctx) => {
    if (!(await requirePrivateChat(ctx))) return;

    const tgUserId = ctx.from?.id;
    if (tgUserId === undefined) {
      await ctx.reply("Could not identify you.");
      return;
    }
    const user = await getUserByTelegramId(BigInt(tgUserId));
    if (!user) {
      await ctx.reply("Not onboarded yet — tap /start.");
      return;
    }

    const dusdcMicrosOrNull = await readAccountDusdcMicros(user.account_id);

    const pool = getPool();

    const openListRes = await pool.query<OpenPositionRow>(
      `SELECT is_up, strike_micros, expiry_ms, stake_micros
         FROM positions
        WHERE telegram_user_id = $1
          AND status IN ('open','settling')
        ORDER BY expiry_ms ASC
        LIMIT 10`,
      [tgUserId.toString()],
    );

    const openCountRes = await pool.query<OpenCountRow>(
      `SELECT COUNT(*)::text AS count
         FROM positions
        WHERE telegram_user_id = $1
          AND status IN ('open','settling')`,
      [tgUserId.toString()],
    );
    const openCount = Number.parseInt(openCountRes.rows[0]?.count ?? "0", 10);

    const todayRes = await pool.query<DailyVolumeRow>(
      `SELECT total_stake_micros::text AS total_stake_micros
         FROM daily_volume
        WHERE telegram_user_id = $1
          AND day = (NOW() AT TIME ZONE 'UTC')::date
        LIMIT 1`,
      [tgUserId.toString()],
    );
    const todayMicros = BigInt(
      todayRes.rows[0]?.total_stake_micros ?? "0",
    );
    const todayUsd = microsToUsd(todayMicros);
    const remainingUsd = Math.max(0, DAILY_CAP_DUSDC - todayUsd);

    const lines: string[] = [];
    if (dusdcMicrosOrNull === null) {
      lines.push("Balance: _temporarily unavailable_");
    } else {
      lines.push(
        `Balance: \`${microsToUsd(dusdcMicrosOrNull).toFixed(2)}\` dUSDC`,
      );
    }
    lines.push(`Open positions: \`${openCount}\``);
    lines.push(
      `Daily cap remaining: \`$${remainingUsd.toFixed(0)}\` / \`$${DAILY_CAP_DUSDC}\``,
    );
    lines.push("");
    if (openListRes.rows.length === 0) {
      lines.push("_No open positions._");
    } else {
      lines.push("Open positions:");
      for (const p of openListRes.rows) {
        const sideWord = p.is_up ? "UP" : "DOWN";
        const strikeUsd = Number(BigInt(p.strike_micros)) / 1_000_000_000;
        const stakeUsd = microsToUsd(BigInt(p.stake_micros));
        const expiry = new Date(Number(BigInt(p.expiry_ms))).toISOString();
        lines.push(
          `  • ${sideWord} \`$${strikeUsd.toLocaleString("en-US")}\` · \`${stakeUsd}\` dUSDC · exp \`${expiry}\``,
        );
      }
    }

    await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
  });
}
