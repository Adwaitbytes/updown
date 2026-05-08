import { createHash } from "node:crypto";
import type { BetIntent } from "./parsing.js";
import { strikeToScale } from "./sui/scale.js";

/**
 * Compute the on-chain market identifier for a BTC up/down bet.
 *
 * Layout (all little-endian):
 *   asset_id (string utf-8) || expiry_ms (u64) || strike_scaled (u128)
 *
 * The hash forms the `market_key` argument used by `predict::mint`.
 * For the locked-message digest (so two bets in the same minute share a market),
 * we floor expiry to the nearest minute.
 */

export interface MarketKey {
  /** 32-byte market key identifier. */
  bytes: Uint8Array;
  /** Hex (no 0x). */
  hash: string;
  /** Effective expiry timestamp (ms). */
  expiryMs: bigint;
  /** Strike scaled to 1e9. */
  strikeScaled: bigint;
}

const ASSET_ID = "BTC-USD";

function bigintToLeBytes(value: bigint, byteLen: number): Uint8Array {
  const out = new Uint8Array(byteLen);
  let v = value;
  for (let i = 0; i < byteLen; i++) {
    out[i] = Number(v & 0xffn);
    v >>= 8n;
  }
  return out;
}

function concat(parts: readonly Uint8Array[]): Uint8Array {
  const total = parts.reduce((acc, p) => acc + p.length, 0);
  const out = new Uint8Array(total);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

export function deriveMarketKey(intent: BetIntent, nowMs: number = Date.now()): MarketKey {
  // Floor expiry to the minute so concurrent bettors share a market.
  const expiryRaw = nowMs + intent.windowMs;
  const expiryFloor = Math.floor(expiryRaw / 60_000) * 60_000;
  const expiryMs = BigInt(expiryFloor);
  const strikeScaled = strikeToScale(intent.strikeUsd);

  const payload = concat([
    new TextEncoder().encode(ASSET_ID),
    bigintToLeBytes(expiryMs, 8),
    bigintToLeBytes(strikeScaled, 16),
  ]);
  const digest = createHash("sha256").update(payload).digest();
  const bytes = new Uint8Array(digest.buffer, digest.byteOffset, digest.byteLength);
  return {
    bytes,
    hash: digest.toString("hex"),
    expiryMs,
    strikeScaled,
  };
}
