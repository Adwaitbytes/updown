import express, { type Request, type Response } from "express";
import type { Bot } from "grammy";
import { webhookCallback } from "grammy";
import { getEnv } from "./env.js";
import { logger } from "./log.js";
import { verifyInitData, verifyWebhookSecret } from "./tg/initData.js";
import { getPool } from "./db.js";
import type { BotContext } from "./types.js";

interface MiniAppSessionRow {
  token: string;
  telegram_user_id: string;
  expires_at: Date;
}

export function buildServer(bot: Bot<BotContext>): express.Express {
  const env = getEnv();
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.get("/healthz", (_req: Request, res: Response) => {
    res.status(200).json({ ok: true });
  });

  // Telegram webhook with HMAC secret-token verification.
  const callback = webhookCallback(bot, "express");
  app.post("/webhook/:secret", (req: Request, res: Response) => {
    const provided = req.header("x-telegram-bot-api-secret-token");
    if (!verifyWebhookSecret(env.WEBHOOK_SECRET, provided)) {
      logger.warn("rejected webhook: bad secret token");
      res.status(401).send("unauthorized");
      return;
    }
    if (req.params.secret !== env.WEBHOOK_SECRET) {
      res.status(404).send("not found");
      return;
    }
    // CRITICAL: never propagate handler errors to Express's default 500.
    // Telegram interprets HTTP 500 as "retry the update" and will pound
    // the bot in a tight loop. Always 200 the webhook even on internal
    // failure — the user already saw the failure path; we just need
    // Telegram to stop redelivering the same update.
    Promise.resolve(callback(req, res)).catch((err: unknown) => {
      logger.error({ err }, "webhook handler error");
      if (!res.headersSent) res.status(200).end();
    });
  });

  // Mini App posts back after onboarding completes.
  app.post(
    "/miniapp/session",
    async (req: Request, res: Response): Promise<void> => {
      const body = req.body as {
        initData?: unknown;
        token?: unknown;
        suiAddress?: unknown;
        accountId?: unknown;
        ownerCapId?: unknown;
        predictManagerId?: unknown;
        delegatedPubkey?: unknown;
      };

      if (
        typeof body.initData !== "string" ||
        typeof body.token !== "string" ||
        typeof body.suiAddress !== "string" ||
        typeof body.accountId !== "string" ||
        typeof body.ownerCapId !== "string" ||
        typeof body.predictManagerId !== "string" ||
        typeof body.delegatedPubkey !== "string"
      ) {
        res.status(400).json({ error: "missing fields" });
        return;
      }

      const verified = verifyInitData(body.initData, env.BOT_TOKEN);
      if (!verified) {
        res.status(401).json({ error: "bad initData" });
        return;
      }

      const pool = getPool();
      const sessRes = await pool.query<MiniAppSessionRow>(
        `SELECT * FROM mini_app_sessions WHERE token = $1 LIMIT 1`,
        [body.token],
      );
      const sess = sessRes.rows[0];
      if (!sess) {
        res.status(404).json({ error: "session not found" });
        return;
      }
      if (sess.expires_at.getTime() < Date.now()) {
        res.status(410).json({ error: "session expired" });
        return;
      }
      if (BigInt(sess.telegram_user_id) !== verified.userId) {
        res.status(403).json({ error: "session/user mismatch" });
        return;
      }

      await pool.query(
        `INSERT INTO users
           (telegram_user_id, sui_address, account_id, owner_cap_id,
            predict_manager_id, delegated_pubkey)
         VALUES ($1,$2,$3,$4,$5,$6)
         ON CONFLICT (telegram_user_id) DO UPDATE SET
           sui_address = EXCLUDED.sui_address,
           account_id = EXCLUDED.account_id,
           owner_cap_id = EXCLUDED.owner_cap_id,
           predict_manager_id = EXCLUDED.predict_manager_id,
           delegated_pubkey = EXCLUDED.delegated_pubkey`,
        [
          verified.userId.toString(),
          body.suiAddress,
          body.accountId,
          body.ownerCapId,
          body.predictManagerId,
          body.delegatedPubkey,
        ],
      );

      // Mark session consumed (single-use). Leave row in place for audit trail.
      await pool.query(
        `UPDATE mini_app_sessions SET consumed_at = NOW() WHERE token = $1`,
        [body.token],
      );

      res.status(200).json({ ok: true });
    },
  );

  return app;
}
