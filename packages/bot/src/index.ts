import { getEnv } from "./env.js";
import { logger } from "./log.js";
import { buildApp } from "./app.js";

async function main(): Promise<void> {
  const env = getEnv();
  const app = await buildApp();
  const port = env.PORT;
  app.listen(port, () => {
    logger.info({ port }, "bot webhook server listening");
  });
}

main().catch((err: unknown) => {
  logger.error({ err }, "fatal during boot");
  process.exitCode = 1;
});
