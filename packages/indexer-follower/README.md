# @updown/indexer-follower

Long-running worker that tails Sui events from the Predict module and the
Up/Down package into Postgres so the leaderboard and history queries
don't hit the RPC on every read.

## Workflow

1. Subscribe via `suix_subscribeEvent` filtered to:
   - `predict::predict` (PositionMinted, PositionSettled, OracleSVIUpdated)
   - `updown::account` (AccountCreated)
   - `updown::streak` (StreakMinted)
2. Route each event by type, upserting into:
   - `positions` — opens, settlements, payouts.
   - `oracle_health` — last update per oracle id.
   - `streaks` — NFT obj id and tier.
3. Persist event cursor in the `cursor` table; resume from it on restart.
4. Heartbeat to log every 60s.

If WebSocket subscription is unavailable on the configured fullnode, the
process automatically falls back to `suix_queryEvents` cursor pagination
(`src/poller.ts`).

## Scripts

```sh
npm install
npm run dev        # tsx watch src/run.ts
npm run build      # tsc -p tsconfig.json
npm run start      # node dist/run.js
npm run poll       # force the polling fallback
npm run typecheck  # tsc --noEmit
```

## Env vars

| Var | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `SUI_RPC_URL` | Sui RPC endpoint (must support WS for streaming) |
| `PREDICT_PACKAGE_ID` | DeepBook Predict package id |
| `UPDOWN_PACKAGE_ID` | Up/Down Move package id |
| `START_CURSOR` | Optional `<txDigest>:<eventSeq>` to seed cursor table |
| `POLL_INTERVAL_MS` | Polling fallback cadence (default 2000) |

## Postgres schema (sketch)

```sql
CREATE TABLE positions (
  id              text PRIMARY KEY,
  market_key      text NOT NULL,
  oracle_id       text,
  expiry_ms       bigint,
  strike          text,
  is_up           boolean,
  account_id      text,
  sui_address     text,
  status          text NOT NULL DEFAULT 'open',
  opened_at       timestamptz NOT NULL DEFAULT NOW(),
  settled_at      timestamptz,
  payout_micros   numeric,
  won             boolean
);

CREATE TABLE oracle_health (
  oracle_id       text PRIMARY KEY,
  last_update_ms  bigint NOT NULL,
  observed_at     timestamptz NOT NULL DEFAULT NOW()
);

CREATE TABLE streaks (
  telegram_user_id   text PRIMARY KEY,
  current_streak     int NOT NULL DEFAULT 0,
  best_streak        int NOT NULL DEFAULT 0,
  last_tier_minted   int NOT NULL DEFAULT 0,
  nft_obj_id         text
);

CREATE TABLE cursor (
  name        text PRIMARY KEY,
  value       jsonb NOT NULL,
  updated_at  timestamptz NOT NULL DEFAULT NOW()
);
```
