import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { NextResponse } from "next/server";
import { z } from "zod";

import { getPool } from "@/lib/db";
import { readServerEnv } from "@/lib/env";
import { verifyInitDataHmac } from "@/lib/telegram";

export const runtime = "nodejs";

// Body shape: { session: string, initData: string }.
// `session` is the one-time onboarding token issued by the bot; `initData` is
// the raw Telegram WebApp `initData` query string forwarded from the client so
// the server can re-verify the Telegram-origin proof (HMAC-SHA256).
const BodySchema = z.object({
  // Raise minimum length to 32 chars — see audit recommendation #5. Tokens
  // shorter than 32 chars do not have enough entropy to resist enumeration.
  session: z.string().min(32),
  initData: z.string().min(1),
});

interface SessionRow {
  telegram_user_id: string;
  expires_at: Date;
  consumed_at: Date | null;
}

export async function POST(req: Request): Promise<Response> {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }

  let env;
  try {
    env = readServerEnv();
  } catch {
    return NextResponse.json({ error: "server_misconfigured" }, { status: 500 });
  }

  // 1. Verify Telegram `initData` HMAC and freshness BEFORE touching the DB.
  //    Defense in depth: a leaked session token alone is insufficient.
  const verified = await verifyInitDataHmac(parsed.data.initData, env.BOT_TOKEN);
  if (!verified) {
    return NextResponse.json({ error: "invalid_init_data" }, { status: 403 });
  }

  // 2. Validate session token against Postgres (singleton Pool).
  const row = await lookupSession(env.DATABASE_URL, parsed.data.session);
  if (!row) {
    return NextResponse.json({ error: "session_not_found" }, { status: 404 });
  }
  if (row.consumed_at !== null) {
    return NextResponse.json({ error: "session_already_used" }, { status: 410 });
  }
  if (row.expires_at.getTime() < Date.now()) {
    return NextResponse.json({ error: "session_expired" }, { status: 410 });
  }

  // 3. Cross-check: the user that owns this session must match the user who
  //    just proved Telegram-origin via initData. Refuses session-stuffing.
  if (row.telegram_user_id !== verified.userId.toString()) {
    return NextResponse.json({ error: "user_mismatch" }, { status: 403 });
  }

  // 4. Atomically mark single-use BEFORE returning the pubkey, so a concurrent
  //    replay loses the race.
  const consumed = await consumeSession(env.DATABASE_URL, parsed.data.session);
  if (!consumed) {
    return NextResponse.json({ error: "session_already_used" }, { status: 410 });
  }

  // 5. HKDF(master_secret, salt = telegram_user_id) → 32-byte Ed25519 seed.
  const seed = await hkdfSha256(
    encodeUtf8(env.MASTER_DELEGATION_SECRET),
    encodeUtf8(row.telegram_user_id),
    encodeUtf8("updown-delegated-key/v1"),
    32,
  );
  const kp = Ed25519Keypair.fromSecretKey(seed);
  const pubBytes = kp.getPublicKey().toRawBytes();

  return NextResponse.json({
    delegatedPubkeyBase64: base64FromBytes(pubBytes),
  });
}

async function lookupSession(
  databaseUrl: string,
  token: string,
): Promise<SessionRow | null> {
  const pool = await getPool(databaseUrl);
  const { rows } = await pool.query(
    `SELECT telegram_user_id::text AS telegram_user_id,
            expires_at,
            consumed_at
       FROM mini_app_sessions
      WHERE token = $1
      LIMIT 1`,
    [token],
  );
  const row = rows[0] as
    | {
        telegram_user_id: string;
        expires_at: Date;
        consumed_at: Date | null;
      }
    | undefined;
  return row ?? null;
}

/**
 * Atomically marks the session as consumed. Returns true if the row was just
 * consumed by this call; false if the row was already consumed (or missing).
 */
async function consumeSession(
  databaseUrl: string,
  token: string,
): Promise<boolean> {
  const pool = await getPool(databaseUrl);
  const { rowCount } = await pool.query(
    `UPDATE mini_app_sessions
        SET consumed_at = NOW()
      WHERE token = $1
        AND consumed_at IS NULL
        AND expires_at > NOW()`,
    [token],
  );
  return (rowCount ?? 0) > 0;
}

/**
 * Returns a fresh ArrayBuffer copy of the input bytes — required because
 * crypto.subtle's typings reject Uint8Array<SharedArrayBuffer> in strict mode.
 */
function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const buf = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(buf).set(bytes);
  return buf;
}

function encodeUtf8(s: string): ArrayBuffer {
  return toArrayBuffer(new TextEncoder().encode(s));
}

async function hkdfSha256(
  ikm: ArrayBuffer,
  salt: ArrayBuffer,
  info: ArrayBuffer,
  length: number,
): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info },
    baseKey,
    length * 8,
  );
  return new Uint8Array(bits);
}

function base64FromBytes(bytes: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(bytes).toString("base64");
  }
  let s = "";
  for (let i = 0; i < bytes.length; i++) {
    s += String.fromCharCode(bytes[i] ?? 0);
  }
  return btoa(s);
}
