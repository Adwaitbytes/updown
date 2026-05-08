import type { Bot } from "grammy";
import type { BotContext } from "../types.js";
import { handleBet } from "./_bet.js";

export function registerDown(bot: Bot<BotContext>): void {
  bot.command("down", async (ctx) => {
    await handleBet(ctx, "down");
  });
}
