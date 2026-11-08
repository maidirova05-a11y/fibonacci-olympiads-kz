-- Копия каждой заявки с сайта (кнопка «Получить консультацию»). Основной канал — Bitrix24;
-- таблица нужна, чтобы заявка не терялась при сбое CRM и чтобы её можно было выгрузить.
CREATE TABLE IF NOT EXISTS leads (
  id          bigserial PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  name        text NOT NULL,
  phone       text NOT NULL,
  question    text NOT NULL DEFAULT '',
  lang        text NOT NULL DEFAULT 'ru',
  page        text NOT NULL DEFAULT '',
  referrer    text NOT NULL DEFAULT '',
  utm         jsonb NOT NULL DEFAULT '{}'::jsonb,
  origin      text NOT NULL DEFAULT '',
  ip_hash     text NOT NULL DEFAULT '',
  -- pending: ещё не отправлена в CRM; ok: создана в Bitrix24; failed: CRM не приняла (см. crm_error)
  crm_status  text NOT NULL DEFAULT 'pending' CHECK (crm_status IN ('pending', 'ok', 'failed')),
  crm_id      text,
  crm_error   text
);
CREATE INDEX IF NOT EXISTS leads_created_idx ON leads (created_at DESC);
CREATE INDEX IF NOT EXISTS leads_crm_open_idx ON leads (created_at) WHERE crm_status <> 'ok';
