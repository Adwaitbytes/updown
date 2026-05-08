import pg from "pg";

import { loadEnv } from "./env.js";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;
  const env = loadEnv();
  pool = new pg.Pool({ connectionString: env.DATABASE_URL });
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: ReadonlyArray<unknown> = [],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[]);
}

export async function withTx<T>(
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("BEGIN");
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

// === Row types ===

export interface OpenPositionRow {
  id: string;
  telegram_user_id: string;
  sui_address: string | null;
  account_id: string | null;
  betting_account_id: string | null;
  predict_manager_id: string;
  market_key: string;
  is_up: boolean;
  stake_micros: string;
  strike_micros: string | null;
  expiry_ms: string;
  oracle_id: string | null;
}

export interface StreakRow {
  telegram_user_id: string;
  current_streak: number;
  best_streak: number;
  last_outcome: string | null;
  last_tier_minted: number;
  nft_obj_id: string | null;
}
