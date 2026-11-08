'use strict';
// npm test — the Docker web server (server/index.cjs): routing of api/ functions, clean URLs, closed files.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const { createServer, isDenied } = require('../server/index.cjs');

let srv, base;
test.before(async () => {
  srv = createServer(root);
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  base = 'http://127.0.0.1:' + srv.address().port;
});
test.after(() => srv.close());

const get = (p, init) => fetch(base + p, { redirect: 'manual', ...init });

test('pages and clean URLs', async () => {
  assert.equal((await get('/')).status, 200);
  assert.equal((await get('/oferta')).status, 200);
  const r = await get('/oferta.html');
  assert.equal(r.status, 308);
  assert.equal(new URL(r.headers.get('location'), base).pathname, '/oferta');
  assert.equal((await get('/__health')).status, 200);
  assert.equal((await get('/no-such-page')).status, 404);
});

test('service files and folders are never served', async () => {
  for (const p of ['/api/lead.js', '/package.json', '/package-lock.json', '/vercel.json', '/test/server.test.js', '/server/index.cjs',
    '/db/migrations/001_leads.sql', '/Dockerfile', '/compose.yaml', '/docker.env', '/.git/config', '/docs/BACKEND.md', '/README.md', '/utm-links.csv']) {
    assert.equal((await get(p)).status, 404, p);
  }
  assert.equal((await get('/..%2f..%2fetc/passwd')).status, 404);
  assert.equal(isDenied('/.well-known/security.txt'), false);
});

test('api functions: flat and nested routes, underscore folders are not routes', async () => {
  assert.equal((await get('/api/lead')).status, 405); // the function answers (POST only)
  assert.equal((await get('/api/_lib/env')).status, 404);
  assert.equal((await get('/api/nope')).status, 404);
  assert.equal((await get('/api/lead/../../etc/passwd')).status, 404);
  const nested = path.join(root, 'api', 'results');
  if (fs.existsSync(nested)) {
    // a nested function must be reached by POST: not the file server's 404, and not its "GET, HEAD only" 405
    const r = await get('/api/results/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: '{}' });
    assert.notEqual(r.status, 404);
    assert.notEqual(r.headers.get('allow'), 'GET, HEAD');
    assert.ok([400, 401, 403, 500].includes(r.status), 'the login function answered, got ' + r.status);
  }
});
