'use strict';
// npm test — Postgres copy of leads (api/_lib/leads-db.js). A fake pool stands in for the database.
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.kz/rest/1/secretcode/';
const handler = require('../api/lead');
const store = require('../api/_lib/leads-db');
const limiter = require('../api/_lib/ratelimit');
const env = require('../api/_lib/env');
const site = require('../api/_lib/site');

const okOrigin = site.originPattern.source.includes('fibonacci') ? 'https://fibonacci-olympiads.kz' : 'https://atlantia-olympiads.kz';
const PHONE = '+7 701 123 45 67';

function fakePool(over = {}) {
  const calls = [];
  return {
    calls,
    query: async (text, values) => {
      calls.push({ text, values });
      if (over.fail) throw Object.assign(new Error('boom ' + PHONE), { code: over.fail });
      return { rows: [{ id: 41 }] };
    },
  };
}

function run(body = {}) {
  const req = { method: 'POST', headers: { origin: okOrigin, 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' }, body: { name: 'Айгерим', phone: PHONE, question: 'Когда?', ...body } };
  const out = { headers: {} };
  const res = { headersSent: false, setHeader: (k, v) => (out.headers[k.toLowerCase()] = v), status: (c) => ((out.status = c), res), json: (b) => ((out.body = b), res), end: () => res };
  return handler(req, res).then(() => out);
}

test.beforeEach(() => {
  limiter.reset(); env._reset(); store._setPool(undefined); delete process.env.DATABASE_URL;
  global.fetch = async () => ({ ok: true, status: 200, json: async () => ({ result: 7 }) });
});
test.after(() => { store._setPool(undefined); });

test('store is off without DATABASE_URL and the lead still goes to the CRM', async () => {
  assert.equal(await store.saveLead({ name: 'A', phone: '1' }), null);
  await store.markCrm(null, { ok: true }); // must not throw
  assert.equal((await run()).status, 200);
});

test('saves the lead with parameterised SQL, then records the CRM result', async () => {
  const pool = fakePool(); store._setPool(pool);
  const r = await run({ utm_source: 'ig' });
  assert.equal(r.status, 200);
  const [ins, upd] = pool.calls;
  assert.match(ins.text, /^INSERT INTO leads/);
  assert.ok(!ins.text.includes('Айгерим') && !ins.text.includes('701'), 'values must be parameters, not part of the SQL');
  assert.equal(ins.values[0], 'Айгерим');
  assert.equal(ins.values[1], PHONE);
  assert.equal(JSON.parse(ins.values[6]).UTM_SOURCE, 'ig');
  assert.equal(ins.values[7], okOrigin);
  assert.match(ins.values[8], /^[0-9a-f]{12}$/, 'only a hash of the IP is stored');
  assert.match(upd.text, /^UPDATE leads SET crm_status/);
  assert.deepEqual(upd.values, [41, 'ok', '7', null]);
});

test('a CRM failure keeps the lead and marks it failed (response contract unchanged)', async () => {
  const pool = fakePool(); store._setPool(pool);
  global.fetch = async () => ({ ok: false, status: 500, json: async () => ({}) });
  const r = await run();
  assert.equal(r.status, 502);
  assert.deepEqual(pool.calls[1].values, [41, 'failed', null, 'crm']);
});

test('a database failure never blocks the lead and never logs values', async () => {
  const pool = fakePool({ fail: '57P01' }); store._setPool(pool);
  const logged = []; const orig = console.error; console.error = (l) => logged.push(String(l));
  try { assert.equal((await run()).status, 200); } finally { console.error = orig; }
  assert.ok(logged.some((l) => l.includes('store save failed') && l.includes('57P01')));
  assert.ok(!logged.join('\n').includes('701'), 'phone must not be logged');
});

test('invalid CRM config is recorded as failed/config', async () => {
  const pool = fakePool(); store._setPool(pool);
  process.env.BITRIX_WEBHOOK_URL = 'nope'; env._reset();
  try { assert.equal((await run()).status, 500); } finally { process.env.BITRIX_WEBHOOK_URL = 'https://example.bitrix24.kz/rest/1/secretcode/'; env._reset(); }
  assert.deepEqual(pool.calls[1].values, [41, 'failed', null, 'config']);
});
