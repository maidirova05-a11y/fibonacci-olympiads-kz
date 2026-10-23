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

The participant enters ФИО, ИИН, phone and email. They are checked against the answers of the registration Google Form (`REG_URL`), then a 6-digit code is emailed, and after the code the page shows the participant's rows from the results tab. No database: the code check uses an HMAC-signed token.

One spreadsheet, two tabs:
1. **Form answers** — Google Form → Responses → «Link to Sheets». Leave it as the first tab and don't rename the questions' columns. Columns are found by the question text: ИИН / ЖСН, ФИО / Фамилия, имя / Аты-жөні, почта / email, телефон / WhatsApp. The participant's ФИО and ИИН win over a parent's or teacher's («ФИО родителя», «ФИО учителя» are skipped). Every email and phone column of the row counts; a filled email and phone must match what is typed (phone: last 10 digits, so +7 / 8 / spaces don't matter). Name: surname + name in any order, patronymic optional.
2. **Результаты** — added by the organisers after the olympiad:

| ИИН | ФИО | Класс | Этап | Баллы | Место | Диплом | _комментарий |
|---|---|---|---|---|---|---|---|

   Only `ИИН` is required. Every other column is shown as is, except ФИО, email, phone and columns starting with `_`. An `https://…` value (a diploma or certificate link) becomes an «Открыть» link. Several rows with one ИИН (several stages) are all shown. A registered participant without a results row sees «результаты ещё не опубликованы».

Changes in the sheet show up within a minute.

Vercel env vars:
- `RESULTS_SECRET` — random string, 24+ chars (`openssl rand -base64 32`)
- `RESEND_API_KEY`, `RESULTS_MAIL_FROM` — email via [resend.com](https://resend.com): add the domain fibonacci-olympiads.kz there (DNS records), then e.g. `Fibonacci Olympiad <results@fibonacci-olympiads.kz>`
- The spreadsheet, private (recommended): create a Google Cloud service account, enable the Google Sheets API, put its JSON key in `GOOGLE_SERVICE_ACCOUNT_JSON`, share the spreadsheet with the service account's email (Viewer), set `REG_SHEET_ID` (from `…/spreadsheets/d/<id>/edit`). Optional: `REG_SHEET_RANGE` (form answers tab, default the first tab), `RESULTS_SHEET_ID` (if results are in another spreadsheet), `RESULTS_SHEET_RANGE` (default `Результаты`)
- or simpler: `REG_CSV_URL` and `RESULTS_CSV_URL` = File → Share → Publish to web → the tab → CSV. Anyone who gets these links sees the tabs with ИИН, so keep them secret.
- Rate limits (recommended): connect Upstash Redis from the Vercel Marketplace — it sets `KV_REST_API_URL` / `KV_REST_API_TOKEN` (or `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`). Then: 5 wrong codes per request, 5 codes per ИИН and 30 per IP per hour. Without it the page works but code guessing isn't limited.

Deploy: `vercel deploy --prod`

## SEO

- `index.html` `<head>`: title, description, keywords, Open Graph/Twitter and JSON-LD (`Organization`, `WebSite`, `WebPage`, `EducationEvent` for each stage, `FAQPage`). Subpages carry `BreadcrumbList`.
- `FAQPage` must match the visible «Частые вопросы» block — when you change a question in the HTML, change it in the JSON-LD too (and its kk/en translation in `assets/app.js`).
- Each new season: update the dates in the title, description, `EducationEvent` (`startDate`/`endDate`, price) and FAQ, then bump `<lastmod>` in `sitemap.xml` and re-submit the sitemap in Yandex Webmaster and Google Search Console.
- `robots.txt` tells Yandex to ignore UTM parameters (`Clean-param`), so links from `utm-links.csv` don't create duplicate pages.
