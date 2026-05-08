import { SuiClient } from "@mysten/sui/client";
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519";

import { loadEnv } from "./env.js";

let client: SuiClient | null = null;
let signer: Ed25519Keypair | null = null;

export function getSuiClient(): SuiClient {
  if (client) return client;
  const env = loadEnv();
  client = new SuiClient({ url: env.SUI_RPC_URL });
  return client;
}

export function getSettlerSigner(): Ed25519Keypair {
  if (signer) return signer;
  const env = loadEnv();
  // Accept either a base64 secret or `suiprivkey1...` bech32-encoded seed.
  const raw = env.SETTLER_SIGNER_PRIVKEY;
  if (raw.startsWith("suiprivkey1")) {
    signer = Ed25519Keypair.fromSecretKey(raw);
  } else {
    const bytes = Buffer.from(raw, "base64");
    signer = Ed25519Keypair.fromSecretKey(new Uint8Array(bytes));
  }
  return signer;
}
