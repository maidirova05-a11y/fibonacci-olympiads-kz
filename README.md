# Fibonacci International Math Olympiad — Kazakhstan

Landing site: https://fibonacci-olympiads.kz

Static site (HTML/CSS/JS, no build step), hosted on Vercel.

- `index.html` — landing page (RU/KZ/EN, language switch in `assets/app.js`)
- `polozhenie.html` — official regulations (pages in `assets/docs/`, PDFs for download)
- `oferta.html` — public offer
- `assets/app.js` — translations, intro and scroll animations, registration link (`REG_URL`)
- `assets/metrika.js` — Yandex Metrica (set `YM_ID`)
- `api/lead.js` — «Получить консультацию» form → Bitrix24. Vercel env vars: `BITRIX_WEBHOOK_URL` (required, keep it secret); requests become a contact + deal in pipeline 21 (ATLANTIA-FIMO, shared with atlantia-olympiads.kz), `BITRIX_DEAL_CATEGORY_ID` overrides it (`lead` = create a lead); optional `BITRIX_DEAL_STAGE_ID`, `BITRIX_STATUS_ID`, `BITRIX_SOURCE_ID`, `BITRIX_ASSIGNED_BY_ID`
- `vercel.json` — security headers, caching, redirects

Deploy: `vercel deploy --prod`
