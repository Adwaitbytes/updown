import { randomBytes } from "node:crypto";
import type { Bot } from "grammy";
import { InlineKeyboard } from "grammy";
import type { BotContext } from "../types.js";
import { getPool } from "../db.js";
import { getEnv } from "../env.js";

const SESSION_TTL_MS = 10 * 60 * 1000;

export function registerStart(bot: Bot<BotContext>): void {
  bot.command("start", async (ctx) => {
    const tgUserId = ctx.from?.id;
    if (tgUserId === undefined) {
      await ctx.reply("Could not identify you.");
      return;
    }

    const env = getEnv();
    const token = randomBytes(24).toString("base64url");
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS);

    const pool = getPool();
    await pool.query(
      `INSERT INTO mini_app_sessions (token, telegram_user_id, expires_at)
       VALUES ($1, $2, $3)`,
      [token, tgUserId.toString(), expiresAt],
    );

    const url = `${env.WEB_URL}/onboard?session=${encodeURIComponent(token)}`;
    const kb = new InlineKeyboard().webApp("Open Up/Down", url);
    await ctx.reply(
      "Welcome to Up/Down — sub-hour BTC binary options on Sui.\nTap below to set up your wallet.",
      { reply_markup: kb },
    );
  });
}
