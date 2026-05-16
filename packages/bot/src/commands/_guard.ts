import type { BotContext } from "../types.js";

/**
 * Refuse non-private chats. Per-user commands surface wallet info, balance,
 * and streak data — leaking those to a group is a privacy hazard. The bot
 * pushes the user to DM instead of silently no-op'ing so the failure mode
 * is obvious.
 *
 * Returns true if the chat is private (caller should proceed); false if the
 * caller already replied and should bail.
 */
export async function requirePrivateChat(ctx: BotContext): Promise<boolean> {
  if (ctx.chat?.type !== "private") {
    await ctx.reply(
      "This one's private — DM me directly so your wallet info doesn't leak to the group.",
    );
    return false;
  }
  return true;
}
