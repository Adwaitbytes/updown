import "dotenv/config";
import { z } from "zod";

const Schema = z.object({
  DATABASE_URL: z.string().url(),
  SUI_RPC_URL: z.string().url(),
  PREDICT_PACKAGE_ID: z.string().min(1),
  PREDICT_OBJ_ID: z.string().min(1),
  DUSDC_TYPE: z.string().min(1),
  UPDOWN_PACKAGE_ID: z.string().min(1),
  SETTLER_SIGNER_PRIVKEY: z.string().min(1),
  ENOKI_API_KEY: z.string().min(1),
  TELEGRAM_BOT_TOKEN: z.string().min(1).optional(),
  STREAK_IMAGE_BASE_URL: z
    .string()
    .url()
    .default("https://updown.bet/api/streak"),
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  cached = Schema.parse(process.env);
  return cached;
}
