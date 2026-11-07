'use strict';
/* Results cabinet: shared flow for api/results/*.js.
   Parent enters the e-mail from the results sheet → gets a 6-digit password by mail → signs in
   (login = e-mail) → sees the child's score and downloads the certificate → may change the password.
   Data lives in the store (api/_lib/store.js), filled by `node scripts/import-results.mjs`.
   Store keys:
     res:p:<email>     JSON array of participants for this parent e-mail (written by the import)
     res:index         JSON array of all imported e-mails (lets a re-import remove old ones)
     res:acct:<email>  account { h, v, custom, t } — the password the parent signs in with
     res:otp:<email>   { h, t } — the last mailed 6-digit code; lives 48 h, 10 tries, then gone.
                       It replaces the account password only when somebody signs in with it, so a
                       stranger who requests a code cannot reset or sign out the parent.
     res:otptry:<e>    sign-in attempts against the current code
     res:mail:<email>  password e-mails taken in the current day (counter, taken before sending)
     res:mailgap:<e>   set (atomically) for 60 s with each e-mail
     res:fail:<email>  sign-in attempts against the account password in the current 30-minute window
                       (counted before the check, so parallel requests cannot slip past the limit) */
const crypto = require('node:crypto');
const site = require('./site');
const log = require('./log');
const { requestId, clientIp, hash, fail, applyCors } = require('./http');
const limiter = require('./ratelimit');
const store = require('./store');
const auth = require('./auth');
const mailer = require('./mailer');

const MAX_BODY = 4 * 1024;
const LANGS = ['ru', 'kk', 'en'];
const MAIL_GAP_SEC = 60; // one password e-mail per minute per address
const MAIL_PER_DAY = 5;
const FAIL_LIMIT = 10; // wrong passwords per address per window
const FAIL_WINDOW_SEC = 30 * 60;
const OTP_TTL_SEC = 48 * 3600;
const OTP_TRIES = 10;
const DUMMY_HASH = 'AAAAAAAAAAAAAAAAAAAAAA==:AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=';
const IP_LIMITS = { request: [10, 60 * 60 * 1000], login: [30, 10 * 60 * 1000], default: [60, 10 * 60 * 1000] };

const key = {
  people: (e) => 'res:p:' + e,
  acct: (e) => 'res:acct:' + e,
  mail: (e) => 'res:mail:' + e,
  mailGap: (e) => 'res:mailgap:' + e,
  fail: (e) => 'res:fail:' + e,
  otp: (e) => 'res:otp:' + e,
  otpTry: (e) => 'res:otptry:' + e,
};

function config(env = process.env) {
  const invalid = [];
  const secret = (env.RESULTS_SESSION_SECRET || '').trim();
  // Dev defaults (fixed secret, file store, console mail) only off Vercel and outside NODE_ENV=production.
  const dev = !env.VERCEL && env.NODE_ENV !== 'production';
  if (secret.length < 32 && !dev) invalid.push('RESULTS_SESSION_SECRET');
  const resendKey = (env.RESEND_API_KEY || '').trim();
  const from = (env.MAIL_FROM || '').trim();
  const mailDev = dev && !resendKey;
  if (!mailDev) {
    if (!/^re_\w+/.test(resendKey)) invalid.push('RESEND_API_KEY');
    if (!/@/.test(from)) invalid.push('MAIL_FROM');
  }
  const db = store.get(env);
  if (!db) invalid.push('UPSTASH_REDIS_REST_URL');
  return invalid.length
    ? { ok: false, invalid }
    : { ok: true, secret: secret || 'dev-only-secret-dev-only-secret-dev', mail: { dev: mailDev, resendKey, from }, db, secure: !dev };
}

const readJson = (s) => {
  try { return s ? JSON.parse(s) : null; } catch { return null; }
};

// Participants visible to this e-mail. Only what the cabinet shows — no phones, IIN or teacher data.
async function participants(db, email) {
  const list = readJson(await db.get(key.people(email)));
  return Array.isArray(list) ? list : [];
}

async function session(req, cfg) {
  const s = auth.readSession(cfg.secret, auth.getCookie(req));
  if (!s) return null;
  const acct = readJson(await cfg.db.get(key.acct(s.e)));
  return acct && acct.v === s.v ? { email: s.e, acct } : null;
}

/* ---------- actions ---------- */

// E-mail tag for logs: keyed with the session secret, so it cannot be matched against the sheet.
const tag = (cfg, email) => crypto.createHmac('sha256', cfg.secret).update(email).digest('hex').slice(0, 12);

