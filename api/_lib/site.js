'use strict';
// The ONLY file that differs between the Atlantia and Fibonacci repos.
module.exports = {
  // exact production hosts (apex + www), the project's own vercel.app alias, this team's preview URLs
  // (fibonacci-olympiad-<hash|git-branch>-maidirova05-2314s-projects.vercel.app — only this team can create them), local dev
  originPattern: /^https:\/\/((www\.)?fibonacci-olympiads\.kz|fibonacci-olympiad-kz\.vercel\.app|fibonacci-olympiad-[a-z0-9-]+-maidirova05-2314s-projects\.vercel\.app)$|^http:\/\/localhost(:\d+)?$/,
  defaultDealCategory: '21', // ATLANTIA-FIMO pipeline (shared by both sites)
  dealTitlePrefix: 'FIMO: консультация — ',
  sourceDescription: 'Сайт fibonacci-olympiads.kz — кнопка «Получить консультацию»',
};
