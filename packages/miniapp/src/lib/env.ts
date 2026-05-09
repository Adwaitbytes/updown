import { z } from "zod";

const PublicSchema = z.object({
  NEXT_PUBLIC_ENOKI_PUBLIC_KEY: z.string().min(1),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().min(1),
  NEXT_PUBLIC_SUI_NETWORK: z.enum(["mainnet", "testnet", "devnet", "localnet"]),
  NEXT_PUBLIC_SUI_RPC_URL: z.string().url(),
  NEXT_PUBLIC_PREDICT_PACKAGE_ID: z.string().min(1),
  NEXT_PUBLIC_PREDICT_OBJ_ID: z.string().min(1),
  NEXT_PUBLIC_DUSDC_TYPE: z.string().min(1),
  NEXT_PUBLIC_DUSDC_TREASURY_CAP_ID: z.string().min(1),
  NEXT_PUBLIC_UPDOWN_PACKAGE_ID: z.string().min(1),
  NEXT_PUBLIC_BOT_WEBHOOK_URL: z.string().url(),
});

const ServerSchema = z.object({
  DATABASE_URL: z.string().url(),
  ENOKI_API_KEY: z.string().min(1),
  MASTER_DELEGATION_SECRET: z.string().min(32),
  // Telegram Bot API token. Used to derive the WebAppData HMAC key for
  // verifying Mini App `initData` server-side.
  BOT_TOKEN: z.string().min(1),
  PREDICT_INDEXER_URL: z.string().url(),
});

export type PublicEnv = z.infer<typeof PublicSchema>;
export type ServerEnv = z.infer<typeof ServerSchema>;

export function readPublicEnv(): PublicEnv {
  // Next.js inlines NEXT_PUBLIC_* at build time; this works on both client and server.
  return PublicSchema.parse({
    NEXT_PUBLIC_ENOKI_PUBLIC_KEY: process.env.NEXT_PUBLIC_ENOKI_PUBLIC_KEY,
    NEXT_PUBLIC_GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID,
    NEXT_PUBLIC_SUI_NETWORK: process.env.NEXT_PUBLIC_SUI_NETWORK,
    NEXT_PUBLIC_SUI_RPC_URL: process.env.NEXT_PUBLIC_SUI_RPC_URL,
    NEXT_PUBLIC_PREDICT_PACKAGE_ID: process.env.NEXT_PUBLIC_PREDICT_PACKAGE_ID,
    NEXT_PUBLIC_PREDICT_OBJ_ID: process.env.NEXT_PUBLIC_PREDICT_OBJ_ID,
    NEXT_PUBLIC_DUSDC_TYPE: process.env.NEXT_PUBLIC_DUSDC_TYPE,
    NEXT_PUBLIC_DUSDC_TREASURY_CAP_ID: process.env.NEXT_PUBLIC_DUSDC_TREASURY_CAP_ID,
    NEXT_PUBLIC_UPDOWN_PACKAGE_ID: process.env.NEXT_PUBLIC_UPDOWN_PACKAGE_ID,
    NEXT_PUBLIC_BOT_WEBHOOK_URL: process.env.NEXT_PUBLIC_BOT_WEBHOOK_URL,
  });
}

export function readServerEnv(): ServerEnv {
  return ServerSchema.parse({
    DATABASE_URL: process.env.DATABASE_URL,
    ENOKI_API_KEY: process.env.ENOKI_API_KEY,
    MASTER_DELEGATION_SECRET: process.env.MASTER_DELEGATION_SECRET,
    BOT_TOKEN: process.env.BOT_TOKEN,
    PREDICT_INDEXER_URL: process.env.PREDICT_INDEXER_URL,
  });
}
