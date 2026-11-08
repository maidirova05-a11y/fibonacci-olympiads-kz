# Backend standard (api/)

Same layout and rules in atlantia-olympiads-kz and fibonacci-olympiads-kz. Only `api/_lib/site.js` differs
(origin allow-list, default pipeline, deal title, source text). Keep every other file identical in both repos.

## Layout

| File | Role |
|---|---|
| `api/lead.js` | Endpoint: HTTP flow only (method, origin/CORS, content type, size, honeypot, rate limit, call, respond) |
| `api/_lib/validate.js` | Input validation and sanitising (the only place that reads the request body fields) |
| `api/_lib/env.js` | Env validation, loaded lazily, never logs values |
| `api/_lib/bitrix.js` | The only module that talks to the CRM |
| `api/_lib/leads-db.js` | Optional Postgres copy of every lead (off without `DATABASE_URL`) |
| `api/_lib/ratelimit.js`, `http.js`, `log.js` | Shared helpers |
| `api/_lib/site.js` | Per-site config |

Files starting with `_` are not exposed as routes by Vercel. New endpoints: one file in `api/`, reuse `_lib`.
Leads and the results cabinet need no database on Vercel (see the Docker section below for the self-hosted setup with Postgres). If one is added: pooled connection string from env, parameterised queries only, schema as migrations.

## Rules

- Methods: `POST` and `OPTIONS` only. `Cache-Control: no-store` on every response.
- CORS and CSRF: `Origin` is required and must match `site.originPattern` (production hosts, this project's Vercel previews, localhost), otherwise 403. Allowed origin is echoed with `Vary: Origin`.
- Body: `application/json` only (415), max 16 KB (413), must be a JSON object (400).
- Validation: every field is type-checked, stripped of control characters and length-capped. Unknown fields are ignored. Only `http(s)` URLs are kept.
- Spam: hidden `website` honeypot (silent `200`), 5 requests / 10 min per address, same phone once per minute (429 + `Retry-After`). Limits are per warm instance (best effort); for a hard cap add a Vercel Firewall rate-limit rule. A failed CRM call frees the phone slot.
- Errors: always `{ "ok": false, "error": "<code>", "field"?: "...", "requestId": "..." }`; success is `{ "ok": true }`. The browser relies only on `ok` and `error`.

| Status | `error` | Meaning |
|---|---|---|
| 400 | `bad_request`, `name`, `phone` | malformed body / invalid field |
| 403 | `forbidden` | origin missing or not allowed |
| 405 | `method_not_allowed` | |
| 413 | `too_large` | |
| 415 | `unsupported_media_type` | |
| 429 | `rate_limited` | |
| 500 | `config`, `internal` | invalid env, unexpected error |
| 502 / 504 | `crm`, `crm_timeout` | Bitrix24 failed / timed out (4.5 s per call; `maxDuration` 15 s) |

- Logging: one JSON line per event (`level`, `msg`, `id`, `t`, ...). `id` equals the `X-Request-Id` response header. Never log names, phones, free text, the webhook URL or raw IPs (a 12-char hash is used).
- Secrets: only in Vercel env vars. Webhook value is checked for shape, never echoed.

## Environment

`BITRIX_WEBHOOK_URL` (required, secret, `https://<portal>.bitrix24.kz/rest/<user>/<code>/`);
optional `BITRIX_DEAL_CATEGORY_ID` (digits or `lead`), `BITRIX_DEAL_STAGE_ID`, `BITRIX_STATUS_ID`,
`BITRIX_SOURCE_ID`, `BITRIX_ASSIGNED_BY_ID` (digits). An invalid value returns 500 `config` and logs the variable name.

## Results cabinet (`api/results/*`, Fibonacci only)

Flow: `/results` → parent enters the e-mail → `request-password` mails a 6-digit code if the address is in the imported
results (the answer is the same 200 for any address, so the page cannot be used to check who took part) → `login`
(login = e-mail) accepts the account password or the code; signing in with the code makes it the account password and
signs out other sessions → HttpOnly, SameSite=Strict cookie scoped to `/api/results` (7 days, HMAC-signed) → `me`
returns the participants for that e-mail → the browser puts each name on the approved certificate design (canvas → PDF/PNG) → `change-password`
(needs the current one; signs out other sessions) → `logout`.

Protection: codes from the last three letters are accepted (mail apps group identical letters, so parents often type an earlier one); they live 48 h from the latest letter and share 10 tries, then they are deleted; requesting a code never changes the existing
password, so a stranger cannot reset or sign out a parent. Wrong passwords are counted *before* the check (parallel
requests cannot slip past): 10 per e-mail per 30 min, then `locked` — a fresh code from the mail still opens a locked
account. Wrong "current password" in `change-password` counts against the same limit. The one-letter-per-minute slot is
taken atomically (`SET NX EX`), the daily counter before sending. Logs carry an HMAC tag of the e-mail, never the address.
All endpoints follow the rules above (POST only, Origin check = CSRF protection, JSON ≤ 4 KB). Code: `api/_lib/results.js`
(flow), `auth.js` (scrypt hashes, sessions), `store.js` (Upstash Redis REST; Postgres `kv` table when `DATABASE_URL` is set), `mailer.js` (Resend).

Only e-mails from the «Почта» column of the results sheet get access; rows without it are skipped by the import and
listed in its output. One e-mail may have several children. Stored per participant: code, name, score, grade, school,
city, stage date, language — no phones, IIN or teacher data.

| Status | `error` | Meaning |
|---|---|---|
| 400 | `email`, `password`, `current`, `weak` | invalid field / wrong current password / new password < 6 chars or edge spaces |
| 401 | `credentials`, `auth` | wrong e-mail or password / no or expired session |
| 429 | `mail_wait`, `mail_daily`, `locked`, `rate_limited` | 1 letter/min and 5/day per e-mail; 10 wrong passwords per e-mail → 30 min lock (a new code still works); per-address limits |
| 502 / 503 | `mail`, `unavailable` | Resend / store failed |

Env (Vercel → Settings → Environment Variables):

- Upstash Redis: Vercel → Storage → Marketplace → Upstash for Redis → connect to the project; it adds
  `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`; both work).
