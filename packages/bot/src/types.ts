import type { Context, SessionFlavor } from "grammy";
import type { ConversationFlavor } from "@grammyjs/conversations";

export interface SessionData {
  // Reserved for future per-chat session state.
  lastCommandAt?: number;
}

export type BotContext = ConversationFlavor<Context & SessionFlavor<SessionData>>;
