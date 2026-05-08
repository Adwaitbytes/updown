// Vercel Cron handler. Schedule via vercel.json:
//   { "crons": [{ "path": "/api/cron", "schedule": "*/1 * * * *" }] }
//
// Cadence note:
//   - Vercel Hobby tier minimum cron granularity is 1 day, so the
//     `*/1 * * * *` schedule will NOT actually run every minute on Hobby —
//     deploy on Pro (or Enterprise) for 1-minute cadence.
//   - For sub-minute settlement latency, run the settler as a long-running
//     worker (Fly, Railway, Render, etc.) invoking `runOnce()` on a tighter
//     interval. The handler itself is safe to call concurrently — the
//     SKIP LOCKED guard in runOnce() ensures disjoint work per tick.

import { runOnce } from "../src/run.js";
import { runStreakMintBatch } from "../src/streak-nft.js";
import { log } from "../src/log.js";

export const config = {
  runtime: "nodejs",
  maxDuration: 60,
};

interface VercelRequest {
  headers: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (body: unknown) => void;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse,
): Promise<void> {
  // Optional shared secret check (set CRON_SECRET in Vercel + use ?secret=).
  const expected = process.env.CRON_SECRET;
  const auth = req.headers.authorization;
  if (expected && auth !== `Bearer ${expected}`) {
    res.status(401).json({ error: "unauthorized" });
    return;
  }

  try {
    const settle = await runOnce();
    const mint = await runStreakMintBatch();
    log.info({ settle, mint }, "cron tick complete");
    res.status(200).json({ ok: true, settle, mint });
  } catch (err) {
    log.error({ err }, "cron tick failed");
    res.status(500).json({
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
