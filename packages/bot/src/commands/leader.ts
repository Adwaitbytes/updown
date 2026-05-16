import type { Bot } from "grammy";
import type { BotContext } from "../types.js";
import { getPool } from "../db.js";
import { requirePrivateChat } from "./_guard.js";

interface LeaderRow {
  telegram_user_id: string;
  pnl: string;
}

function startOfWeekMs(now: number): number {
  const d = new Date(now);
  d.setUTCHours(0, 0, 0, 0);
  // ISO week starts Monday.
  const day = d.getUTCDay(); // 0 = Sun
  const offset = (day + 6) % 7;
  d.setUTCDate(d.getUTCDate() - offset);
  return d.getTime();
}

export function registerLeader(bot: Bot<BotContext>): void {
  bot.command("leader", async (ctx) => {
    // Group leaderboards aren't scoped yet (positions table has no chat_id
    // column). Until that lands, refuse non-private chats so we don't leak
    // a global PnL list into random groups.
    if (!(await requirePrivateChat(ctx))) return;
    const _chatId = ctx.chat?.id;
    void _chatId;

    const weekStart = startOfWeekMs(Date.now());
    const pool = getPool();
    // Score: net P&L (payout - stake) for settled positions in the week.
    const res = await pool.query<LeaderRow>(
      `SELECT telegram_user_id::text AS telegram_user_id,
              COALESCE(SUM(payout_micros) - SUM(stake_micros), 0)::text AS pnl
         FROM positions
        WHERE status = 'settled'
          AND settled_at IS NOT NULL
          AND settled_at >= to_timestamp($1 / 1000.0)
        GROUP BY telegram_user_id
        ORDER BY pnl DESC
        LIMIT 10`,
      [weekStart],
    );

    if (res.rows.length === 0) {
      await ctx.reply("No settled bets this week yet.");
      return;
    }

    const lines: string[] = ["Weekly leaderboard:"];
    res.rows.forEach((r, i) => {
      const pnlUsd = (Number(BigInt(r.pnl)) / 1_000_000).toFixed(2);
      lines.push(`  ${i + 1}. user:${r.telegram_user_id} · ${pnlUsd} dUSDC`);
    });
    await ctx.reply(lines.join("\n"));
  });
}
