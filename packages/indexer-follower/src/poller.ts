import { SuiClient } from "@mysten/sui/client";

import {
  CURSOR_ACCOUNT,
  CURSOR_PREDICT,
  CURSOR_STREAK,
  readCursor,
  writeCursor,
  type CursorName,
  type StoredCursor,
} from "./db.js";
import { loadEnv } from "./env.js";
import { handleEvent, type SuiEvent } from "./handlers.js";
import { log } from "./log.js";

interface ModulePollSource {
  cursorName: CursorName;
  module: { package: string; module: string };
}

function buildSources(env: ReturnType<typeof loadEnv>): ModulePollSource[] {
  return [
    {
      cursorName: CURSOR_PREDICT,
      module: { package: env.PREDICT_PACKAGE_ID, module: "predict" },
    },
    {
      cursorName: CURSOR_ACCOUNT,
      module: { package: env.UPDOWN_PACKAGE_ID, module: "account" },
    },
    {
      cursorName: CURSOR_STREAK,
      module: { package: env.UPDOWN_PACKAGE_ID, module: "streak" },
    },
  ];
}

/**
 * Polling fallback in case `suix_subscribeEvent` is unavailable. Iterates
 * the predict + updown modules independently, since `queryEvents` only
 * accepts a single filter at a time. Each module advances its own cursor.
 */
export async function runPollLoop(): Promise<void> {
  const env = loadEnv();
  const client = new SuiClient({ url: env.SUI_RPC_URL });
  const sources = buildSources(env);

  // Load each cursor up front so the heartbeat can report current positions.
  const cursors: Record<CursorName, StoredCursor | null> = {
    [CURSOR_PREDICT]: await readCursor(CURSOR_PREDICT),
    [CURSOR_ACCOUNT]: await readCursor(CURSOR_ACCOUNT),
    [CURSOR_STREAK]: await readCursor(CURSOR_STREAK),
  };

  log.info({ cursors }, "polling started");

  // Heartbeat (audit parity with WS path).
  const heartbeat = setInterval(() => {
    log.info({ cursors }, "indexer heartbeat");
  }, 60_000);
  heartbeat.unref?.();

  let stopped = false;
  const stop = (): void => {
    stopped = true;
    clearInterval(heartbeat);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);

  while (!stopped) {
    try {
      // Run the three module pollers in parallel; each advances its own cursor.
      const results = await Promise.all(
        sources.map((src) => pollModule(client, src, cursors[src.cursorName])),
      );
      sources.forEach((src, i) => {
        cursors[src.cursorName] = results[i] ?? null;
      });
    } catch (err) {
      log.error({ err: errMsg(err) }, "poll iter failed");
    }
    await sleep(env.POLL_INTERVAL_MS);
  }
}

interface QueryEventsClient {
  queryEvents: (args: {
    query: { MoveModule: { package: string; module: string } };
    cursor: StoredCursor | null;
    limit: number;
    order: "ascending" | "descending";
  }) => Promise<{
    data: ReadonlyArray<SuiEvent>;
    nextCursor: StoredCursor | null;
    hasNextPage: boolean;
  }>;
}

async function pollModule(
  client: SuiClient,
  src: ModulePollSource,
  startCursor: StoredCursor | null,
): Promise<StoredCursor | null> {
  const c = client as unknown as QueryEventsClient;
  let pageCursor = startCursor;
  let latest = startCursor;
  let hasNext = true;
  while (hasNext) {
    const page = await c.queryEvents({
      query: { MoveModule: src.module },
      cursor: pageCursor,
      limit: 50,
      order: "ascending",
    });
    for (const ev of page.data) {
      try {
        await handleEvent(ev);
      } catch (err) {
        log.error(
          {
            err: errMsg(err),
            type: ev.type,
            source: src.cursorName,
          },
          "handler failed; skipping",
        );
      }
    }
    if (page.data.length === 0) break;
    if (page.nextCursor) {
      latest = page.nextCursor;
      // Persist progress per-module after every successful page so a crash
      // doesn't replay the whole batch.
      await writeCursor(src.cursorName, page.nextCursor);
    }
    pageCursor = page.nextCursor;
    hasNext = page.hasNextPage;
  }
  return latest;
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

if (process.argv[1] && process.argv[1].endsWith("poller.ts")) {
  runPollLoop().catch((err) => {
    log.error({ err: errMsg(err) }, "fatal");
    process.exit(1);
  });
}
