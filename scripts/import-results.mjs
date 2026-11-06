// Loads olympiad results from the Excel sheet into the results cabinet store.
//
//   node --env-file=.env.local scripts/import-results.mjs "Результаты.xlsx"          production (Upstash)
//   node scripts/import-results.mjs "Результаты.xlsx"                                local .data/dev-store.json
//   … --dry                                    only print the summary, write nothing
//   … --add "ФИО|email|балл[|класс|школа|город]"   extra participant (repeatable), e.g. a test entry
//
// Get .env.local with `vercel env pull .env.local` (it holds the Upstash keys). The sheet named
// «Результаты» is read (or the first sheet); columns are found by their header text, so their order may
// change. A certificate is issued ONLY to the address in the «Почта» column (parent e-mail); rows without
// it, without a score or with «Явка» = 0 are skipped and listed. One e-mail may have several children.
// Re-running replaces the previous import completely (accounts and passwords are kept).
import { createRequire } from 'node:module';
import { readXlsx } from './lib/xlsx.mjs';

const require = createRequire(import.meta.url);
const store = require('../api/_lib/store.js');
const { normEmail, isEmail } = require('../api/_lib/auth.js');
const { key } = require('../api/_lib/results.js');

const args = process.argv.slice(2);
const dry = args.includes('--dry');
const adds = [];
let file = '';
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--add') adds.push(args[++i] || '');
  else if (args[i] !== '--dry') file = args[i];
}
if (!file) {
  console.error('usage: node scripts/import-results.mjs <file.xlsx> [--dry] [--add "ФИО|email|балл"]');
  process.exit(1);
}

const clean = (s) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2028\u2029]/g, ' ').replace(/\s+/g, ' ').trim();
// "КӨШЕР ДІНМҰХАМЕД" → "Көшер Дінмұхамед"; mixed-case names are left as typed.
const nameCase = (s) =>
  s === s.toUpperCase() && /\p{Lu}{2}/u.test(s)
    ? s.toLowerCase().replace(/(^|[\s\-(])(\p{L})/gu, (m, a, b) => a + b.toUpperCase())
    : s;
const langOf = (s) => (/қазақ|казах|kazakh/i.test(s) ? 'kk' : /англ|english/i.test(s) ? 'en' : 'ru');

const { sheets } = readXlsx(file);
const sheet = sheets.find((s) => /результат/i.test(s.name)) || sheets[0];
const [header, ...rows] = sheet.rows;
const col = (re) => Object.keys(header).find((k) => re.test(clean(header[k])));
const C = {
  code: col(/^код/i), name: col(/^фио$/i), score: col(/^результат|^балл/i), city: col(/^город/i),
  school: col(/^школа/i), attended: col(/^явка/i), grade: col(/^класс/i), email: col(/^почта$/i), lang: col(/^язык/i),
};
for (const k of ['name', 'score', 'email']) if (!C[k]) { console.error(`column not found: ${k} (sheet «${sheet.name}»)`); process.exit(1); }

// Stage date/place ("17.10.2026, Астана") sits in an unnamed column; take it per row, else the most common.
const DATE = /^\d{2}\.\d{2}\.\d{4}(,\s*[^,]+)?$/;
const stageOf = (r) => Object.values(r).map(clean).find((v) => DATE.test(v)) || '';
const counts = {};
for (const r of rows) { const s = stageOf(r); if (s) counts[s] = (counts[s] || 0) + 1; }
const commonStage = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || '';

const byEmail = new Map();
const skipped = [];
const put = (email, p) => {
  if (!byEmail.has(email)) byEmail.set(email, []);
  byEmail.get(email).push(p);
};

for (const r of rows) {
  const name = nameCase(clean(r[C.name]));
  if (!name || (!r[C.code] && !r[C.score])) continue; // group headers like «Аудит 1 каз», empty rows
  const score = clean(r[C.score]);
  const email = normEmail(r[C.email]);
  const why = !email ? 'нет почты' : !isEmail(email) ? `некорректная почта «${clean(r[C.email])}»` : !/^\d+([.,]\d+)?$/.test(score) ? 'нет балла' : C.attended && clean(r[C.attended]) === '0' ? 'неявка' : '';
  if (why) { skipped.push(`${clean(r[C.code]) || '—'} ${name}: ${why}`); continue; }
  put(email, {
    code: clean(r[C.code]),
    name,
    score: Number(score.replace(',', '.')),
    grade: clean(r[C.grade]),
    school: clean(r[C.school]),
    city: clean(r[C.city]),
    stage: stageOf(r) || commonStage,
    lang: langOf(clean(r[C.lang])),
  });
}

for (const a of adds) {
  const [name, mail, score, grade = '', school = '', city = ''] = a.split('|').map(clean);
  const email = normEmail(mail);
  if (!name || !isEmail(email) || !/^\d+([.,]\d+)?$/.test(score || '')) { console.error(`bad --add «${a}», expected "ФИО|email|балл"`); process.exit(1); }
  put(email, { code: '', name: nameCase(name), score: Number(score.replace(',', '.')), grade, school, city: city || commonStage.split(',')[1]?.trim() || '', stage: commonStage, lang: 'ru' });
}

const total = [...byEmail.values()].reduce((n, l) => n + l.length, 0);
console.log(`лист «${sheet.name}»: ${total} участников, ${byEmail.size} адресов почты`);
for (const [e, l] of byEmail) if (l.length > 1) console.log(`  несколько детей на одной почте: ${e} — ${l.map((p) => p.name).join(', ')}`);
if (skipped.length) {
  console.log(`пропущено ${skipped.length} (сертификат не выдаётся, пока в таблице нет почты):`);
  for (const s of skipped) console.log('  ' + s);
}
if (dry) process.exit(0);

const db = store.get();
if (!db) { console.error('no store: set UPSTASH_REDIS_REST_URL/TOKEN (or KV_REST_API_URL/TOKEN)'); process.exit(1); }
const old = JSON.parse((await db.get('res:index')) || '[]');
for (const [email, list] of byEmail) await db.set(key.people(email), JSON.stringify(list));
const gone = old.filter((e) => !byEmail.has(e));
if (gone.length) await db.del(...gone.map(key.people));
await db.set('res:index', JSON.stringify([...byEmail.keys()]));
console.log(`записано в ${db.kind === 'redis' ? 'Upstash Redis' : '.data/dev-store.json'}; удалено старых адресов: ${gone.length}`);
