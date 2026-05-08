-- Up/Down — unified Postgres schema
-- Single source of truth for bot, settler, indexer-follower, and miniapp.
-- All write paths go through these tables. Idempotent (safe to run multiple times).

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  applied_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- users — one row per Telegram user, links to their on-chain BettingAccount
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  telegram_user_id BIGINT PRIMARY KEY,
  sui_address TEXT NOT NULL,
  account_id TEXT NOT NULL,                 -- BettingAccount object id
  owner_cap_id TEXT NOT NULL,
  predict_manager_id TEXT NOT NULL,
  oracle_id TEXT,                            -- BTC oracle id; resolved post-onboard
  delegated_pubkey TEXT NOT NULL,            -- base64 ed25519 pk
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS users_sui_address_idx ON users (sui_address);
CREATE INDEX IF NOT EXISTS users_account_id_idx ON users (account_id);

-- ---------------------------------------------------------------------------
-- positions — every bet, opened by bot, settled by settler
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS positions (
  id TEXT PRIMARY KEY,                       -- "{tx_digest}:{event_seq}" or "{tx_digest}:mint"
  telegram_user_id BIGINT NOT NULL,
  sui_address TEXT,
  account_id TEXT,
  predict_manager_id TEXT,
  betting_account_id TEXT,
  sui_tx_digest TEXT,
  market_key TEXT NOT NULL,                  -- 32-byte hex of (asset, expiry, strike, is_up)
  oracle_id TEXT,
  expiry_ms BIGINT NOT NULL,
  strike_micros BIGINT,                      -- strike * 1e6 (display); on-chain uses 1e9
  is_up BOOLEAN NOT NULL,
  stake_micros BIGINT NOT NULL,              -- dUSDC * 1e6
  status TEXT NOT NULL,                      -- 'open' | 'settling' | 'settled' | 'cancelled'
  payout_micros BIGINT,
  won BOOLEAN,
  opened_at TIMESTAMPTZ DEFAULT NOW(),
  settled_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS positions_user_opened_idx
  ON positions (telegram_user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS positions_status_expiry_idx
  ON positions (status, expiry_ms);
CREATE INDEX IF NOT EXISTS positions_manager_idx
  ON positions (predict_manager_id);

-- ---------------------------------------------------------------------------
-- streaks — per-user current/best streak; updated by settler on each settlement
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS streaks (
  telegram_user_id BIGINT PRIMARY KEY,
  current_streak INT NOT NULL DEFAULT 0,
  best_streak INT NOT NULL DEFAULT 0,
  last_outcome TEXT,                         -- 'win' | 'loss'
  last_tier_minted INT NOT NULL DEFAULT -1,  -- -1=none, 0=bronze, 1=silver, 2=gold
  nft_obj_id TEXT,                           -- last minted NFT id
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- streak_mint_jobs — drained by settler, mints a StreakNft on-chain
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS streak_mint_jobs (
  id BIGSERIAL PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  recipient TEXT NOT NULL,                   -- sui_address
  tier INT NOT NULL,                         -- 0|1|2
  wins INT NOT NULL,
  account_id TEXT NOT NULL,
  image_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',    -- 'pending' | 'completed' | 'failed'
  attempts INT NOT NULL DEFAULT 0,
  error TEXT,
  sui_tx_digest TEXT,
  nft_obj_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS streak_mint_jobs_status_idx
  ON streak_mint_jobs (status, created_at);

-- ---------------------------------------------------------------------------
-- mini_app_sessions — short-lived tokens linking Telegram user to onboarding flow
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS mini_app_sessions (
  token TEXT PRIMARY KEY,
  telegram_user_id BIGINT NOT NULL,
  init_data_hash TEXT,                       -- HMAC-bound to a specific Telegram session
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ                    -- single-use; set when derive-pubkey succeeds
);

CREATE INDEX IF NOT EXISTS mini_app_sessions_user_idx
  ON mini_app_sessions (telegram_user_id);

-- ---------------------------------------------------------------------------
-- cursor — per-source event cursor for the indexer follower
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cursor (
  name TEXT PRIMARY KEY,                     -- 'updown-events:predict' | ':account' | ':streak'
  value TEXT NOT NULL,                       -- "{txDigest}:{eventSeq}"
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- oracle_health — last seen oracle update timestamp; used to detect staleness
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS oracle_health (
  oracle_id TEXT PRIMARY KEY,
  last_update_ms BIGINT NOT NULL,
  observed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ---------------------------------------------------------------------------
-- copy_rules — /copy <user> <amount> for 24h
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS copy_rules (
  follower_user_id BIGINT NOT NULL,
  leader_user_id BIGINT NOT NULL,
  stake_cap_micros BIGINT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (follower_user_id, leader_user_id)
);

-- ---------------------------------------------------------------------------
-- daily_volume — denormalized rollup; settler maintains, bot reads for cap check
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS daily_volume (
  telegram_user_id BIGINT NOT NULL,
  day DATE NOT NULL,
  total_stake_micros BIGINT NOT NULL DEFAULT 0,
  PRIMARY KEY (telegram_user_id, day)
);

INSERT INTO schema_migrations (version) VALUES ('001_init')
  ON CONFLICT (version) DO NOTHING;
