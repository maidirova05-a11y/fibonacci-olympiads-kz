// Run after editing anything in assets/*.js or assets/vendor/*.js:  node scripts/version-assets.mjs
// Every page loads its scripts as /assets/x.js?v=<content hash>; vercel.json serves versioned URLs as
// immutable for a year, so a changed file must get a new hash or visitors keep the old copy.
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
const root = new URL('..', import.meta.url).pathname;
const hash = p => createHash('sha256').update(readFileSync(root + p)).digest('hex').slice(0, 10);
for (const page of ['index.html', 'polozhenie.html', 'oferta.html']) {
  const before = readFileSync(root + page, 'utf8');
  const after = before.replace(/src="\/(assets\/[\w/.-]+\.js)(?:\?v=\w+)?"/g, (_, p) => `src="/${p}?v=${hash(p)}"`);
  if (after !== before) { writeFileSync(root + page, after); console.log('updated', page); }
}
