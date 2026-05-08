// Singleton `pg.Pool` shared across requests in the same Node.js process.
// Using a module-level cache avoids re-establishing TCP/TLS for every API
// invocation — connection storms on a hot path were flagged in the audit.
//
// `pg` is dynamically imported so this module remains tree-shakeable from any
// client bundle that may transitively `import "@/lib/..."`. The Pool is only
// constructed inside `getPool()`, which is server-only by virtue of importing
// from a route that declares `runtime = "nodejs"`.

import type { Pool as PgPool } from "pg";

// In dev, Next.js Hot Module Replacement (Fast Refresh) re-evaluates server
// modules, which would otherwise leak Pools. Cache on `globalThis` instead.
const GLOBAL_KEY = Symbol.for("@updown/miniapp/pgPool");

interface PoolHolder {
  pool: PgPool | null;
  initPromise: Promise<PgPool> | null;
}

function getHolder(): PoolHolder {
  const g = globalThis as unknown as Record<symbol, PoolHolder | undefined>;
  let holder = g[GLOBAL_KEY];
  if (!holder) {
    holder = { pool: null, initPromise: null };
    g[GLOBAL_KEY] = holder;
  }
  return holder;
}

export async function getPool(connectionString: string): Promise<PgPool> {
  const holder = getHolder();
  if (holder.pool) return holder.pool;
  if (holder.initPromise) return holder.initPromise;

  holder.initPromise = (async (): Promise<PgPool> => {
    const pgMod = await import("pg");
    const Pool = pgMod.default.Pool;
    const pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 5_000,
    });
    // Detach unhandled error handler — without it, an idle-client error would
    // crash the Node process on serverless environments.
    pool.on("error", (err) => {
      // eslint-disable-next-line no-console
      console.error("[db] idle client error", err);
    });
    holder.pool = pool;
    return pool;
  })();

  return holder.initPromise;
}
