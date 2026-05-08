import pg from "pg";

import { loadEnv } from "./env.js";

let pool: pg.Pool | null = null;

export function getPool(): pg.Pool {
  if (pool) return pool;
  pool = new pg.Pool({ connectionString: loadEnv().DATABASE_URL });
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params: ReadonlyArray<unknown> = [],
): Promise<pg.QueryResult<T>> {
  return getPool().query<T>(text, params as unknown[]);
}

/** Sui event cursor as Postgres-stable JSON. */
export interface StoredCursor {
  txDigest: string;
  eventSeq: string;
}

/** Per-module cursor names. Each event source advances its own cursor. */
export const CURSOR_PREDICT = "updown-events:predict" as const;
export const CURSOR_ACCOUNT = "updown-events:account" as const;
export const CURSOR_STREAK = "updown-events:streak" as const;

export type CursorName =
  | typeof CURSOR_PREDICT
  | typeof CURSOR_ACCOUNT
  | typeof CURSOR_STREAK;

function encodeCursor(c: StoredCursor): string {
  return JSON.stringify(c);
}

function decodeCursor(raw: unknown): StoredCursor | null {
  if (typeof raw !== "string") return raw as StoredCursor | null;
  // Stored as JSON string in TEXT column.
  try {
    const parsed = JSON.parse(raw) as Partial<StoredCursor>;
    if (
      parsed &&
      typeof parsed.txDigest === "string" &&
      typeof parsed.eventSeq === "string"
    ) {
      return { txDigest: parsed.txDigest, eventSeq: parsed.eventSeq };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Read the cursor for a specific module. Cursor names are required and
 * must be one of the per-module names exported above.
 */
export async function readCursor(
  name: CursorName,
): Promise<StoredCursor | null> {
  const { rows } = await query<{ value: string }>(
    `SELECT value FROM cursor WHERE name = $1 LIMIT 1`,
    [name],
  );
  if (!rows[0]) return null;
  return decodeCursor(rows[0].value);
}

/**
 * Write the cursor for a specific module. Cursor names are required.
 */
export async function writeCursor(
  name: CursorName,
  cursor: StoredCursor,
): Promise<void> {
  await query(
    `INSERT INTO cursor (name, value, updated_at)
        VALUES ($1, $2, NOW())
     ON CONFLICT (name) DO UPDATE
        SET value = EXCLUDED.value,
            updated_at = NOW()`,
    [name, encodeCursor(cursor)],
  );
}
