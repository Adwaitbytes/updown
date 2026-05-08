/**
 * Scaling helpers for the dual-decimal pipeline.
 *
 * - dUSDC token has 6 decimals (1 dUSDC = 1e6 micros).
 * - Strike prices in DeepBook Predict markets are encoded as USD * 1e9.
 *
 * Functions throw on non-finite or negative inputs to prevent silent rounding bugs.
 */

export const DUSDC_DECIMALS = 6 as const;
export const DUSDC_SCALE = 1_000_000n;

export const STRIKE_DECIMALS = 9 as const;
export const STRIKE_SCALE = 1_000_000_000n;

function assertFiniteNonNegative(n: number, label: string): void {
  if (!Number.isFinite(n)) {
    throw new RangeError(`${label} must be finite, got ${String(n)}`);
  }
  if (n < 0) {
    throw new RangeError(`${label} must be non-negative, got ${n}`);
  }
}

/**
 * Convert a USD amount (e.g. 100, 0.5) to dUSDC micros (1e6).
 * Uses BigInt math to avoid floating-point drift on .5 cents.
 */
export function usdToMicros(usd: number): bigint {
  assertFiniteNonNegative(usd, "usd");
  // Round half-away-from-zero on the 7th decimal.
  const scaled = Math.round(usd * 1_000_000);
  return BigInt(scaled);
}

/** Convert dUSDC micros (1e6) back to USD as Number (lossy for >2^53 micros). */
export function microsToUsd(micros: bigint): number {
  return Number(micros) / 1_000_000;
}

/**
 * Convert a USD strike (e.g. 70000, 70_000.5) to the on-chain strike scale (USD * 1e9).
 */
export function strikeToScale(usd: number): bigint {
  assertFiniteNonNegative(usd, "strike usd");
  // Build the bigint via two-step multiply to keep precision on fractional cents.
  const intPart = BigInt(Math.trunc(usd));
  const fracPart = usd - Math.trunc(usd);
  const fracScaled = BigInt(Math.round(fracPart * 1_000_000_000));
  return intPart * STRIKE_SCALE + fracScaled;
}

/** Inverse of strikeToScale; useful for display. */
export function scaleToStrike(scaled: bigint): number {
  return Number(scaled) / 1_000_000_000;
}
