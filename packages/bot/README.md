# @updown/bot

Telegram bot for Up/Down — sub-hour BTC binary options on Sui via DeepBook Predict.

Users text `/up 70k 15m 100`, the bot signs a Sui PTB with a per-user delegated key (gated by a Move policy in `updown::account::place_bet`), the bet is locked, and 15 minutes later a settler worker calls `predict::redeem_permissionless`.

## Stack

- Node.js 24, TypeScript strict
- [grammY](https://grammy.dev) + `@grammyjs/conversations` + `@grammyjs/transformer-throttler`
- `@mysten/sui` for transaction building
- Postgres (`pg`) for users/positions/streak/sessions
- Express webhook server, Vercel-friendly

## Environment

Copy `.env.example` to `.env` and fill in:

```
BOT_TOKEN=                   # from @BotFather
WEBHOOK_SECRET=              # 16+ chars; matches Telegram's setWebhook secret
DATABASE_URL=postgres://...
SUI_RPC_URL=https://fullnode.testnet.sui.io:443
PREDICT_PACKAGE_ID=0x...
PREDICT_OBJ_ID=0x...
DUSDC_TYPE=0x...::dusdc::DUSDC
UPDOWN_PACKAGE_ID=0x...
BOT_SIGNER_PRIVKEY=          # hex, master from which per-user keys are derived
ENOKI_API_KEY=               # for Sponsored Transactions
WEB_URL=https://updown.example/miniapp
LOG_LEVEL=info
PORT=3001
```

## Database

Migrations run on every boot (idempotent):

- `users`, `positions`, `streak`, `mini_app_sessions`, `copy_rules`

To manually init from psql:

```
createdb updown
psql $DATABASE_URL -c '\dt'
```

## Run

```
npm install
npm run typecheck
npm run dev
```

Then register the webhook with Telegram:

```
curl -X POST "https://api.telegram.org/bot$BOT_TOKEN/setWebhook" \
  -H 'content-type: application/json' \
  -d "{\"url\":\"https://your-host/webhook/$WEBHOOK_SECRET\",\"secret_token\":\"$WEBHOOK_SECRET\"}"
```

## Vercel notes

The Express app exports a single handler. For Vercel, wrap `buildServer(bot)` in `api/webhook/[secret].ts` and re-export the express app. Long-running cron settlement lives in `packages/settler`, not here. Keep this process stateless — Postgres is the source of truth.

## Commands

- `/start` — onboarding via Mini App
- `/up <strike> <window> <amount>` — open an UP bet (e.g. `/up 70k 15m 100`)
- `/down <strike> <window> <amount>` — open a DOWN bet
- `/balance` — dUSDC balance, open positions, daily cap
- `/streak` — current/best streak + recent win NFTs
- `/leader` — weekly leaderboard
- `/copy <leader_id> [cap]` — follow another user for 24h
