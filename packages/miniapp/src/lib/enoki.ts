// Server-side Enoki client init.
// Enoki provides sponsored zkLogin transactions; here we initialize a flow
// keyed to the Google OIDC provider. Client-side helpers wrap the same SDK.

import { EnokiClient } from "@mysten/enoki";

import { readPublicEnv, readServerEnv } from "./env";

let serverClient: EnokiClient | null = null;
let publicClient: EnokiClient | null = null;

export function getServerEnokiClient(): EnokiClient {
  if (serverClient) return serverClient;
  const env = readServerEnv();
  serverClient = new EnokiClient({ apiKey: env.ENOKI_API_KEY });
  return serverClient;
}

export function getPublicEnokiClient(): EnokiClient {
  if (publicClient) return publicClient;
  const env = readPublicEnv();
  publicClient = new EnokiClient({ apiKey: env.NEXT_PUBLIC_ENOKI_PUBLIC_KEY });
  return publicClient;
}

export interface OidcProviderConfig {
  google: { clientId: string };
}

export function getOidcConfig(): OidcProviderConfig {
  const env = readPublicEnv();
  return { google: { clientId: env.NEXT_PUBLIC_GOOGLE_CLIENT_ID } };
}
