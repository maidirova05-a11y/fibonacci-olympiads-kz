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
| `api/_lib/ratelimit.js`, `http.js`, `log.js` | Shared helpers |
| `api/_lib/site.js` | Per-site config |

Files starting with `_` are not exposed as routes by Vercel. New endpoints: one file in `api/`, reuse `_lib`.
There is no database. If one is added: pooled connection string from env, parameterised queries only, schema as migrations.

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

## Tests

`npm test` (Node 20+, no dependencies) runs `test/lead.test.js` with a mocked `fetch`; no real CRM is called.
