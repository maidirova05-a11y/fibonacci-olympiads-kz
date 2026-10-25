# Fibonacci International Math Olympiad — Kazakhstan

Landing site: https://fibonacci-olympiads.kz

Static site (HTML/CSS/JS, no build step), hosted on Vercel.

- `index.html` — landing page (RU/KZ/EN, language switch in `assets/app.js`)
- `polozhenie.html` — official regulations (pages in `assets/docs/`, PDFs for download)
- `oferta.html` — public offer
- `assets/app.js` — translations, intro and scroll animations, registration link (`REG_URL`)
- `assets/metrika.js` — Yandex Metrica (set `YM_ID`)
- `api/lead.js` — «Получить консультацию» form → Bitrix24. Vercel env vars: `BITRIX_WEBHOOK_URL` (required, keep it secret); requests become a contact + deal in pipeline 21 (ATLANTIA-FIMO, shared with atlantia-olympiads.kz), `BITRIX_DEAL_CATEGORY_ID` overrides it (`lead` = create a lead); optional `BITRIX_DEAL_STAGE_ID`, `BITRIX_STATUS_ID`, `BITRIX_SOURCE_ID`, `BITRIX_ASSIGNED_BY_ID`. The UTM tags of the visit (`utm_source` … `utm_term`) go into the deal/lead `UTM_*` fields, and the page URL and external referrer (the site the visitor came from) into `COMMENTS`. Requests are accepted only from fibonacci-olympiads.kz, this project's Vercel URLs (`fibonacci-olympiad-kz[-…].vercel.app`) and localhost; bodies over 16 KB get 413; each Bitrix call times out after 4.5 s (`maxDuration` 15 s in `vercel.json`)
- `vercel.json` — security headers, caching, redirects

Deploy: `vercel deploy --prod`

## SEO

- `index.html` `<head>`: title, description, keywords, Open Graph/Twitter and JSON-LD (`Organization`, `WebSite`, `WebPage`, `EducationEvent` for each stage, `FAQPage`). Subpages carry `BreadcrumbList`.
- `FAQPage` must match the visible «Частые вопросы» block — when you change a question in the HTML, change it in the JSON-LD too (and its kk/en translation in `assets/app.js`).
- Each new season: update the dates in the title, description, `EducationEvent` (`startDate`/`endDate`, price) and FAQ, then bump `<lastmod>` in `sitemap.xml` and re-submit the sitemap in Yandex Webmaster and Google Search Console.
- `robots.txt` tells Yandex to ignore UTM parameters (`Clean-param`), so links from `utm-links.csv` don't create duplicate pages.
- Keyword core (`<meta name="keywords">`, ~70 phrases RU → KK → EN) is built from competitor analysis; add only phrases backed by facts on the page (maths only, grades 3–11(12), fee 25 000 ₸, finals in Turkey/Italy). `assets/app.js` switches `title`, `description`, `keywords` and og/twitter tags per language (`T.title`, `T.desc`, `T.keywords`); keep each title ≤ 70 and description ≤ 160 characters.
- `polozhenie.html` has its own `keywords`; `llms.txt` at the root summarises the site for AI crawlers — update it together with the season facts.
