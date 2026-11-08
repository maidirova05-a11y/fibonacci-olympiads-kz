'use strict';
// Optional Postgres copy of every lead. Off unless DATABASE_URL is set (Vercel deploys leave it unset).
// Never blocks or fails the request: every error is logged (code only, never values) and swallowed.
// Parameterised queries only; schema lives in db/migrations (applied by server/migrate.cjs).
const log = require('./log');

const TIMEOUT_MS = 1500;
let pool;

function getPool() {
  if (pool) return pool;
  const url = (process.env.DATABASE_URL || '').trim();
  if (!url) return null;
  const { Pool } = require('pg'); // loaded lazily: the Vercel build has no database and no need for the driver
  pool = new Pool({ connectionString: url, max: 3, connectionTimeoutMillis: TIMEOUT_MS, idleTimeoutMillis: 30000 });
  pool.on('error', (e) => log.error('store pool error', { code: e.code || e.name }));
  return pool;
}

// Rejects after TIMEOUT_MS so a slow database cannot hold the visitor's request.
function withTimeout(promise) {
  let timer;
  const t = new Promise((_, reject) => { timer = setTimeout(() => reject(Object.assign(new Error('timeout'), { code: 'TIMEOUT' })), TIMEOUT_MS); });
  return Promise.race([promise, t]).finally(() => clearTimeout(timer));
}

// Saves the lead before the CRM call. Returns the row id, or null when the store is off or failed.
async function saveLead(lead, meta = {}) {
  const p = getPool();
  if (!p) return null;
  try {
    const r = await withTimeout(p.query(
      `INSERT INTO leads (name, phone, question, lang, page, referrer, utm, origin, ip_hash)
       VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9) RETURNING id`,
      [lead.name, lead.phone, lead.question, lead.lang, lead.page, lead.referrer, JSON.stringify(lead.utm || {}),
        String(meta.origin || '').slice(0, 200), String(meta.ipHash || '').slice(0, 64)],
    ));
    return r.rows[0].id;
  } catch (e) {
    log.error('store save failed', { code: e.code || e.name });
    return null;
  }
}

// Records what the CRM said: { ok: true, crmId } or { ok: false, error: '<code>' }.
async function markCrm(id, result) {
  const p = getPool();
  if (!p || id == null) return;
  try {
    await withTimeout(p.query(
      'UPDATE leads SET crm_status = $2, crm_id = $3, crm_error = $4, updated_at = now() WHERE id = $1',
      [id, result.ok ? 'ok' : 'failed', result.ok && result.crmId != null ? String(result.crmId) : null, result.ok ? null : String(result.error || 'crm').slice(0, 40)],
    ));
  } catch (e) {
    log.error('store update failed', { code: e.code || e.name });
  }
}

// Tests inject a fake pool; close() lets a script exit cleanly.
const _setPool = (p) => { pool = p; };
const close = async () => { if (pool && pool.end) await pool.end(); pool = undefined; };

module.exports = { saveLead, markCrm, _setPool, close };
