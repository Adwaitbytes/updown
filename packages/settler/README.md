# @updown/settler

Permissionless settlement cron for Up/Down. Calls
`predict::redeem_permissionless` for every expired position, batches one
PTB per `PredictManager` to amortize gas, then updates Postgres
(`positions`, `streaks`, `streak_mint_jobs`) and DMs the user via the
Telegram Bot API.

## Workflow

1. `SELECT * FROM positions WHERE status='open' AND expiry_ms < NOW()`.
2. Group by `predict_manager_id`, build one PTB per group.
3. Sponsor + execute (Enoki sponsorship in production; local signer for dev).
4. Parse `PositionSettled` events from the txn → update DB.
5. Update streaks and enqueue NFT mints when a tier (3/7/30) is crossed.
6. Send DM via `https://api.telegram.org/bot<token>/sendMessage`.

A separate worker (`src/streak-nft.ts`) drains `streak_mint_jobs`.

## Scripts

```sh
npm install
npm run dev        # tsx watch src/run.ts
npm run build      # tsc -p tsconfig.json
npm run start      # node dist/run.js
npm run typecheck  # tsc --noEmit
```

## Deployment

This package is shaped to run as a Vercel Cron job:

- Handler: `api/cron.ts` (default export).
- Schedule: `vercel.json` (defaults to `*/1 * * * *`; for production set finer
  cadence — every 30s — via the Pro plan or run as a long-lived worker
  invoking `runOnce()` in a loop).

You can also run `npm run start` on any cron host (Fly, Railway, k8s
CronJob) — it executes a single tick and exits.

## Env vars

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `SUI_RPC_URL` | Sui RPC endpoint |
| `PREDICT_PACKAGE_ID` | DeepBook Predict package id |
| `PREDICT_OBJ_ID` | Predict shared object id |
| `DUSDC_TYPE` | Fully-qualified dUSDC coin type |
| `UPDOWN_PACKAGE_ID` | Up/Down Move package id |
| `SETTLER_SIGNER_PRIVKEY` | Signer key (base64 or `suiprivkey1...`) |
| `ENOKI_API_KEY` | Enoki sponsorship key |
| `TELEGRAM_BOT_TOKEN` | Optional — for DM notifications |
| `STREAK_IMAGE_BASE_URL` | NFT image URL prefix (default `https://updown.bet/api/streak`) |
| `CRON_SECRET` | Optional — Bearer token for `/api/cron` |
