import { config as loadDotenv } from "dotenv";
import { z } from "zod";

loadDotenv();

const EnvSchema = z.object({
  BOT_TOKEN: z.string().min(1, "BOT_TOKEN required"),
  WEBHOOK_SECRET: z.string().min(8, "WEBHOOK_SECRET must be >=8 chars"),
  DATABASE_URL: z.string().url(),
  SUI_RPC_URL: z.string().url().default("https://fullnode.testnet.sui.io:443"),
  PREDICT_PACKAGE_ID: z.string().regex(/^0x[0-9a-fA-F]+$/u),
  PREDICT_OBJ_ID: z.string().regex(/^0x[0-9a-fA-F]+$/u),
  DUSDC_TYPE: z.string().min(1),
  UPDOWN_PACKAGE_ID: z.string().regex(/^0x[0-9a-fA-F]+$/u),
  BOT_SIGNER_PRIVKEY: z
    .string()
    .regex(/^(0x)?[0-9a-fA-F]+$/u, "BOT_SIGNER_PRIVKEY must be hex"),
  ENOKI_API_KEY: z.string().min(1),
  WEB_URL: z.string().url(),
  LOG_LEVEL: z
    .enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"])
    .default("info"),
  PORT: z.coerce.number().int().positive().default(3001),
});

export type Env = z.infer<typeof EnvSchema>;

let cached: Env | undefined;

export function getEnv(): Env {
  if (cached) return cached;
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${issues}`);
  }
  cached = parsed.data;
  return cached;
}
