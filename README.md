# Fibonacci International Math Olympiad — Kazakhstan

Landing site: https://fibonacci-olympiads.kz

Static site (HTML/CSS/JS, no build step), hosted on Vercel.

- `index.html` — landing page (RU/KZ/EN, language switch in `assets/app.js`)
- `polozhenie.html` — official regulations (pages in `assets/docs/`, PDFs for download)
- `oferta.html` — public offer
- `assets/app.js` — translations, intro and scroll animations, registration link (`REG_URL`)
- `assets/metrika.js` — Yandex Metrica (set `YM_ID`)
- `api/lead.js` — «Получить консультацию» form → Bitrix24. Vercel env vars: `BITRIX_WEBHOOK_URL` (required, keep it secret); requests become a contact + deal in pipeline 21 (ATLANTIA-FIMO, shared with atlantia-olympiads.kz), `BITRIX_DEAL_CATEGORY_ID` overrides it (`lead` = create a lead); optional `BITRIX_DEAL_STAGE_ID`, `BITRIX_STATUS_ID`, `BITRIX_SOURCE_ID`, `BITRIX_ASSIGNED_BY_ID`
- `results.html` + `assets/results.js` + `api/results.js` — participant results, see below
- `vercel.json` — security headers, caching, redirects

## Results (`/results`)

The participant enters ФИО, ИИН, phone and email → a 6-digit code is emailed → after the code the page shows their rows from the results table. No database: the code check uses an HMAC-signed token.

Results table (Google Sheet), first row is headers:

| ИИН | ФИО | Email | Телефон | Класс | Этап | Баллы | Место | Диплом | _комментарий |
|---|---|---|---|---|---|---|---|---|---|

- Required: `ИИН` and `ФИО` (or `Фамилия` + `Имя` [+ `Отчество`]). Kazakh/English headers also work (`ЖСН`, `Аты-жөні`, `IIN`, `Full name`…).
- `Email`: if filled, the participant must enter the same address (case doesn't matter) — otherwise anyone who knows a ИИН and name could get the results. Leave it filled.
- Every other column is shown to the participant as is (`Класс`, `Баллы`, `Место`, `Диплом`…), except `Телефон`, `ИИН`, `Email` and columns starting with `_`. An `https://…` value (a diploma or certificate link) becomes an «Открыть» link.
- Several rows with one ИИН (several stages) are all shown. Name check: surname + name in any order, patronymic optional.
- Changes in the sheet show up within a minute.

Vercel env vars:
- `RESULTS_SECRET` — random string, 24+ chars (`openssl rand -base64 32`)
- `RESEND_API_KEY`, `RESULTS_MAIL_FROM` — email via [resend.com](https://resend.com): add the domain fibonacci-olympiads.kz there (DNS records), then e.g. `Fibonacci Olympiad <results@fibonacci-olympiads.kz>`
- The sheet, private (recommended): create a Google Cloud service account, enable the Google Sheets API, put its JSON key in `GOOGLE_SERVICE_ACCOUNT_JSON`, share the sheet with the service account's email (Viewer), set `RESULTS_SHEET_ID` (from `…/spreadsheets/d/<id>/edit`); optional `RESULTS_SHEET_RANGE` = sheet name (default: the first sheet)
- or simpler: `RESULTS_CSV_URL` = File → Share → Publish to web → CSV. Anyone who gets this link sees the whole table with ИИН, so keep it secret.
- Rate limits (recommended): connect Upstash Redis from the Vercel Marketplace — it sets `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Then: 5 wrong codes per request, 5 codes per ИИН and 30 per IP per hour. Without it the page works but code guessing isn't limited.

Deploy: `vercel deploy --prod`

## SEO

- `index.html` `<head>`: title, description, keywords, Open Graph/Twitter and JSON-LD (`Organization`, `WebSite`, `WebPage`, `EducationEvent` for each stage, `FAQPage`). Subpages carry `BreadcrumbList`.
- `FAQPage` must match the visible «Частые вопросы» block — when you change a question in the HTML, change it in the JSON-LD too (and its kk/en translation in `assets/app.js`).
- Each new season: update the dates in the title, description, `EducationEvent` (`startDate`/`endDate`, price) and FAQ, then bump `<lastmod>` in `sitemap.xml` and re-submit the sitemap in Yandex Webmaster and Google Search Console.
- `robots.txt` tells Yandex to ignore UTM parameters (`Clean-param`), so links from `utm-links.csv` don't create duplicate pages.
