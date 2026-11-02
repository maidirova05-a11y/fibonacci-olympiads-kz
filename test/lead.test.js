'use strict';
// npm test
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.kz/rest/1/secretcode/';
const handler = require('../api/lead');
const limiter = require('../api/_lib/ratelimit');
const env = require('../api/_lib/env');
const site = require('../api/_lib/site');

const okOrigin = site.originPattern.source.includes('fibonacci') ? 'https://fibonacci-olympiads.kz' : 'https://atlantia-olympiads.kz';

function run(over = {}) {
  const req = {
    method: 'POST',
    headers: { origin: okOrigin, 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', ...over.headers },
    body: { name: 'Айгерим', phone: '+7 701 123 45 67', ...over.body },
    ...(over.method && { method: over.method }),
  };
  const out = { headers: {} };
  const res = {
    headersSent: false,
    setHeader: (k, v) => (out.headers[k.toLowerCase()] = v),
    status: (c) => ((out.status = c), res),
    json: (b) => ((out.body = b), res),
    end: () => res,
  };
  return handler(req, res).then(() => out);
}

test.beforeEach(() => {
  limiter.reset();
  env._reset();
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ result: 7 }) });
});

test('creates a lead', async () => {
  const calls = [];
  global.fetch = async (u, o) => (calls.push([u, JSON.parse(o.body)]), { ok: true, status: 200, json: async () => ({ result: 7 }) });
  const r = await run();
  assert.equal(r.status, 200);
  assert.deepEqual(r.body, { ok: true });
  assert.match(calls[0][0], /crm\.contact\.add\.json$/);
  assert.match(calls[1][0], /crm\.deal\.add\.json$/);
  assert.equal(calls[1][1].fields.CONTACT_ID, 7);
});

test('rejects foreign or missing origin', async () => {
  assert.equal((await run({ headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await run({ headers: { origin: undefined } })).status, 403);
});

test('method, content type, body shape', async () => {
  assert.equal((await run({ method: 'GET' })).status, 405);
  assert.equal((await run({ headers: { 'content-type': 'text/plain' } })).status, 415);
  assert.equal((await run({ headers: { 'content-length': '99999' } })).status, 413);
  const r = await run({ method: 'OPTIONS' });
  assert.equal(r.status, 204);
  assert.equal(r.headers['access-control-allow-origin'], okOrigin);
});

test('validation uses uniform error body', async () => {
  const a = await run({ body: { name: '  ' } });
  assert.equal(a.status, 400);
  assert.equal(a.body.ok, false);
  assert.equal(a.body.error, 'name');
  assert.ok(a.body.requestId);
  assert.equal((await run({ body: { phone: '123' } })).body.error, 'phone');
  assert.equal((await run({ body: { name: { a: 1 } } })).body.error, 'name');
});

test('honeypot is silent and creates nothing', async () => {
  let n = 0;
  global.fetch = async () => (n++, { ok: true, json: async () => ({ result: 1 }) });
  const r = await run({ body: { website: 'x' } });
  assert.deepEqual(r.body, { ok: true });
  assert.equal(n, 0);
});

test('rate limits per address and per phone', async () => {
  assert.equal((await run()).status, 200);
  assert.equal((await run()).status, 429); // same phone within a minute
  for (let i = 0; i < 4; i++) await run({ body: { phone: '+7701000000' + i } });
  const r = await run({ body: { phone: '+77019999999' } });
  assert.equal(r.status, 429);
  assert.ok(r.headers['retry-after']);
});

test('CRM failure → 502 and retry is allowed', async () => {
  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  assert.equal((await run()).status, 502);
  global.fetch = async () => ({ ok: true, json: async () => ({ result: 1 }) });
  assert.equal((await run()).status, 200);
});

test('bad env → 500 config, secret not echoed', async () => {
  process.env.BITRIX_WEBHOOK_URL = 'http://nope';
  env._reset();
  const r = await run();
  process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.kz/rest/1/secretcode/';
  assert.equal(r.status, 500);
  assert.equal(r.body.error, 'config');
  assert.ok(!JSON.stringify(r.body).includes('secretcode'));
});

test('env accepts webhook with or without trailing method', () => {
  for (const u of ['https://a.bitrix24.kz/rest/1/abc', 'https://a.bitrix24.kz/rest/1/abc/', 'https://a.bitrix24.kz/rest/1/abc/profile.json']) {
    const r = env.load({ BITRIX_WEBHOOK_URL: u });
    assert.equal(r.config.webhook, 'https://a.bitrix24.kz/rest/1/abc/');
  }
  assert.equal(env.load({ BITRIX_WEBHOOK_URL: 'https://a.bitrix24.kz/rest/1/abc/', BITRIX_DEAL_CATEGORY_ID: 'x;y' }).ok, false);
});
