-- Хранилище кабинета результатов (api/results/*): участники, аккаунты, коды входа, счётчики попыток.
-- Те же шесть операций, что раньше выполнял Upstash Redis (см. api/_lib/store.js, pgStore).
CREATE TABLE IF NOT EXISTS kv (
  k          text PRIMARY KEY,
  v          text NOT NULL,
  expires_at timestamptz
);
CREATE INDEX IF NOT EXISTS kv_expires_idx ON kv (expires_at) WHERE expires_at IS NOT NULL;
