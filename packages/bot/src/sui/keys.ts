import { createHmac } from "node:crypto";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";
import { getEnv } from "../env.js";

/**
 * Per-user delegated key derivation.
 *
 * Strategy: HKDF-Extract-then-Expand (RFC 5869) with master = BOT_SIGNER_PRIVKEY,
 * salt = telegram_user_id. We never persist the private half — only the public
 * key is stored on-chain and indexed.
 *
 * Note: Sui Ed25519 keys take 32-byte seeds.
 */

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (clean.length % 2 !== 0) {
    throw new Error("hex string has odd length");
  }
  const out = new Uint8Array(clean.length / 2);
  for (let i = 0; i < out.length; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Uint8Array {
  return new Uint8Array(createHmac("sha256", salt).update(ikm).digest());
}

function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Uint8Array {
  const out = new Uint8Array(length);
  let prev = new Uint8Array(0);
  let counter = 1;
  let offset = 0;
  while (offset < length) {
    const h = createHmac("sha256", prk);
    h.update(prev);
    h.update(info);
    h.update(Uint8Array.of(counter));
    prev = new Uint8Array(h.digest());
    const take = Math.min(prev.length, length - offset);
    out.set(prev.subarray(0, take), offset);
    offset += take;
    counter++;
  }
  return out;
}

/** Derive the per-user delegated Ed25519 keypair deterministically. */
export function deriveDelegatedKeypair(telegramUserId: bigint): Ed25519Keypair {
  const env = getEnv();
  const ikm = hexToBytes(env.BOT_SIGNER_PRIVKEY);
  const salt = new TextEncoder().encode(`updown:user:${telegramUserId.toString()}`);
  const prk = hkdfExtract(salt, ikm);
  const seed = hkdfExpand(prk, new TextEncoder().encode("ed25519-delegated"), 32);
  return Ed25519Keypair.fromSecretKey(seed);
}

/** Stable string identifier for the derived public key (Sui-formatted). */
export function delegatedPublicKey(telegramUserId: bigint): string {
  return deriveDelegatedKeypair(telegramUserId).getPublicKey().toSuiPublicKey();
}
