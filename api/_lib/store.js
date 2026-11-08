'use strict';
// Key-value store for the results cabinet (participants, accounts, attempt counters).
// Production: Upstash Redis over its REST API (Vercel Marketplace → Upstash; the integration sets
// KV_REST_API_URL / KV_REST_API_TOKEN or UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN).
// Own server (Docker): Postgres, table `kv` (db/migrations/002_kv.sql), chosen when DATABASE_URL is set — data stays on your server.
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

// Postgres store: the same six operations and semantics as the Redis one, on table kv(k, v, expires_at).
// A row past expires_at counts as absent (and is swept now and then). Every statement is atomic on its own.
const LIVE = '(expires_at IS NULL OR expires_at > now())';
function pgStore(pool) {
  let writes = 0;
  const sweep = () => {
    if (++writes % 200 === 0) pool.query('DELETE FROM kv WHERE expires_at IS NOT NULL AND expires_at <= now()').catch(() => {});
  };
  const secs = (ttlSec) => (ttlSec ? Number(ttlSec) : null);
  return {
    kind: 'postgres',
    get: async (k) => {
      const r = await pool.query(`SELECT v FROM kv WHERE k = $1 AND ${LIVE}`, [k]);
      return r.rows[0] ? r.rows[0].v : null;
    },
    // Like Redis SET: replaces the value and the TTL (no ttl = no expiry).
    set: async (k, v, ttlSec) => {
      await pool.query(
        `INSERT INTO kv (k, v, expires_at) VALUES ($1, $2, CASE WHEN $3::int IS NULL THEN NULL ELSE now() + make_interval(secs => $3::int) END)
         ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, expires_at = EXCLUDED.expires_at`,
        [k, String(v), secs(ttlSec)],
      );
      sweep();
      return 'OK';
    },
    // Number of live keys removed (expired ones are removed too but not counted).
    del: async (...keys) => {
      if (!keys.length) return 0;
      const r = await pool.query(`WITH d AS (DELETE FROM kv WHERE k = ANY($1::text[]) RETURNING expires_at) SELECT count(*)::int AS n FROM d WHERE expires_at IS NULL OR expires_at > now()`, [keys]);
      return r.rows[0].n;
    },
    // Atomic "take the slot": true only for the first caller until the key expires.
    setnx: async (k, v, ttlSec) => {
      const r = await pool.query(
        `INSERT INTO kv (k, v, expires_at) VALUES ($1, $2, now() + make_interval(secs => $3::int))
         ON CONFLICT (k) DO UPDATE SET v = EXCLUDED.v, expires_at = EXCLUDED.expires_at
         WHERE kv.expires_at IS NOT NULL AND kv.expires_at <= now() RETURNING 1`,
        [k, String(v), Number(ttlSec)],
      );
      sweep();
      return r.rowCount === 1;
    },
    // Counter; the expiry is set only on the first hit of a window (Redis EXPIRE NX), so the window is fixed.
    incr: async (k, ttlSec) => {
      const r = await pool.query(
        `INSERT INTO kv (k, v, expires_at) VALUES ($1, '1', now() + make_interval(secs => $2::int))
         ON CONFLICT (k) DO UPDATE SET
           v = CASE WHEN kv.expires_at IS NOT NULL AND kv.expires_at <= now() THEN '1' ELSE (kv.v::bigint + 1)::text END,
           expires_at = CASE WHEN kv.expires_at IS NULL OR kv.expires_at <= now() THEN now() + make_interval(secs => $2::int) ELSE kv.expires_at END
         RETURNING v`,
        [k, Number(ttlSec)],
      );
      sweep();
      return Number(r.rows[0].v);
    },
    // Redis TTL: seconds left, -1 no expiry, -2 no such key.
    ttl: async (k) => {
      const r = await pool.query(`SELECT expires_at, CEIL(EXTRACT(EPOCH FROM (expires_at - now())))::int AS left FROM kv WHERE k = $1 AND ${LIVE}`, [k]);
      if (!r.rows[0]) return -2;
      return r.rows[0].expires_at ? r.rows[0].left : -1;
    },
  };
}

function pgPool(url) {
  const { Pool } = require('pg'); // lazy: only on the own server; Vercel never loads it
  const pool = new Pool({ connectionString: url, max: 5, connectionTimeoutMillis: 3000, idleTimeoutMillis: 30000 });
  pool.on('error', () => {});
  return pool;
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
  const dbUrl = (env.DATABASE_URL || '').trim();
  if (dbUrl) return (cached = pgStore(pgPool(dbUrl)));
  const cfg = redisConfig(env);
  if (cfg) return (cached = redisStore(cfg));
  if (!env.VERCEL) {
    return (cached = fileStore(env.RESULTS_DEV_STORE || path.join(__dirname, '..', '..', '.data', 'dev-store.json')));
  }
  return null; // on Vercel without Redis: the handler answers 500 config
}

module.exports = { get, redisConfig, redisStore, fileStore, pgStore, _set: (s) => (cached = s), _reset: () => (cached = undefined) };
