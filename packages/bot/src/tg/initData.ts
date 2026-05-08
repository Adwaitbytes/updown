import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify Telegram Mini App `initData` per the documented HMAC scheme:
 *   secret_key = HMAC_SHA256(key="WebAppData", message=BOT_TOKEN)
 *   data_check_string = sorted "key=value" lines (excluding hash)
 *   expected_hash = HMAC_SHA256(secret_key, data_check_string)
 *
 * Returns the parsed `user.id` on success, or null on failure.
 *
 * Ref: https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export interface VerifiedInitData {
  userId: bigint;
  authDateMs: number;
  raw: URLSearchParams;
}

export function verifyInitData(
  initData: string,
  botToken: string,
  maxAgeMs: number = 24 * 60 * 60 * 1000,
): VerifiedInitData | null {
  const params = new URLSearchParams(initData);
  const hashParam = params.get("hash");
  if (!hashParam) return null;
  params.delete("hash");

  const dataCheckLines: string[] = [];
  const sortedKeys = Array.from(params.keys()).sort();
  for (const k of sortedKeys) {
    dataCheckLines.push(`${k}=${params.get(k) ?? ""}`);
  }
  const dataCheckString = dataCheckLines.join("\n");

  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const expected = createHmac("sha256", secretKey).update(dataCheckString).digest();

  let provided: Buffer;
  try {
    provided = Buffer.from(hashParam, "hex");
  } catch {
    return null;
  }
  if (provided.length !== expected.length) return null;
  if (!timingSafeEqual(provided, expected)) return null;

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) return null;
  const authDateMs = Number.parseInt(authDateRaw, 10) * 1000;
  if (!Number.isFinite(authDateMs)) return null;
  if (Date.now() - authDateMs > maxAgeMs) return null;

  const userJson = params.get("user");
  if (!userJson) return null;
  let parsed: { id?: number };
  try {
    parsed = JSON.parse(userJson) as { id?: number };
  } catch {
    return null;
  }
  if (typeof parsed.id !== "number") return null;

  // Reattach hash for caller convenience (kept out of dataCheckString).
  params.set("hash", hashParam);

  return {
    userId: BigInt(parsed.id),
    authDateMs,
    raw: params,
  };
}

/**
 * Constant-time HMAC of a webhook secret token (for `x-telegram-bot-api-secret-token`).
 * Telegram sends back the same token we registered. Use timing-safe comparison.
 */
export function verifyWebhookSecret(
  expected: string,
  provided: string | undefined,
): boolean {
  if (!provided) return false;
  const a = createHash("sha256").update(expected).digest();
  const b = createHash("sha256").update(provided).digest();
  return timingSafeEqual(a, b);
}
