'use strict';
// npm test — Postgres key-value store (api/_lib/store.js, pgStore) keeps the Redis semantics the results cabinet relies on.
// Needs a database with db/migrations applied: TEST_DATABASE_URL=postgres://… npm test (skipped otherwise).
const test = require('node:test');
const assert = require('node:assert/strict');

const URL = process.env.TEST_DATABASE_URL;
const store = require('../api/_lib/store');
const opts = { skip: URL ? false : 'TEST_DATABASE_URL not set' };

let pool, kv;
test.before(async () => {
  if (!URL) return;
  pool = new (require('pg').Pool)({ connectionString: URL });
  kv = store.pgStore(pool);
});
test.beforeEach(async () => { if (pool) await pool.query('TRUNCATE kv'); });
test.after(async () => { if (pool) await pool.end(); });

const expire = (k) => pool.query("UPDATE kv SET expires_at = now() - interval '1 second' WHERE k = $1", [k]);

test('get/set/del: missing is null, values are strings, del counts live keys only', opts, async () => {
  assert.equal(await kv.get('a'), null);
  assert.equal(await kv.set('a', 5), 'OK');
  assert.equal(await kv.get('a'), '5');
  await kv.set('b', 'x', 100);
  await kv.set('c', 'y', 100); await expire('c');
  assert.equal(await kv.del('a', 'b', 'c', 'nope'), 2);
  assert.equal(await kv.del(), 0);
  assert.equal(await kv.get('b'), null);
});

test('an expired key reads as absent', opts, async () => {
  await kv.set('t', 'v', 100);
  assert.equal(await kv.get('t'), 'v');
  await expire('t');
  assert.equal(await kv.get('t'), null);
  assert.equal(await kv.ttl('t'), -2);
});

test('set replaces the value and clears the TTL, like Redis SET', opts, async () => {
  await kv.set('k', '1', 100);
  assert.ok((await kv.ttl('k')) > 90);
  await kv.set('k', '2');
  assert.equal(await kv.ttl('k'), -1);
  assert.equal(await kv.get('k'), '2');
});

test('setnx is atomic: only one of many concurrent callers wins', opts, async () => {
  const wins = (await Promise.all(Array.from({ length: 12 }, () => kv.setnx('slot', '1', 60)))).filter(Boolean).length;
  assert.equal(wins, 1);
  assert.equal(await kv.setnx('slot', '1', 60), false);
  await expire('slot');
  assert.equal(await kv.setnx('slot', '1', 60), true, 'an expired slot can be taken again');
});

test('incr counts, keeps the window fixed from the first hit, restarts after expiry', opts, async () => {
  assert.equal(await kv.incr('n', 100), 1);
  const t1 = await kv.ttl('n');
  assert.equal(await kv.incr('n', 9999), 2);
  assert.equal(await kv.incr('n', 9999), 3);
  assert.ok((await kv.ttl('n')) <= t1, 'later hits must not extend the window');
  await expire('n');
  assert.equal(await kv.incr('n', 100), 1);
});

test('incr is atomic under concurrency', opts, async () => {
  const r = await Promise.all(Array.from({ length: 20 }, () => kv.incr('c', 60)));
  assert.deepEqual([...r].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1));
});

test('ttl: seconds left / -1 no expiry / -2 missing', opts, async () => {
  assert.equal(await kv.ttl('none'), -2);
  await kv.set('p', 'v');
  assert.equal(await kv.ttl('p'), -1);
  await kv.set('q', 'v', 120);
  const t = await kv.ttl('q');
  assert.ok(t > 110 && t <= 120);
});
