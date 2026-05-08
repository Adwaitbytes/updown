import pino from "pino";
import { getEnv } from "./env.js";

const redactPaths = [
  // Auth
  "BOT_TOKEN",
  "*.BOT_TOKEN",
  "headers.authorization",
  "*.headers.authorization",
  "headers['x-telegram-bot-api-secret-token']",
  "*.headers['x-telegram-bot-api-secret-token']",
  // Crypto / keys
  "BOT_SIGNER_PRIVKEY",
  "*.BOT_SIGNER_PRIVKEY",
  "MASTER_DELEGATION_SECRET",
  "*.MASTER_DELEGATION_SECRET",
  "SETTLER_SIGNER_PRIVKEY",
  "*.SETTLER_SIGNER_PRIVKEY",
  "ENOKI_API_KEY",
  "*.ENOKI_API_KEY",
  "WEBHOOK_SECRET",
  "*.WEBHOOK_SECRET",
  "CRON_SECRET",
  "*.CRON_SECRET",
  "delegated_privkey",
  "*.delegated_privkey",
  "delegated_privkey_encrypted",
  "*.delegated_privkey_encrypted",
  "private_key",
  "*.private_key",
  "privateKey",
  "*.privateKey",
  // Database / external
  "DATABASE_URL",
  "*.DATABASE_URL",
  "connectionString",
  "*.connectionString",
  // Generic
  "password",
  "*.password",
  "secret",
  "*.secret",
  "token",
  "*.token",
];

let _logger: pino.Logger | undefined;

function build(): pino.Logger {
  const level = (() => {
    try {
      return getEnv().LOG_LEVEL;
    } catch {
      return "info" as const;
    }
  })();
  return pino({
    level,
    redact: { paths: redactPaths, censor: "[REDACTED]" },
    base: { service: "bot" },
  });
}

export const logger: pino.Logger = new Proxy(
  {},
  {
    get(_target, prop, receiver) {
      if (!_logger) _logger = build();
      const value = Reflect.get(_logger, prop, receiver) as unknown;
      return typeof value === "function"
        ? (value as (...args: unknown[]) => unknown).bind(_logger)
        : value;
    },
  },
) as pino.Logger;

export function captureException(
  err: unknown,
  ctx?: Record<string, unknown>,
): void {
  // Future: Sentry.captureException(err, { extra: ctx });
  logger.error({ err, ...ctx }, "exception");
}
