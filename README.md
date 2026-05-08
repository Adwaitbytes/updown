# Up/Down

> Bet on BTC up or down. 15 minutes. Settled on-chain.

A Telegram-native binary options bot built on **Sui** via **DeepBook Predict**. You text `/up 70k 15m 100`, the bot locks your position, and 15 minutes later you win 1.7× or lose your stake — settlement is atomic on-chain. Self-custodial via zkLogin, sponsored gas via Enoki, optional streak NFTs at 3 / 7 / 30 wins.

Built for **Sui Overflow 2026** under the **DeepBook Predict** track.

---

## Why this exists

Polymarket and Kalshi launched 5–15 minute crypto binaries late last year and they're already eating crypto trading volume. They work — but they're either US-KYC-only or require Safe-wallet onboarding most people will never finish.

Sub-second settlement on Sui plus zkLogin self-custody plus Telegram's social loop adds up to a much faster product loop: text two words and you're trading. Streak NFTs travel cross-app (any Sui wallet) and double as a cheap viral hook in group chats.

The protocol-level pricing — DeepBook Predict's volatility-surface-priced binaries — gives tighter spreads than AMM-based prediction markets. So this isn't "Polymarket on a different chain"; it's a fundamentally different pricing primitive on a chain whose UX rails (zkLogin + sponsored gas) finally make consumer crypto trading feel like a Telegram message.

---

## Repository layout

```
updown/
├── move/                              # On-chain Move package (testnet)
│   ├── Move.toml
│   ├── sources/
│   │   ├── account.move               # BettingAccount + capped delegated signer
│   │   └── streak.move                # StreakNft (Bronze/Silver/Gold)
│   └── tests/
│       └── account_tests.move         # 6 scenarios with real Ed25519 vectors
│
├── packages/
│   ├── shared/                        # Single source of truth for Postgres
│   │   ├── migrations/001_init.sql    # 10 tables, idempotent
│   │   └── src/migrate.ts             # runMigrations(pool)
│   │
│   ├── bot/                           # Telegram bot (grammY + Express)
│   │   └── src/
│   │       ├── commands/              # /up /down /balance /streak /leader /copy /start
│   │       ├── sui/                   # SuiClient, PTB builder, scale helpers, HKDF keys
│   │       ├── tg/                    # initData verifier, P&L share card SVG
│   │       ├── server.ts              # Express webhook + /miniapp/session
│   │       └── index.ts               # Boot: env, migrations, throttler, register, listen
│   │
│   ├── miniapp/                       # Telegram WebApp for zkLogin onboarding (Next.js)
│   │   └── src/app/
│   │       ├── onboard/               # Google → Enoki zkLogin → sponsored PTB
│   │       ├── revoke/                # Lists OwnerCaps, sponsored revoke
│   │       └── api/derive-pubkey/     # POST + initData HMAC + atomic single-use
│   │
│   ├── settler/                       # Permissionless settlement cron
│   │   └── src/
│   │       ├── run.ts                 # Atomic settling state, batched PTBs per manager
│   │       └── streak-nft.ts          # Drains streak_mint_jobs, calls streak::mint_for
│   │
│   ├── indexer-follower/              # Sui event tail with per-module cursors
│   │   └── src/
│   │       ├── run.ts                 # WS + polling fallback
│   │       ├── handlers.ts            # zod-validated event routing
│   │       └── poller.ts              # Cursor pagination
│   │
│   └── web/                           # Marketing site (Next.js 16, Tailwind v4)
│       └── src/components/            # Nav, Hero, TrustStrip, HowItWorks,
│                                      # CommandsGrid, StreakNFTs, HallOfFame,
│                                      # CTABand, FAQ, Footer
│
└── package.json                       # Workspaces root
```

---

## Architecture (in plain English)

