import type { Bot } from "grammy";
import type { BotContext } from "../types.js";
import { handleBet } from "./_bet.js";

export function registerUp(bot: Bot<BotContext>): void {
  bot.command("up", async (ctx) => {
    await handleBet(ctx, "up");
  });
}
