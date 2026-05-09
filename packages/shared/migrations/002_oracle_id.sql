-- 002_oracle_id — guarantee positions.oracle_id exists.
-- 001_init already declares this column in fresh deployments; this migration
-- is the explicit upgrade path for any environment that ran an earlier 001.
ALTER TABLE positions ADD COLUMN IF NOT EXISTS oracle_id TEXT;
INSERT INTO schema_migrations (version) VALUES ('002_oracle_id') ON CONFLICT (version) DO NOTHING;
