/**
 * `/up 70k 15m 100` → typed BetIntent.
 *
 * Strict but forgiving:
 *  - strike: integer/decimal, optional `k` (×1_000) or `m` (only as window — disambiguated by position).
 *  - window: 15m | 30m | 1h | 4h | 1d | 1w only.
 *  - amount: positive integer dUSDC.
 */

export type WindowToken = "15m" | "30m" | "1h" | "4h" | "1d" | "1w";

export interface BetIntent {
  side: "up" | "down";
  strikeUsd: number;
  windowMs: number;
  windowLabel: WindowToken;
  amountDusdc: number;
}

const WINDOW_MS: Record<WindowToken, number> = {
  "15m": 15 * 60_000,
  "30m": 30 * 60_000,
  "1h": 60 * 60_000,
  "4h": 4 * 60 * 60_000,
  "1d": 24 * 60 * 60_000,
  "1w": 7 * 24 * 60 * 60_000,
};

const WINDOW_TOKENS = Object.keys(WINDOW_MS) as WindowToken[];

export class ParseError extends Error {
  public readonly userMessage: string;
  constructor(userMessage: string) {
    super(userMessage);
    this.name = "ParseError";
    this.userMessage = userMessage;
  }
}

function parseStrike(raw: string): number {
  const m = raw.match(/^(\d+(?:\.\d+)?)([kK])?$/u);
  if (!m) {
    throw new ParseError(
      `Strike "${raw}" looks off. Try "70k", "70000", or "70.5k".`,
    );
  }
  const numStr = m[1];
  const suffix = m[2];
  if (numStr === undefined) {
    throw new ParseError(`Strike "${raw}" is missing a number.`);
  }
  const base = Number.parseFloat(numStr);
  if (!Number.isFinite(base) || base <= 0) {
    throw new ParseError(`Strike must be positive, got "${raw}".`);
  }
  return suffix ? base * 1_000 : base;
}

function parseWindow(raw: string): WindowToken {
  const lower = raw.toLowerCase();
  if (!WINDOW_TOKENS.includes(lower as WindowToken)) {
    throw new ParseError(
      `Window "${raw}" not supported. Use one of: ${WINDOW_TOKENS.join(", ")}.`,
    );
  }
  return lower as WindowToken;
}

function parseAmount(raw: string): number {
  if (!/^\d+$/u.test(raw)) {
    throw new ParseError(
      `Amount "${raw}" must be a positive integer of dUSDC (no decimals).`,
    );
  }
  const n = Number.parseInt(raw, 10);
  if (n <= 0) {
    throw new ParseError(`Amount must be > 0.`);
  }
  return n;
}

/**
 * Parse the *args* portion (everything after the command word).
 * Accepts: "70k 15m 100", "  70K  1h  50  ".
 */
export function parseBetIntent(side: "up" | "down", argText: string): BetIntent {
  const tokens = argText.trim().split(/\s+/u).filter((t) => t.length > 0);
  if (tokens.length !== 3) {
    throw new ParseError(
      `Usage: /${side} <strike> <window> <amount>\nExample: /${side} 70k 15m 100`,
    );
  }
  const [strikeRaw, windowRaw, amountRaw] = tokens as [string, string, string];
  const strikeUsd = parseStrike(strikeRaw);
  const windowLabel = parseWindow(windowRaw);
  const amountDusdc = parseAmount(amountRaw);
  return {
    side,
    strikeUsd,
    windowLabel,
    windowMs: WINDOW_MS[windowLabel],
    amountDusdc,
  };
}
