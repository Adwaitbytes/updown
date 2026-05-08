# Deployment

## Targets

| Service | Target | Domain |
|---|---|---|
| Marketing site | Vercel (static) | updown.bet |
| Mini App | Vercel | mini.updown.bet |
| Settler cron | Vercel cron (Pro) or Fly.io | (no domain) |
| Bot webhook | Vercel functions or long-running worker | bot.updown.bet/webhook |
| Indexer-follower | Long-running worker (Fly.io / Railway) | (no domain) |

## First deploy

1. **Marketing site**
   `vercel --cwd packages/web --prod`
2. **Mini App**
   - Set env vars: BOT_TOKEN, DATABASE_URL, ENOKI_API_KEY, MASTER_DELEGATION_SECRET, etc.
   - `vercel --cwd packages/miniapp --prod`
   - Note the production URL; set as WEB_URL in the bot's env.
3. **Move package**
   `cd move && sui client publish --gas-budget 200000000`
   Save the package id and the StreakNft Display id.
4. **Settler cron**
   - On Vercel Pro: `vercel --cwd packages/settler --prod`. The cron at `*/1 * * * *` runs every minute.
   - On Hobby: switch to Fly.io / Railway with a long-running worker. Hobby cron minimum is 1 day.
5. **Bot webhook**
   - For demo: Vercel Functions on `packages/bot` exposing `/webhook/:secret`.
   - For production: long-running worker so the websocket settler can sit in the same process.
   - After deploy: `curl https://api.telegram.org/bot$BOT_TOKEN/setWebhook -d "url=https://bot.updown.bet/webhook/$WEBHOOK_SECRET"`
6. **Indexer-follower**
   - Fly.io machine, or any always-on host. `npm run dev` is the entry point in production too — it handles graceful shutdown.

## Smoke test post-deploy

- Open `t.me/UpDownBetaBot` and tap `/start`
- Open the Mini App; sign in with Google
- Confirm a sponsored transaction lands; you have a `BettingAccount` on testnet
- Text `/up 70k 15m 1` (smallest possible bet)
- Wait 15 minutes
- Receive a P&L DM with a Sui block-explorer link

## Rollback

- `vercel rollback <deployment-url>` per surface
- Move package: don't roll back; deploy new version. Mark old as deprecated via `published-at`.