- `RESEND_API_KEY` (`re_…`) and `MAIL_FROM`, e.g. `Fibonacci Olympiad <results@fibonacci-olympiads.kz>`; the domain must be
  verified in Resend (DNS records), otherwise letters are rejected.
- `RESULTS_SESSION_SECRET` — random string ≥ 32 chars (`node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`).
  Changing it signs everybody out.

Loading results: `vercel env pull .env.local`, then `npm run import-results -- "Результаты.xlsx"` (add `--dry` to only
check the sheet, `--add "ФИО|email|балл"` for an extra row). Columns are found by header (`Код участника`, `ФИО`,
`Результат`, `Город`, `Школа`, `Явка`, `Класс`, `Почта`, `Язык`); the stage date is the `17.10.2026, Астана` cell.
Re-importing replaces all results; accounts and passwords stay, except for addresses no longer in the sheet: their
results, account and pending code are deleted. Without the Upstash env the import writes to
`.data/dev-store.json` for `npm run dev`.

## Tests

`npm test` (Node 20+, no dependencies) runs `test/lead.test.js`, `test/leads-db.test.js` and `test/results.test.js` with a mocked `fetch`, a temp-file store (or Postgres with `TEST_DATABASE_URL`), a fake lead-DB pool and a captured mailer; no real CRM, Redis or mail is called.

## Own server (Docker + Postgres)

`docker compose up -d --build` (see `compose.yaml`): site + functions via `server/index.cjs` and a Postgres container; port `127.0.0.1:3107`,
HTTPS and the public domain come from the reverse proxy (nginx/Caddy). Everything stays on your server (no Upstash, no Vercel).
`DATABASE_URL` is set by `compose.yaml`; secrets go to `docker.env` (copy `docker.env.example`).

- `server/migrate.cjs` applies `db/migrations/*.sql` in order, once each (`schema_migrations`), before the server starts. Schema changes = a new numbered file.
- **Leads** (`001_leads.sql`, `leads-db.js`): a copy of every lead is saved before the CRM call, so it survives a CRM outage. Columns: name, phone, question, lang, page, referrer, utm, origin, `ip_hash` (12-char hash, never the address), `crm_status` (`pending` / `ok` / `failed`), `crm_id`, `crm_error`.
  Parameterised queries only, 1.5 s timeout, errors logged by SQLSTATE code only. The response contract is unchanged (a failed CRM call still returns 502; the lead stays as `failed`).
  Undelivered leads: `select id, created_at, name, phone, crm_error from leads where crm_status <> 'ok' order by id;`
- **Results cabinet** (`002_kv.sql`, `store.js` → `pgStore`): the same six operations as the Redis store (`get`, `set`, `del`, `setnx`, `incr`, `ttl`) on table `kv(k, v, expires_at)`;
  expired rows count as absent, `setnx`/`incr` are single atomic statements, the `incr` window is fixed from the first hit, `set` clears the TTL — exactly like Redis. Env: `RESULTS_SESSION_SECRET`, `RESEND_API_KEY`, `MAIL_FROM` (the letters are still sent by Resend).
- Loading results into the container: `docker compose cp "Результаты.xlsx" app:/tmp/r.xlsx` then `docker compose exec app node scripts/import-results.mjs /tmp/r.xlsx` (add `--dry` first). It writes to Postgres because `DATABASE_URL` is set. With `azhost`: `cd /opt/apps/<name> && docker compose -p <name> exec app …`.
- Moving data from Upstash Redis: re-run the import from the original results sheet (accounts/passwords are created again by parents via the e-mail code); nothing else needs migrating.
- Personal data (children's names, scores, parents' e-mails, lead phones) lives only in this database: keep the server in Kazakhstan, restrict access, back it up (`azhost backup`), delete what is no longer needed and describe it in the privacy policy.
- Tests on Postgres: `TEST_DATABASE_URL=postgres://… npm test` (apply `server/migrate.cjs` first) runs the whole results suite and `test/kv-pg.test.js` on the real store.
