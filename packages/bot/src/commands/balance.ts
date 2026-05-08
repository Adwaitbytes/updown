import type { Bot } from "grammy";
import type { BotContext } from "../types.js";
import { getPool, getUserByTelegramId } from "../db.js";
import { getSuiClient } from "../sui/client.js";
import { microsToUsd } from "../sui/scale.js";
import { getEnv } from "../env.js";
import { logger } from "../log.js";

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

export function registerBalance(bot: Bot<BotContext>): void {
  bot.command("balance", async (ctx) => {
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

    const env = getEnv();
    const sui = getSuiClient();
    let dusdcMicros = 0n;
    try {
      const balance = await sui.getBalance({
        owner: user.sui_address,
        coinType: env.DUSDC_TYPE,
      });
      dusdcMicros = BigInt(balance.totalBalance);
    } catch (err) {
      logger.warn({ err }, "getBalance failed; defaulting to zero");
    }

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
    lines.push(
      `Balance: \`${microsToUsd(dusdcMicros).toFixed(2)}\` dUSDC` +
        " _(todo: query on-chain)_",
    );
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
