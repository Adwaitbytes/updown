# @updown/miniapp

Telegram Mini App for one-time zkLogin onboarding into Up/Down.

The app:

1. Receives a `?session=<token>` from the bot's deep link.
2. Runs zkLogin via Enoki (Google OIDC).
3. Derives a per-user delegated Ed25519 pubkey on the server (HKDF over a master secret salted by `telegram_user_id`) — the bot keeps the matching seed.
4. Builds a single sponsored PTB that creates a `PredictManager`, mints 25 dUSDC starter, and creates a `BettingAccount`.
5. POSTs `{ telegram_user_id, sui_address, account_id, owner_cap_id, predict_manager_id }` to the bot's `/miniapp/session` webhook.

The `/revoke` route lists the user's `BettingAccount`s and lets them call `account::revoke`.

## Scripts

```sh
npm install
npm run dev        # next dev (http://localhost:3000)
npm run build      # next build
npm run start      # next start
npm run typecheck  # tsc --noEmit
```

## Env vars

Copy `.env.example` to `.env.local` and fill in the values.

| Var | Purpose |
| --- | --- |
| `NEXT_PUBLIC_ENOKI_PUBLIC_KEY` | Enoki public API key (client) |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OIDC client id |
| `NEXT_PUBLIC_SUI_NETWORK` | `testnet` for the hackathon |
| `NEXT_PUBLIC_SUI_RPC_URL` | Sui RPC endpoint |
| `NEXT_PUBLIC_PREDICT_PACKAGE_ID` | DeepBook Predict package id |
| `NEXT_PUBLIC_PREDICT_OBJ_ID` | Predict shared object id |
| `NEXT_PUBLIC_DUSDC_TYPE` | Fully-qualified dUSDC coin type |
| `NEXT_PUBLIC_DUSDC_TREASURY_CAP_ID` | dev dUSDC TreasuryCap (testnet only) |
| `NEXT_PUBLIC_UPDOWN_PACKAGE_ID` | Up/Down Move package id |
| `NEXT_PUBLIC_BOT_WEBHOOK_URL` | Base URL of the bot service |
| `DATABASE_URL` | Postgres connection string |
| `ENOKI_API_KEY` | Enoki secret (server) |
| `MASTER_DELEGATION_SECRET` | 32+ random bytes for HKDF |
| `TELEGRAM_BOT_TOKEN` | Used to verify Telegram WebApp `initData` HMAC |

## Routes

- `/onboard?session=...` — main onboarding flow.
- `/revoke` — manage delegations.
- `/api/derive-pubkey?session=...` — server route that returns the base64 pubkey.
