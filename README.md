# Fibonacci International Math Olympiad — Kazakhstan

Landing site: https://fibonacci-olympiads.kz

Static site (HTML/CSS/JS, no build step), hosted on Vercel.

- `index.html` — landing page (RU/KZ/EN, language switch in `assets/app.js`)
- `polozhenie.html` — official regulations (pages in `assets/docs/`, PDFs for download)
- `oferta.html` — public offer
- `assets/app.js` — translations, intro and scroll animations, registration link (`REG_URL`)
- `assets/metrika.js` — Yandex Metrica (set `YM_ID`)
- `api/lead.js` — «Получить консультацию» form → Bitrix24. Vercel env vars: `BITRIX_WEBHOOK_URL` (required, keep it secret); requests become a contact + deal in pipeline 21 (ATLANTIA-FIMO, shared with atlantia-olympiads.kz), `BITRIX_DEAL_CATEGORY_ID` overrides it (`lead` = create a lead); optional `BITRIX_DEAL_STAGE_ID`, `BITRIX_STATUS_ID`, `BITRIX_SOURCE_ID`, `BITRIX_ASSIGNED_BY_ID`. The UTM tags of the visit (`utm_source` … `utm_term`) go into the deal/lead `UTM_*` fields, and the page URL and external referrer (the site the visitor came from) into `COMMENTS`. Requests are accepted only from fibonacci-olympiads.kz, this project's Vercel URLs (`fibonacci-olympiad-kz[-…].vercel.app`) and localhost; bodies over 16 KB get 413; each Bitrix call times out after 4.5 s (`maxDuration` 15 s in `vercel.json`)
- `results.html` + `assets/results.js` + `api/results/*` — «Результаты»: parents get a 6-digit code by e-mail (only addresses from the results sheet; valid 48 h), sign in, see the score and download the participation certificate (PDF/PNG, KZ/RU/EN, drawn in the browser); the password can be changed. Load results with `npm run import-results -- "Результаты.xlsx"`. Setup and env: `docs/BACKEND.md` → «Results cabinet»
- `npm run dev` — local preview with the API on http://localhost:3000 (results cabinet works without Redis/Resend: local store in `.data/`, letters printed to the console)
- `docs/BACKEND.md` — api/ standard (layers, validation, error format, rate limits, env); `npm test` runs the API tests
- `vercel.json` — security headers, caching, redirects

Deploy: `vercel deploy --prod`

## Performance

- **Images**: every local raster on the pages is a `<picture>` — AVIF candidates first, WebP fallback, `srcset`/`sizes` by rendered width (`name-<width>.avif|webp` next to the original; the original `.webp` stays the largest WebP candidate and the `src`). Each picture `img` keeps `width`/`height` plus an inline `aspect-ratio` equal to the original, so a smaller candidate can never change layout. When an image changes, regenerate its variants at the same widths (AVIF ≈ q68, WebP q82) or drop the `<picture>` for it. Regulation scans (`assets/docs`): 640/940/1100 px, only the first page of the visible language loads eagerly (`fetchpriority="high"`), the other language's first page is lazy.
- **Unsplash photos** stay on images.unsplash.com (imgix `auto=format` already serves AVIF/WebP), now with `srcset` (`w=` steps) and `sizes`, so phones fetch 480–800 px instead of 900–1400 px.
- **Promo video**: `preload="none"`; the poster is attached by `assets/app.js` only when the video gets within 800 px of the viewport (`data-poster`; a `<noscript>` style shows it without JS).
- **Fonts** are self-hosted in `assets/fonts` (the exact Google Fonts files and `@font-face`/`unicode-range` rules, inlined in each page's `<head>`; the files the first screen needs are preloaded). The CSP no longer allows fonts.googleapis.com / fonts.gstatic.com.
- **Intro**: plays once per tab session; returning to `/` from a subpage (sessionStorage `fib-intro`) shows the finished hero immediately. A reload still replays it.
- **Caching**: pages load scripts as `/assets/x.js?v=<content hash>` and `vercel.json` serves versioned scripts and `assets/fonts` as immutable for a year (unversioned `.js` URLs stay `must-revalidate`). **After editing any `assets/*.js` run `node scripts/version-assets.mjs`**, otherwise visitors keep the old file.

## SEO

- `index.html` `<head>`: title, description, keywords, Open Graph/Twitter and JSON-LD (`Organization`, `WebSite`, `WebPage`, `EducationEvent` for each stage, `FAQPage`). Subpages carry `BreadcrumbList`.
- `FAQPage` must match the visible «Частые вопросы» block — when you change a question in the HTML, change it in the JSON-LD too (and its kk/en translation in `assets/app.js`).
- Each new season: update the dates in the title, description, `EducationEvent` (`startDate`/`endDate`, price) and FAQ, then bump `<lastmod>` in `sitemap.xml` and re-submit the sitemap in Yandex Webmaster and Google Search Console.
- `robots.txt` tells Yandex to ignore UTM parameters (`Clean-param`), so links from `utm-links.csv` don't create duplicate pages.
- Keyword core (`<meta name="keywords">`, ~70 phrases RU → KK → EN) is built from competitor analysis; add only phrases backed by facts on the page (maths only, grades 3–11(12), fee 25 000 ₸, finals in Turkey/Italy). `assets/app.js` switches `title`, `description`, `keywords` and og/twitter tags per language (`T.title`, `T.desc`, `T.keywords`); keep each title ≤ 70 and description ≤ 160 characters.
- `polozhenie.html` has its own `keywords`; `llms.txt` at the root summarises the site for AI crawlers — update it together with the season facts.