// POST { email, lang } → e-mails a fresh 6-digit code (valid 48 h) if the address is in the results.
// The answer is the same for addresses that are not in the sheet, so the endpoint cannot be used to
// find out whose children took part; only addresses from the sheet ever get a letter.
async function requestPassword(req, res, ctx, b, cfg) {
  const email = auth.normEmail(b.email);
  if (!auth.isEmail(email)) return fail(res, 400, 'email', { field: 'email', ...ctx.meta });
  const lang = LANGS.includes(b.lang) ? b.lang : 'ru';
  const db = cfg.db;

  // Take the one-per-minute slot atomically: of parallel requests only one goes on.
  if (!(await db.setnx(key.mailGap(email), '1', MAIL_GAP_SEC))) {
    const gap = Math.max(1, await db.ttl(key.mailGap(email)));
    res.setHeader('Retry-After', String(gap));
    return fail(res, 429, 'mail_wait', { retryAfter: gap, ...ctx.meta });
  }
  if ((await db.incr(key.mail(email), 24 * 3600)) > MAIL_PER_DAY) return fail(res, 429, 'mail_daily', ctx.meta);

  const people = await participants(db, email);
  if (!people.length) {
    log.info('results: unknown email', { id: ctx.id, ip: ctx.ip, e: tag(cfg, email) });
    return res.status(200).json({ ok: true, retryAfter: MAIL_GAP_SEC });
  }

  const code = auth.newPassword();
  const otp = { h: await auth.hashPassword(code), t: new Date().toISOString() };
  try {
    await mailer.send(cfg.mail, email, mailer.passwordLetter(email, code, lang));
  } catch (e) {
    await db.del(key.mailGap(email)); // let the parent retry at once; the daily counter stays
    log.error('results: mail failed', { id: ctx.id, reason: String(e?.message || e).slice(0, 200) });
    return fail(res, 502, 'mail', ctx.meta);
  }
  // Stored only after the letter left, so the code in the latest letter is the one that works.
  // The account password is not touched: it keeps working until somebody signs in with the code.
  await db.set(key.otp(email), JSON.stringify(otp), OTP_TTL_SEC);
  await db.del(key.otpTry(email));
  log.info('results: code sent', { id: ctx.id, ip: ctx.ip, e: tag(cfg, email), lang });
  return res.status(200).json({ ok: true, retryAfter: MAIL_GAP_SEC });
}

// Checks a password against the account password (limited per e-mail per 30 min) and then against
// the mailed code (10 tries per code). Returns { acct } on success or { error, retryAfter }.
async function checkPassword(db, email, password) {
  const acct = readJson(await db.get(key.acct(email)));
  const fails = await db.incr(key.fail(email), FAIL_WINDOW_SEC);
  const locked = fails > FAIL_LIMIT;
  if (!locked && (await auth.verifyPassword(password, acct ? acct.h : DUMMY_HASH)) && acct) {
    await db.del(key.fail(email));
    return { acct };
  }
  // A locked account can still be opened with a fresh code from the mail, so a stranger who keeps
  // the account locked cannot keep the parent out; the code has its own small budget of tries.
  const otp = readJson(await db.get(key.otp(email)));
  if (otp) {
    const tries = await db.incr(key.otpTry(email), OTP_TTL_SEC);
    if (tries <= OTP_TRIES && (await auth.verifyPassword(password, otp.h))) {
      const now = new Date().toISOString();
      const next = { h: otp.h, v: auth.newVersion(), custom: false, t: now, created: acct?.created || now };
      await db.set(key.acct(email), JSON.stringify(next));
      await db.del(key.otp(email), key.otpTry(email), key.fail(email));
      return { acct: next, viaCode: true };
    }
    if (tries >= OTP_TRIES) await db.del(key.otp(email), key.otpTry(email)); // used up: request a new one
  }
  if (locked) return { error: 'locked', retryAfter: Math.max(1, await db.ttl(key.fail(email))) };
  return { error: 'credentials' };
}

// POST { email, password } → sets the session cookie.
async function login(req, res, ctx, b, cfg) {
  const email = auth.normEmail(b.email);
  const password = typeof b.password === 'string' ? b.password.trim().slice(0, 128) : '';
  if (!auth.isEmail(email)) return fail(res, 400, 'email', { field: 'email', ...ctx.meta });
  if (!password) return fail(res, 400, 'password', { field: 'password', ...ctx.meta });
  const db = cfg.db;

  const r = await checkPassword(db, email, password);
  // Addresses removed from the sheet by a re-import cannot sign in any more.
  if (r.acct && !(await participants(db, email)).length) r.error = 'credentials';
  if (r.error) {
    log.info('results: bad login', { id: ctx.id, ip: ctx.ip, e: tag(cfg, email), why: r.error });
    if (r.error === 'locked') {
      res.setHeader('Retry-After', String(r.retryAfter));
      return fail(res, 429, 'locked', { retryAfter: r.retryAfter, ...ctx.meta });
    }
    return fail(res, 401, 'credentials', ctx.meta);
  }
  auth.setSessionCookie(res, auth.issueSession(cfg.secret, email, r.acct.v), cfg.secure);
  log.info('results: login', { id: ctx.id, ip: ctx.ip, e: tag(cfg, email), code: Boolean(r.viaCode) });
  return res.status(200).json({ ok: true });
}

// POST {} → the signed-in parent's participants.
async function me(req, res, ctx, b, cfg) {
  const s = await session(req, cfg);
  if (!s) return fail(res, 401, 'auth', ctx.meta);
  const people = await participants(cfg.db, s.email);
  return res.status(200).json({ ok: true, email: s.email, customPassword: Boolean(s.acct.custom), participants: people });
}

