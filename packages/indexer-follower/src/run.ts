import { SuiClient } from "@mysten/sui/client";
import { runMigrations } from "./migrate.js";
import pLimit from "p-limit";

import {
  CURSOR_ACCOUNT,
  CURSOR_PREDICT,
  CURSOR_STREAK,
  getPool,
  readCursor,
  writeCursor,
  type CursorName,
  type StoredCursor,
} from "./db.js";
import { loadEnv } from "./env.js";
import { handleEvent, type SuiEvent } from "./handlers.js";
import { log } from "./log.js";
import { runPollLoop } from "./poller.js";

interface MoveModuleFilter {
  MoveModule: { package: string; module: string };
}

/**
 * Per-module event source. Each maintains an independent cursor so that
 * advancing one module's cursor never causes another module's events to be
 * skipped.
 */
interface ModuleSource {
  cursorName: CursorName;
  filter: MoveModuleFilter;
}

function buildSources(env: ReturnType<typeof loadEnv>): ModuleSource[] {
  return [
    {
      cursorName: CURSOR_PREDICT,
      filter: {
        MoveModule: { package: env.PREDICT_PACKAGE_ID, module: "predict" },
      },
    },
    {
      cursorName: CURSOR_ACCOUNT,
      filter: {
        MoveModule: { package: env.UPDOWN_PACKAGE_ID, module: "account" },
      },
    },
    {
      cursorName: CURSOR_STREAK,
      filter: {
        MoveModule: { package: env.UPDOWN_PACKAGE_ID, module: "streak" },
      },
    },
  ];
}

/**
 * Long-running entrypoint. Tries WebSocket subscription first; on failure
 * (e.g. fullnode without WS), falls back to polling.
 */
export async function main(): Promise<void> {
  const env = loadEnv();

  // Run shared migrations once at startup. Idempotent.
  log.info("running shared migrations");
  await runMigrations(getPool());
  log.info("migrations complete");

  const client = new SuiClient({ url: env.SUI_RPC_URL });
  const sources = buildSources(env);

  // Bound concurrency for the WS path so a slow Postgres can't let an
  // unbounded queue of in-flight handlers build up in memory.
  const limit = pLimit(8);

  // Heartbeat (WS path).
  const heartbeat = setInterval(() => {
    log.info({ pendingHandlers: limit.activeCount + limit.pendingCount }, "heartbeat");
  }, 60_000);
  heartbeat.unref?.();

  const unsubscribers: Array<() => Promise<unknown>> = [];
  try {
    log.info({ sources: sources.map((s) => s.cursorName) }, "subscribing via WebSocket");
    for (const src of sources) {
      const off = await trySubscribe(client, src, limit);
      unsubscribers.push(off);
    }
    log.info("subscribed");
    // Keep the process alive while the subscription is active.
    await new Promise<void>((resolve) => {
      const onShutdown = (): void => {
        log.info("shutting down");
        clearInterval(heartbeat);
        for (const off of unsubscribers) {
          void off().catch(() => undefined);
        }
        resolve();
      };
      process.once("SIGINT", onShutdown);
      process.once("SIGTERM", onShutdown);
    });
  } catch (err) {
    log.warn({ err: errMsg(err) }, "subscribe failed; falling back to polling");
    clearInterval(heartbeat);
    await runPollLoop();
  }
}

interface SubscribeCapableClient {
  subscribeEvent?: (args: {
    filter: MoveModuleFilter;
    onMessage: (e: SuiEvent) => void;
  }) => Promise<() => Promise<unknown>>;
}

async function trySubscribe(
  client: SuiClient,
  src: ModuleSource,
  limit: ReturnType<typeof pLimit>,
): Promise<() => Promise<unknown>> {
  const c = client as unknown as SubscribeCapableClient;
  if (typeof c.subscribeEvent !== "function") {
    throw new Error("SuiClient.subscribeEvent unavailable in this SDK build");
  }
  return c.subscribeEvent({
    filter: src.filter,
    onMessage: (e) => {
      void limit(() => handleAndAdvance(src.cursorName, e)).catch((err) =>
        log.error(
          { err: errMsg(err), source: src.cursorName },
          "handler failed",
        ),
      );
    },
  });
}

async function handleAndAdvance(
  cursorName: CursorName,
  ev: SuiEvent,
): Promise<void> {
  await handleEvent(ev);
  await writeCursor(cursorName, {
    txDigest: ev.id.txDigest,
    eventSeq: ev.id.eventSeq,
  });
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

/**
 * Allow `START_CURSOR` to seed all three module cursors before first run.
 * Format: "txDigest:eventSeq". Only applied to cursors that don't yet exist
 * in the table; existing cursors are never overwritten by START_CURSOR.
 */
async function maybeSeedCursor(): Promise<void> {
  const env = loadEnv();
  if (!env.START_CURSOR) return;
  const [txDigest, eventSeq] = env.START_CURSOR.split(":");
  if (!txDigest || !eventSeq) {
    log.warn(
      { START_CURSOR: env.START_CURSOR },
      "ignoring malformed START_CURSOR (expected txDigest:eventSeq)",
    );
    return;
  }
  const seed: StoredCursor = { txDigest, eventSeq };
  for (const name of [CURSOR_PREDICT, CURSOR_ACCOUNT, CURSOR_STREAK] as const) {
    const existing = await readCursor(name);
    if (!existing) {
      await writeCursor(name, seed);
      log.info({ name, seed }, "seeded cursor from START_CURSOR");
    }
  }
}

if (process.argv[1] && process.argv[1].endsWith("run.ts")) {
  // main() runs migrations first; seed must run after migrations since
  // it reads/writes the cursor table.
  (async () => {
    await runMigrations(getPool());
    await maybeSeedCursor();
    await main();
  })().catch((err) => {
    log.error({ err: errMsg(err) }, "fatal");
    process.exit(1);
  });
}

// Note: main() also calls runMigrations() — pg pool migrations are idempotent
// so a double-call here (entrypoint seed + main) is safe and lets `main()` be
// invoked from another driver without requiring callers to migrate first.
