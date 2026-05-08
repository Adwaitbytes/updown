// Minimal Telegram WebApp typings + helpers.
// The actual `window.Telegram.WebApp` object is injected by telegram-web-app.js loaded in layout.tsx.

export interface TelegramWebAppUser {
  id: number;
  is_bot?: boolean;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
}

export interface TelegramWebAppInitDataUnsafe {
  user?: TelegramWebAppUser;
  auth_date?: number;
  hash?: string;
  query_id?: string;
}

export interface TelegramThemeParams {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: TelegramWebAppInitDataUnsafe;
  themeParams: TelegramThemeParams;
  colorScheme: "light" | "dark";
  ready: () => void;
  expand: () => void;
  close: () => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp?: TelegramWebApp;
    };
  }
}

export function getWebApp(): TelegramWebApp | null {
  if (typeof window === "undefined") return null;
  return window.Telegram?.WebApp ?? null;
}

export function initTelegram(): TelegramWebApp | null {
  const wa = getWebApp();
  if (!wa) return null;
  try {
    wa.ready();
    wa.expand();
  } catch {
    // ignore
  }
  return wa;
}

export function getInitData(): string | null {
  return getWebApp()?.initData ?? null;
}

export function closeWebApp(): void {
  getWebApp()?.close();
}

/**
 * Result of a successful HMAC verification of Telegram `initData`.
 */
export interface VerifiedInitData {
  /** Parsed Telegram user id from the `user` field. */
  userId: bigint;
  /** `auth_date` translated to milliseconds-since-epoch. */
  authDateMs: number;
}

/**
 * HMAC verification of Telegram `initData` per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 *
 *   secret_key = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN)
 *   data_check_string = sorted "key=value" lines (excluding `hash`) joined by "\n"
 *   expected_hash = HMAC_SHA256(secret_key, data_check_string)
 *
 * Returns the verified payload (`userId`, `authDateMs`) when:
 *   - the HMAC matches (compared with `crypto.timingSafeEqual`),
 *   - `auth_date` is within `maxAgeMs` (default 5 minutes), and
 *   - `user.id` is present and parseable as a number.
 *
 * Returns `null` on any failure. Must run server-side with the bot token.
 */
export async function verifyInitDataHmac(
  initData: string,
  botToken: string,
  maxAgeMs: number = 5 * 60 * 1000,
): Promise<VerifiedInitData | null> {
  if (!initData || !botToken) return null;

  // Lazy import so this module is import-safe in client bundles (the function
  // is unreachable from the client; this guard keeps webpack happy).
  const { createHmac, timingSafeEqual } = await import("node:crypto");

  const params = new URLSearchParams(initData);
  const hashParam = params.get("hash");
  if (!hashParam) return null;
  params.delete("hash");

  // Sort keys lexicographically and join "key=value" lines with newlines.
  const sortedKeys = Array.from(params.keys()).sort();
  const dataCheckString = sortedKeys
    .map((k) => `${k}=${params.get(k) ?? ""}`)
    .join("\n");

  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expected = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(hashParam, "hex");
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  // auth_date freshness — Telegram returns Unix seconds.
  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) return null;
  const authDateSec = Number.parseInt(authDateRaw, 10);
  if (!Number.isFinite(authDateSec)) return null;
  const authDateMs = authDateSec * 1000;
  if (Date.now() - authDateMs > maxAgeMs) return null;
  // Reject implausible future timestamps (clock skew window of 60s).
  if (authDateMs - Date.now() > 60 * 1000) return null;

  // Parse user id.
  const userJson = params.get("user");
  if (!userJson) return null;
  let parsed: { id?: number };
  try {
    parsed = JSON.parse(userJson) as { id?: number };
  } catch {
    return null;
  }
  if (typeof parsed.id !== "number" || !Number.isFinite(parsed.id)) return null;

  return {
    userId: BigInt(parsed.id),
    authDateMs,
  };
}
