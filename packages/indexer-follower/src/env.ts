import "dotenv/config";
import { z } from "zod";

const Schema = z.object({
  DATABASE_URL: z.string().url(),
  SUI_RPC_URL: z.string().url(),
  PREDICT_PACKAGE_ID: z.string().min(1),
  UPDOWN_PACKAGE_ID: z.string().min(1),
  /** Optional starting cursor; if omitted we read from `cursor` table. */
  START_CURSOR: z.string().optional(),
  POLL_INTERVAL_MS: z.coerce.number().int().positive().default(2000),
});

export type Env = z.infer<typeof Schema>;

let cached: Env | null = null;

export function loadEnv(): Env {
  if (cached) return cached;
  cached = Schema.parse(process.env);
  return cached;
}
