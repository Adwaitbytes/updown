import pino from "pino";
import { getEnv } from "./env.js";

let _logger: pino.Logger | undefined;

function build(): pino.Logger {
  const level = (() => {
    try {
      return getEnv().LOG_LEVEL;
    } catch {
      return "info" as const;
    }
  })();
  return pino({ level });
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
