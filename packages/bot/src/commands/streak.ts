import type { Bot } from "grammy";
import type { BotContext } from "../types.js";
import { getStreak } from "../db.js";

const TIER_NAMES: Record<number, string> = {
  0: "Bronze",
  1: "Silver",
  2: "Gold",
};

function tierLabel(tier: number): string {
  return TIER_NAMES[tier] ?? "none";
}

export function registerStreak(bot: Bot<BotContext>): void {
  bot.command("streak", async (ctx) => {
    const tgUserId = ctx.from?.id;
    if (tgUserId === undefined) {
      await ctx.reply("Could not identify you.");
      return;
    }
    const row = await getStreak(BigInt(tgUserId));

    const current = row?.current_streak ?? 0;
    const best = row?.best_streak ?? 0;
    const tier = row?.last_tier_minted ?? -1;
    const lastOutcome = row?.last_outcome ?? null;
    const nftId = row?.nft_obj_id ?? null;

    const lines: string[] = [];
    lines.push(`Current streak: \`${current}\``);
    lines.push(`Best streak:    \`${best}\``);
    lines.push(`Tier minted:    \`${tierLabel(tier)}\``);
    if (lastOutcome) {
      lines.push(`Last outcome:   \`${lastOutcome}\``);
    }
    if (nftId) {
      lines.push("");
      lines.push(
        `NFT: https://suiscan.xyz/testnet/object/${nftId}`,
      );
    }
    await ctx.reply(lines.join("\n"), { parse_mode: "Markdown" });
  });
}
