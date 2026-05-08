import { Bot, session } from "grammy";
import { conversations } from "@grammyjs/conversations";
import { apiThrottler } from "@grammyjs/transformer-throttler";
import { getEnv } from "./env.js";
import { logger } from "./log.js";
import { runMigrations } from "./db.js";
import type { BotContext, SessionData } from "./types.js";
import { buildServer } from "./server.js";
import { registerStart } from "./commands/start.js";
import { registerUp } from "./commands/up.js";
import { registerDown } from "./commands/down.js";
import { registerBalance } from "./commands/balance.js";
import { registerStreak } from "./commands/streak.js";
import { registerLeader } from "./commands/leader.js";
import { registerCopy } from "./commands/copy.js";

async function main(): Promise<void> {
  const env = getEnv();
  await runMigrations();

  const bot = new Bot<BotContext>(env.BOT_TOKEN);

  // Throttle to Telegram's documented 30 msg/s global ceiling.
  bot.api.config.use(
    apiThrottler({
      global: { reservoir: 30, reservoirRefreshAmount: 30, reservoirRefreshInterval: 1000 },
      group: { maxConcurrent: 1, minTime: 1000, reservoir: 20, reservoirRefreshAmount: 20, reservoirRefreshInterval: 60_000 },
      out: { maxConcurrent: 1, minTime: 1000 },
    }),
  );

  bot.use(
    session<SessionData, BotContext>({
      initial: (): SessionData => ({}),
    }),
  );
  bot.use(conversations<BotContext, BotContext>());

  registerStart(bot);
  registerUp(bot);
  registerDown(bot);
  registerBalance(bot);
  registerStreak(bot);
  registerLeader(bot);
  registerCopy(bot);

  bot.catch((err) => {
    logger.error({ err: err.error }, "bot handler error");
  });

  const app = buildServer(bot);
  const port = env.PORT;
  app.listen(port, () => {
    logger.info({ port }, "bot webhook server listening");
  });
}

main().catch((err: unknown) => {
  logger.error({ err }, "fatal during boot");
  process.exitCode = 1;
});
