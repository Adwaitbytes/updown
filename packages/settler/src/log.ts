import pino from "pino";

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

export const log = pino({
  level: process.env.LOG_LEVEL ?? "info",
  redact: { paths: redactPaths, censor: "[REDACTED]" },
  base: { service: "settler" },
});

export function captureException(
  err: unknown,
  ctx?: Record<string, unknown>,
): void {
  // Future: Sentry.captureException(err, { extra: ctx });
  log.error({ err, ...ctx }, "exception");
}