// POST { current, password } → changes the password; other sessions are signed out.
async function changePassword(req, res, ctx, b, cfg) {
  const s = await session(req, cfg);
  if (!s) return fail(res, 401, 'auth', ctx.meta);
  const current = typeof b.current === 'string' ? b.current.trim().slice(0, 128) : '';
  const next = typeof b.password === 'string' ? b.password : '';
  if (next.length < 6 || next.length > 64 || /^\s|\s$/.test(next)) return fail(res, 400, 'weak', { field: 'password', ...ctx.meta });
  // Wrong "current password" counts against the same per-e-mail limit as the sign-in form,
  // so a stolen session cookie cannot be used to guess the password.
  const fails = await cfg.db.incr(key.fail(s.email), FAIL_WINDOW_SEC);
  if (fails > FAIL_LIMIT) {
    const ttl = Math.max(1, await cfg.db.ttl(key.fail(s.email)));
    res.setHeader('Retry-After', String(ttl));
    return fail(res, 429, 'locked', { retryAfter: ttl, ...ctx.meta });
  }
  if (!(await auth.verifyPassword(current, s.acct.h))) return fail(res, 400, 'current', { field: 'current', ...ctx.meta });
  await cfg.db.del(key.fail(s.email));
  const acct = { ...s.acct, h: await auth.hashPassword(next), v: auth.newVersion(), custom: true, t: new Date().toISOString() };
  await cfg.db.set(key.acct(s.email), JSON.stringify(acct));
  await cfg.db.del(key.otp(s.email), key.otpTry(s.email));
  auth.setSessionCookie(res, auth.issueSession(cfg.secret, s.email, acct.v), cfg.secure);
  log.info('results: password changed', { id: ctx.id, ip: ctx.ip, e: tag(cfg, s.email) });
  return res.status(200).json({ ok: true });
}

async function logout(req, res, ctx, b, cfg) {
  auth.clearSessionCookie(res, cfg.secure);
  return res.status(200).json({ ok: true });
}

/* ---------- HTTP wrapper: same rules as api/lead.js (docs/BACKEND.md) ---------- */

function endpoint(name, action) {
  async function handle(req, res, ctx) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Request-Id', ctx.id);
    const origin = req.headers.origin;
    if (origin && site.originPattern.test(origin)) {
      applyCors(res, origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') {
      if (!origin || !site.originPattern.test(origin)) return fail(res, 403, 'forbidden', ctx.meta);
      res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      res.setHeader('Access-Control-Max-Age', '86400');
      return res.status(204).end();
    }
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST, OPTIONS');
      return fail(res, 405, 'method_not_allowed', ctx.meta);
    }
    // Origin check doubles as CSRF protection for the cookie-authenticated actions.
    if (!origin || !site.originPattern.test(origin)) {
      log.warn('origin rejected', { id: ctx.id, origin: String(origin || '').slice(0, 100) });
      return fail(res, 403, 'forbidden', ctx.meta);
    }
    if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) return fail(res, 415, 'unsupported_media_type', ctx.meta);
    if (Number(req.headers['content-length']) > MAX_BODY) return fail(res, 413, 'too_large', ctx.meta);
    let b = req.body;
    if (typeof b === 'string') {
      if (b.length > MAX_BODY) return fail(res, 413, 'too_large', ctx.meta);
      try { b = JSON.parse(b); } catch { b = null; }
    }
    if (b == null || b === '') b = {};
    if (typeof b !== 'object' || Array.isArray(b)) return fail(res, 400, 'bad_request', ctx.meta);

    const ip = limiter.hit(name + ':' + ctx.ip, ...(IP_LIMITS[name] || IP_LIMITS.default));
    if (!ip.ok) {
      res.setHeader('Retry-After', String(ip.retryAfter));
      return fail(res, 429, 'rate_limited', { retryAfter: ip.retryAfter, ...ctx.meta });
    }

    const cfg = config();
    if (!cfg.ok) {
      log.error('invalid environment', { id: ctx.id, vars: cfg.invalid });
      return fail(res, 500, 'config', ctx.meta);
    }
    try {
      return await action(req, res, ctx, b, cfg);
    } catch (e) {
      log.error('results: ' + name + ' failed', { id: ctx.id, reason: String(e?.message || e).slice(0, 200) });
      return fail(res, 503, 'unavailable', ctx.meta);
    }
  }

  return async (req, res) => {
    const id = requestId(req);
    const ctx = { id, ip: hash(clientIp(req)), meta: { requestId: id } };
    try {
      return await handle(req, res, ctx);
    } catch (e) {
      log.error('unhandled', { id, reason: String(e?.message || e).slice(0, 200) });
      if (!res.headersSent) return fail(res, 500, 'internal', ctx.meta);
    }
  };
}

module.exports = {
  endpoint, config, key,
  actions: { requestPassword, login, me, changePassword, logout },
  limits: { MAIL_GAP_SEC, MAIL_PER_DAY, FAIL_LIMIT, OTP_TRIES, OTP_TTL_SEC },
};