1. User opens the bot on Telegram, taps a button, signs in with Google. Inside a Mini App, [Enoki](https://docs.enoki.mystenlabs.com) derives their Sui address and submits a single sponsored PTB that creates their `PredictManager`, mints starter dUSDC, and creates a `BettingAccount` with a daily cap.
2. The bot derives a per-user Ed25519 key via HKDF-SHA256 (the master never leaves the process) and stores only the public key on-chain.
3. User texts `/up 70k 15m 100`. The bot signs `(market_key || nonce_le)`, builds a PTB calling `updown::account::place_bet` whose returned `Coin<DUSDC>` is piped directly into `predict::mint`, sponsors gas through Enoki, and replies with the tx link.
4. Move enforces the daily cap on-chain. Bot also enforces it in Postgres before submitting (saves wasted gas).
5. Every 30s–1m, the **settler** cron claims expired open positions atomically (`UPDATE ... RETURNING ... FOR UPDATE SKIP LOCKED`), batches one PTB per manager calling `predict::redeem_permissionless`, parses `PositionSettled` events, updates the streak rollup, and DMs the user a P&L card.
6. At 3 / 7 / 30 wins in a row, settler enqueues a streak NFT job. A separate worker mints `StreakNft` (Bronze / Silver / Gold) to the user's zkLogin address.
7. The **indexer-follower** tails Sui events into Postgres so the bot's `/leader` and `/balance` queries are fast.
8. Front of house: a Telegram bot that feels like one message away from a trade, plus a marketing site for the project itself.

---

## Tech stack

| Layer | Stack |
|---|---|
| On-chain | Sui Move 2024, DeepBook Predict, Block Scholes oracle, dUSDC quote asset |
| Telegram | grammY (TypeScript), Express webhooks, `@grammyjs/conversations`, `@grammyjs/transformer-throttler` |
| zkLogin / sponsored gas | Enoki SDK |
| Mini App | Next.js 16 (App Router), React 19, Tailwind v4 |
| Marketing site | Next.js 16, Tailwind v4, shadcn/ui base, Geist + JetBrains Mono |
| Database | Postgres (Neon) |
| Settler / Indexer | Node.js + `@mysten/sui` |
| Validation / safety | zod, `crypto.timingSafeEqual`, `p-limit` |
| Logging | pino |
| Deploy | Vercel (web, miniapp, settler cron); long-running worker for indexer / sub-minute settler |

---

## Getting started

### Prerequisites

- Node.js 20+ (24 in production)
- A Postgres instance (Neon free tier works fine)
- [`sui` CLI](https://docs.sui.io/guides/developer/getting-started/sui-install) for the Move package
- A Telegram bot token from [@BotFather](https://t.me/BotFather)
- An [Enoki](https://portal.enoki.mystenlabs.com) project with testnet API key
- A funded Sui testnet keypair (faucet at `https://faucet.testnet.sui.io`)

### One-time setup

```bash
git clone <this-repo> updown
cd updown
cp .env.example .env  # then fill in BOT_TOKEN, ENOKI_API_KEY, etc.

# Symlink the root .env into each service so they all share secrets
for p in packages/bot packages/miniapp packages/settler packages/indexer-follower; do
  ln -sf ../../.env "$p/.env"
done

# Install per-package
(cd packages/shared && npm install && npm run build)
(cd packages/bot && npm install)
(cd packages/miniapp && npm install)
(cd packages/settler && npm install)
(cd packages/indexer-follower && npm install)
(cd packages/web && npm install)
```

### Publish the Move package

```bash
cd move
sui move build
sui move test
sui client publish --gas-budget 200000000
# copy the package id into .env as UPDOWN_PACKAGE_ID
```

### Run locally

```bash
# Marketing site
(cd packages/web && npm run dev)            # http://localhost:3000

# Mini App
(cd packages/miniapp && PORT=3001 npm run dev)

# Bot (needs a public webhook — use ngrok in dev)
ngrok http 3002
(cd packages/bot && npm run dev)

# Settler — single tick locally
(cd packages/settler && npx tsx -e "import('./src/run.js').then(m => m.runOnce())")

# Indexer-follower
(cd packages/indexer-follower && npm run dev)
```

### Required env vars

`DATABASE_URL`, `SUI_RPC_URL`, `PREDICT_PACKAGE_ID`, `PREDICT_OBJ_ID`, `DUSDC_TYPE`, `UPDOWN_PACKAGE_ID`, `BOT_TOKEN`, `WEBHOOK_SECRET`, `ENOKI_API_KEY`, `BOT_SIGNER_PRIVKEY`, `MASTER_DELEGATION_SECRET`, `WEB_URL`, `LOG_LEVEL`, `PORT`, `CRON_SECRET`.

---

## Bot commands

| Command | Description |
|---|---|
| `/start` | Open the Mini App and onboard with Google |
| `/up <strike> <window> <amount>` | Bet BTC closes above strike at expiry |
| `/down <strike> <window> <amount>` | Bet BTC closes below strike at expiry |
| `/balance` | Open positions + remaining daily cap |
| `/streak` | Current and best streak + minted NFTs |
| `/leader` | Group leaderboard for the week |
| `/copy <user> <amount>` | Mirror another user's next 24h of bets, capped |

Strike formats: `70k`, `70K`, `70.5k`, `70000`. Window: `15m | 1h | 1d | 1w`.

---

## Status

- **Move**: testnet-published; mainnet awaits DeepBook Predict mainnet launch (project will redeploy day one).
- **Bot / Mini App / Settler / Indexer**: feature-complete, schema unified, end-to-end smoke tests pass against Neon.
- **Marketing site**: production build clean; deployed to Vercel.

### Known follow-ups

- Move on-chain re-binding of `msg_hash` to `(market, amount, expiry)` (currently bot-supplied)
- Move test coverage for `rotate_delegated_pubkey`, `unrevoke`, `set_cap`, replay-nonce, streak module
- pino redaction for `BOT_TOKEN`, `BOT_SIGNER_PRIVKEY`, `ENOKI_API_KEY`
- KMS / HSM custody of the bot signer master
- CSP / HSTS / Referrer-Policy headers on web + miniapp
- Sentry / OTEL counters for the services

---

## License

MIT. See `LICENSE` for full text. Use it freely; no warranty.
