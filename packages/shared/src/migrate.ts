// Shared migration runner. Each service imports this and calls runMigrations(pool)
// at boot. The SQL file is the single source of truth.

import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import type { Pool } from "pg";

const HERE = dirname(fileURLToPath(import.meta.url));

async function loadMigration(name: string): Promise<string> {
  // Migrations live next to this file under ../migrations/
  const path = resolve(HERE, "..", "migrations", name);
  return readFile(path, "utf8");
}

export async function runMigrations(pool: Pool): Promise<void> {
  const sql = await loadMigration("001_init.sql");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(sql);
    await client.query("COMMIT");
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}
