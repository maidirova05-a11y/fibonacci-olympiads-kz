'use strict';
// Results cabinet: passwords, accounts and signed session cookies.
const crypto = require('node:crypto');
const { promisify } = require('node:util');
const scrypt = promisify(crypto.scrypt);

const COOKIE = 'fib_res';
const SESSION_DAYS = 7;
const SCRYPT = { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 };

// One mailbox = one account. Spreadsheet values sometimes carry stray spaces ("a@ mail.ru").
const normEmail = (v) => (typeof v === 'string' ? v : '').replace(/\s+/g, '').toLowerCase().slice(0, 254);
const isEmail = (e) => /^[^@\s]{1,64}@[^@\s]+\.[a-z0-9-]{2,}$/i.test(e);

// 6-digit numeric password, uniformly random (000000–999999).
const newPassword = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');

async function hashPassword(pw) {
  const salt = crypto.randomBytes(16);
  const key = await scrypt(String(pw), salt, 32, SCRYPT);
  return salt.toString('base64') + ':' + key.toString('base64');
}

async function verifyPassword(pw, stored) {
  const [s, k] = String(stored || '').split(':');
  if (!s || !k) return false;
  const key = await scrypt(String(pw), Buffer.from(s, 'base64'), 32, SCRYPT);
  const want = Buffer.from(k, 'base64');
  return want.length === key.length && crypto.timingSafeEqual(want, key);
}

// Account record (JSON in the store under acct:<email>):
//   { h: scrypt hash, v: session version, custom: user chose the password, t: last change ISO }
// A new `v` on every password change logs out all other sessions.
const newVersion = () => crypto.randomBytes(6).toString('base64url');

const b64 = (s) => Buffer.from(s).toString('base64url');
const sign = (data, secret) => crypto.createHmac('sha256', secret).update(data).digest('base64url');

function issueSession(secret, email, version, now = Date.now()) {
  const body = b64(JSON.stringify({ e: email, v: version, x: now + SESSION_DAYS * 864e5 }));
  return body + '.' + sign(body, secret);
}

function readSession(secret, token, now = Date.now()) {
  const [body, sig] = String(token || '').split('.');
  if (!body || !sig) return null;
  const want = Buffer.from(sign(body, secret));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !crypto.timingSafeEqual(want, got)) return null;
  try {
    const p = JSON.parse(Buffer.from(body, 'base64url').toString());
    return p && typeof p.e === 'string' && p.x > now ? p : null;
  } catch {
    return null;
  }
}

function getCookie(req, name = COOKIE) {
  for (const part of String(req.headers.cookie || '').split(';')) {
    const i = part.indexOf('=');
    if (i > 0 && part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return '';
}

// HttpOnly + SameSite=Strict + scoped to /api/results: page scripts never see it, other sites never send it.
function setSessionCookie(res, token, secure) {
  const attrs = [`${COOKIE}=${token}`, 'Path=/api/results', 'HttpOnly', 'SameSite=Strict', `Max-Age=${SESSION_DAYS * 86400}`];
  if (secure) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}
function clearSessionCookie(res, secure) {
  const attrs = [`${COOKIE}=`, 'Path=/api/results', 'HttpOnly', 'SameSite=Strict', 'Max-Age=0'];
  if (secure) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

module.exports = {
  COOKIE, normEmail, isEmail, newPassword, hashPassword, verifyPassword, newVersion,
  issueSession, readSession, getCookie, setSessionCookie, clearSessionCookie,
};
