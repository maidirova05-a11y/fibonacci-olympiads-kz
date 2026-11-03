'use strict';
// The ONLY file that differs between the Atlantia and Fibonacci repos.
module.exports = {
  // exact production hosts (apex + www), Vercel project slug for previews, local dev
  originPattern: /^https:\/\/((www\.)?fibonacci-olympiads\.kz|fibonacci-olympiad-kz(-[a-z0-9-]+)?\.vercel\.app)$|^http:\/\/localhost(:\d+)?$/,
  defaultDealCategory: '21', // ATLANTIA-FIMO pipeline (shared by both sites)
  dealTitlePrefix: 'FIMO: консультация — ',
  sourceDescription: 'Сайт fibonacci-olympiads.kz — кнопка «Получить консультацию»',
};
