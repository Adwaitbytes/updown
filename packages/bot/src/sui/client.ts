import { SuiClient } from "@mysten/sui/client";
import { getEnv } from "../env.js";

let client: SuiClient | undefined;

export function getSuiClient(): SuiClient {
  if (client) return client;
  const env = getEnv();
  client = new SuiClient({ url: env.SUI_RPC_URL });
  return client;
}
