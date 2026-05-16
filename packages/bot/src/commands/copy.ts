import type { Bot } from "grammy";
import type { BotContext } from "../types.js";
import { getPool } from "../db.js";
import { usdToMicros } from "../sui/scale.js";
import { requirePrivateChat } from "./_guard.js";

const FOLLOW_TTL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CAP_DUSDC = 100;

export function registerCopy(bot: Bot<BotContext>): void {
  bot.command("copy", async (ctx) => {
    if (!(await requirePrivateChat(ctx))) return;
    const tgUserId = ctx.from?.id;
    if (tgUserId === undefined) {
      await ctx.reply("Could not identify you.");
      return;
    }

    const argText = (ctx.match ?? "").toString().trim();
    if (argText.length === 0) {
      await ctx.reply("Usage: /copy <leader_id> [cap_dusdc]");
      return;
    }
    const parts = argText.split(/\s+/u);
    const leaderRaw = parts[0];
    const capRaw = parts[1];
    if (!leaderRaw) {
      await ctx.reply("Missing leader id.");
      return;
    }
    if (!/^\d+$/u.test(leaderRaw)) {
      await ctx.reply("Leader id must be a numeric Telegram user id.");
      return;
    }
    const leaderId = BigInt(leaderRaw);

    let capUsd = DEFAULT_CAP_DUSDC;
    if (capRaw !== undefined) {
      if (!/^\d+$/u.test(capRaw)) {
        await ctx.reply("Cap must be a positive integer dUSDC.");
        return;
      }
      capUsd = Number.parseInt(capRaw, 10);
    }

    const expiresAt = new Date(Date.now() + FOLLOW_TTL_MS);
    const pool = getPool();
    await pool.query(
      `INSERT INTO copy_rules (follower_user_id, leader_user_id, stake_cap_micros, expires_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (follower_user_id, leader_user_id)
       DO UPDATE SET stake_cap_micros = EXCLUDED.stake_cap_micros,
                     expires_at = EXCLUDED.expires_at`,
      [
        tgUserId.toString(),
        leaderId.toString(),
        usdToMicros(capUsd).toString(),
        expiresAt,
      ],
    );

    await ctx.reply(
      `Following user:${leaderId} for 24h with cap ${capUsd} dUSDC per bet.`,
    );
  });
}
