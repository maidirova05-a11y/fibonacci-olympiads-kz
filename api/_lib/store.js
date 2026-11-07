'use strict';
// Key-value store for the results cabinet (participants, accounts, attempt counters).
// Production: Upstash Redis over its REST API (Vercel Marketplace → Upstash; the integration sets
// KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// Local development (no Redis env, not on Vercel): a JSON file in .data/ — never deployed.
const fs = require('node:fs');
const path = require('node:path');

const TIMEOUT_MS = 4000;

function redisConfig(env = process.env) {
  const url = (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL || '').trim().replace(/\/+$/, '');
  const token = (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN || '').trim();
  return /^https:\/\/\S+$/.test(url) && token ? { url, token } : null;
}

function redisStore({ url, token }) {
  const pipeline = async (cmds) => {
    const r = await fetch(url + '/pipeline', {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmds),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const data = await r.json().catch(() => null);
    if (!r.ok || !Array.isArray(data)) throw new Error('store: ' + r.status);
    for (const d of data) if (d && d.error) throw new Error('store: ' + d.error);
    return data.map((d) => d.result);
  };
  const one = async (...cmd) => (await pipeline([cmd]))[0];
  return {
    kind: 'redis',
    get: (k) => one('GET', k),
    set: (k, v, ttlSec) => (ttlSec ? one('SET', k, v, 'EX', String(ttlSec)) : one('SET', k, v)),
    del: (...keys) => (keys.length ? one('DEL', ...keys) : 0),
    // Atomic "take the slot": true only for the first caller until the key expires.
    setnx: async (k, v, ttlSec) => (await one('SET', k, v, 'NX', 'EX', String(ttlSec))) === 'OK',
    // INCR + set the expiry only on the first hit, so the window is fixed from the first attempt.
    incr: async (k, ttlSec) => {
      const [n] = await pipeline([['INCR', k], ['EXPIRE', k, String(ttlSec), 'NX']]);
      return n;
    },
    ttl: (k) => one('TTL', k),
    pipeline,
  };
}

// File store for `node scripts/dev-server.mjs` and the import script. Same semantics as above.
function fileStore(file) {
  const load = () => {
    try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return {}; }
  };
  const save = (db) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(db, null, 1));
  };
  const live = (db, k, now = Date.now()) => {
    const e = db[k];
    if (e && e.x && e.x <= now) { delete db[k]; return undefined; }
    return e;
  };
  const api = {
    kind: 'file',
    get: async (k) => { const e = live(load(), k); return e ? e.v : null; },
    set: async (k, v, ttlSec) => {
      const db = load();
      db[k] = { v: String(v), x: ttlSec ? Date.now() + ttlSec * 1000 : 0 };
      save(db);
      return 'OK';
    },
    del: async (...keys) => {
      const db = load();
      let n = 0;
      for (const k of keys) if (live(db, k)) { delete db[k]; n++; }
      save(db);
      return n;
    },
    setnx: async (k, v, ttlSec) => {
      const db = load();
      if (live(db, k)) return false;
      db[k] = { v: String(v), x: Date.now() + ttlSec * 1000 };
      save(db);
      return true;
    },
    incr: async (k, ttlSec) => {
      const db = load();
      const e = live(db, k);
      const n = (e ? Number(e.v) : 0) + 1;
      db[k] = { v: String(n), x: e && e.x ? e.x : Date.now() + ttlSec * 1000 };
      save(db);
      return n;
    },
    ttl: async (k) => {
      const e = live(load(), k);
      if (!e) return -2;
      return e.x ? Math.ceil((e.x - Date.now()) / 1000) : -1;
    },
  };
  return api;
}

let cached;
function get(env = process.env) {
  if (cached) return cached;
  const cfg = redisConfig(env);
  if (cfg) return (cached = redisStore(cfg));
  if (!env.VERCEL) {
    return (cached = fileStore(env.RESULTS_DEV_STORE || path.join(__dirname, '..', '..', '.data', 'dev-store.json')));
  }
  return null; // on Vercel without Redis: the handler answers 500 config
}

module.exports = { get, redisConfig, redisStore, fileStore, _set: (s) => (cached = s), _reset: () => (cached = undefined) };
