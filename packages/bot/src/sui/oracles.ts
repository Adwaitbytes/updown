import { getEnv } from "../env.js";

export type Tier = "15m" | "1h" | "1d" | "1w";

export interface Oracle {
  oracle_id: string;
  /** ms-since-epoch — DeepBook Predict indexer exposes this as `expiry`. */
  expiry_ms: number;
  underlying_asset: string;
}

/**
 * Bucket an active oracle into one of the four supported BTC tiers based on
 * how far away its expiry is from `now`. Bands are intentionally generous to
 * absorb rotation timing — a "next" 15m oracle can be 14m48s away or 27m away
 * depending on where the rotation cycle is.
 */
export function inferTier(now: number, expiry_ms: number): Tier | null {
  const dt = expiry_ms - now;
  if (dt < 0) return null;
  const bands: Array<[Tier, number, number]> = [
    ["15m", 0,                       30 * 60 * 1000],         // 0–30m
    ["1h",  30 * 60 * 1000,           2 * 60 * 60 * 1000],     // 30m–2h
    ["1d",   2 * 60 * 60 * 1000,     36 * 60 * 60 * 1000],     // 2h–36h
    ["1w",  36 * 60 * 60 * 1000,     14 * 24 * 60 * 60 * 1000], // 36h–14d
  ];
  for (const [t, lo, hi] of bands) {
    if (dt >= lo && dt < hi) return t;
  }
  return null;
}

/** Raw shape from the indexer; we normalise into `Oracle` below. */
interface RawOracle {
  oracle_id: string;
  underlying_asset: string;
  expiry?: number;
  expiry_ms?: number;
}

let cache: { ts: number; oracles: Oracle[] } | null = null;
const CACHE_TTL_MS = 30_000; // refresh every 30s; oracles rotate slowly

export async function fetchActiveOracles(): Promise<Oracle[]> {
  const now = Date.now();
  if (cache && now - cache.ts < CACHE_TTL_MS) return cache.oracles;
  const env = getEnv();
  const url = `${env.PREDICT_INDEXER_URL.replace(/\/+$/u, "")}/oracles?status=active`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`oracle indexer ${res.status}`);
  const raw = (await res.json()) as RawOracle[];
  const oracles: Oracle[] = raw
    .map((o) => {
      const expiry = typeof o.expiry === "number" ? o.expiry : o.expiry_ms;
      if (typeof expiry !== "number") return null;
      return {
        oracle_id: o.oracle_id,
        expiry_ms: expiry,
        underlying_asset: o.underlying_asset,
      };
    })
    .filter((o): o is Oracle => o !== null);
  cache = { ts: now, oracles };
  return oracles;
}

/**
 * Pick the next-rolling active BTC oracle for a given tier — the one with the
 * smallest `expiry_ms` strictly in the future that still buckets into `tier`.
 * Throws if none is currently active (operational alert is preferable to a
 * silent on-chain abort).
 */
export async function resolveBtcOracle(
  tier: Tier,
  now: number = Date.now(),
): Promise<Oracle> {
  const oracles = await fetchActiveOracles();
  const candidates = oracles
    .filter((o) => o.underlying_asset === "BTC" && inferTier(now, o.expiry_ms) === tier)
    .sort((a, b) => a.expiry_ms - b.expiry_ms);
  if (candidates.length === 0) throw new Error(`no active BTC oracle for tier ${tier}`);
  return candidates[0]!;
}
