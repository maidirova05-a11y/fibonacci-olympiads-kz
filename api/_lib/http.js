'use strict';
const crypto = require('node:crypto');

const requestId = (req) => String(req.headers['x-vercel-id'] || crypto.randomUUID()).slice(0, 64);

// Real client address. On Vercel x-forwarded-for is set by the edge, so its first entry is the client.
const clientIp = (req) =>
  String(req.headers['x-forwarded-for'] || req.headers['x-real-ip'] || req.socket?.remoteAddress || '')
    .split(',')[0]
    .trim();

// Short one-way hash for logs and rate-limit keys, so raw addresses are never stored.
const hash = (v) => crypto.createHash('sha256').update(String(v)).digest('hex').slice(0, 12);

// Uniform error body: { ok:false, error:<machine code>, field?, requestId }.
// The web client only relies on `ok` and `error`.
function fail(res, status, error, extra) {
  return res.status(status).json({ ok: false, error, ...extra });
}

// CORS: echo the origin back only when it is on the allow-list.
function applyCors(res, origin) {
  res.setHeader('Access-Control-Allow-Origin', origin);
  res.setHeader('Vary', 'Origin');
}

module.exports = { requestId, clientIp, hash, fail, applyCors };
