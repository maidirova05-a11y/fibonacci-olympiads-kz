'use strict';
// Applies db/migrations/*.sql in name order, once each (tracked in schema_migrations). Run before the server starts.
// Without DATABASE_URL it does nothing (the site works without a database; leads then go to the CRM only).
const fs = require('node:fs');
const path = require('node:path');

async function main() {
  const url = (process.env.DATABASE_URL || '').trim();
  if (!url) { console.log('migrate: DATABASE_URL not set, skipped'); return; }
  const { Client } = require('pg');
  const dir = path.resolve(__dirname, '..', 'db', 'migrations');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => /^\d+.*\.sql$/.test(f)).sort() : [];

  // The database container may still be starting: retry for up to ~60 s.
  let client;
  for (let i = 0; ; i++) {
    client = new Client({ connectionString: url, connectionTimeoutMillis: 3000 });
    try { await client.connect(); break; } catch (e) {
      await client.end().catch(() => {});
      if (i >= 30) throw e;
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
  try {
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const done = new Set((await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name));
    for (const f of files) {
      if (done.has(f)) continue;
      const sql = fs.readFileSync(path.join(dir, f), 'utf8');
      await client.query('BEGIN');
      try {
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [f]);
        await client.query('COMMIT');
        console.log('migrate: applied ' + f);
      } catch (e) {
        await client.query('ROLLBACK').catch(() => {});
        throw e;
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((e) => { console.error('migrate failed:', e.code || e.name, e.message); process.exit(1); });
