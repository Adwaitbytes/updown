import pg from "pg";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getEnv } from "./env.js";
import { logger } from "./log.js";

const { Pool } = pg;

let pool: pg.Pool | undefined;

const HERE = dirname(fileURLToPath(import.meta.url));

async function loadInitSql(): Promise<string> {
  return readFile(resolve(HERE, "migrations", "001_init.sql"), "utf8");
}

export function getPool(): pg.Pool {
  if (pool) return pool;
  const env = getEnv();
  pool = new Pool({
    connectionString: env.DATABASE_URL,
    max: 10,
    idleTimeoutMillis: 30_000,
  });
  pool.on("error", (err: Error) => {
    logger.error({ err }, "pg pool error");
  });
  return pool;
}

export async function runMigrations(): Promise<void> {
  const p = getPool();
  const client = await p.connect();
  try {
    await client.query("BEGIN");
    const sql = await loadInitSql();
    await client.query(sql);
    await client.query("COMMIT");
    logger.info("db migrations applied");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export interface UserRow {
  telegram_user_id: string;
  sui_address: string;
  account_id: string;
  owner_cap_id: string;
  predict_manager_id: string;
  oracle_id: string | null;
  delegated_pubkey: string;
  created_at: Date;
}

export async function getUserByTelegramId(
  telegramUserId: bigint,
): Promise<UserRow | undefined> {
  const p = getPool();
  const res = await p.query<UserRow>(
    "SELECT * FROM users WHERE telegram_user_id = $1 LIMIT 1",
    [telegramUserId.toString()],
  );
  return res.rows[0];
}

export interface StreakRow {
  telegram_user_id: string;
  current_streak: number;
  best_streak: number;
  last_outcome: "win" | "loss" | null;
  last_tier_minted: number;
  nft_obj_id: string | null;
  last_updated: Date;
}

export async function getStreak(
  telegramUserId: bigint,
): Promise<StreakRow | undefined> {
  const p = getPool();
  const res = await p.query<StreakRow>(
    "SELECT * FROM streaks WHERE telegram_user_id = $1 LIMIT 1",
    [telegramUserId.toString()],
  );
  return res.rows[0];
}
