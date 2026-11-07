// Local preview of the site + api/ functions, close to Vercel: clean URLs, vercel.json headers (CSP),
// req.body parsed as JSON, res.status().json(). No Redis/Resend needed: the results cabinet uses
// .data/dev-store.json and prints password e-mails to this console (and .data/dev-mail.log).
//
//   node scripts/import-results.mjs "Результаты.xlsx"     load results into the local store first
//   node scripts/dev-server.mjs [port]                     then open http://localhost:3000/results
import http from 'node:http';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join, extname, normalize } from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('..', import.meta.url));
const port = Number(process.argv[2]) || 3000;
const vercel = JSON.parse(readFileSync(join(root, 'vercel.json'), 'utf8'));
const globalHeaders = (vercel.headers.find((h) => h.source === '/(.*)') || { headers: [] }).headers
  .filter((h) => h.key !== 'Strict-Transport-Security')
  .map((h) => (h.key === 'Content-Security-Policy' ? { ...h, value: h.value.replace('; upgrade-insecure-requests', '') } : h));
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.avif': 'image/avif', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.pdf': 'application/pdf', '.mp4': 'video/mp4', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml' };

async function api(req, res, file) {
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  if (/^application\/json/i.test(req.headers['content-type'] || '')) {
    try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = raw; }
  } else req.body = raw;
  res.status = (c) => ((res.statusCode = c), res);
  res.json = (b) => { if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(b)); return res; };
  delete require.cache[file];
  await require(file)(req, res);
}

http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://localhost');
    let p = decodeURIComponent(url.pathname);
    if (p.startsWith('/api/')) {
      // only api/<name> or api/<dir>/<name> (letters, digits, dashes): no "_" helpers, no "..", no "\"
      const f = join(root, p.slice(1) + '.js');
      if (/^\/api(\/[a-z0-9-]+){1,2}$/i.test(p) && existsSync(f)) return await api(req, res, f);
      res.statusCode = 404; return res.end('not found');
    }
    for (const h of globalHeaders) res.setHeader(h.key, h.value);
    if (p === '/') p = '/index.html';
    let f = join(root, normalize(p));
    if (!f.startsWith(root) || /[\\/](\.|scripts|test|docs|api)([\\/]|$)/.test(f.slice(root.length - 1))) { res.statusCode = 404; return res.end('not found'); }
    if (!extname(f) && existsSync(f + '.html')) f += '.html';
    if (!existsSync(f) || !statSync(f).isFile()) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('Content-Type', TYPES[extname(f)] || 'application/octet-stream');
    res.end(readFileSync(f));
  } catch (e) {
    console.error(e);
    if (!res.headersSent) { res.statusCode = 500; res.end('error'); }
  }
}).listen(port, '127.0.0.1', () => console.log(`dev server: http://localhost:${port}/results`));
