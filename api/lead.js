'use strict';
/* POST /api/lead — «Получить консультацию» form → Bitrix24 (contact + deal, or a lead).
   Layers: this file = HTTP concerns and flow; _lib/validate = input; _lib/env = config;
   _lib/ratelimit = abuse control; _lib/bitrix = CRM; _lib/log + _lib/http = shared helpers.
   Standard and env vars: docs/BACKEND.md */
const site = require('./_lib/site');
const env = require('./_lib/env');
const log = require('./_lib/log');
const { requestId, clientIp, hash, fail, applyCors } = require('./_lib/http');
const { parseLead } = require('./_lib/validate');
const limiter = require('./_lib/ratelimit');
const { createLead } = require('./_lib/bitrix');

const MAX_BODY = 16 * 1024;
const IP_LIMIT = [5, 10 * 60 * 1000]; // 5 requests / 10 min / address
const PHONE_LIMIT = [1, 60 * 1000]; // the same number at most once a minute

async function handle(req, res, ctx) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Request-Id', ctx.id);

  // CORS: the browser sends Origin on every cross-origin and every same-origin POST.
  const origin = req.headers.origin;
  if (origin && site.originPattern.test(origin)) applyCors(res, origin);
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
  if (!origin || !site.originPattern.test(origin)) {
    log.warn('origin rejected', { id: ctx.id, origin: String(origin || '').slice(0, 100) });
    return fail(res, 403, 'forbidden', ctx.meta);
  }

  if (!/^application\/json\b/i.test(req.headers['content-type'] || '')) {
    return fail(res, 415, 'unsupported_media_type', ctx.meta);
  }
  if (Number(req.headers['content-length']) > MAX_BODY) return fail(res, 413, 'too_large', ctx.meta);
  let b = req.body;
  if (typeof b === 'string') {
    if (b.length > MAX_BODY) return fail(res, 413, 'too_large', ctx.meta);
    try { b = JSON.parse(b); } catch { b = null; }
  }
  if (!b || typeof b !== 'object' || Array.isArray(b)) return fail(res, 400, 'bad_request', ctx.meta);

  // Honeypot: real visitors never see this field. Answer "ok" so bots learn nothing.
  if (b.website) {
    log.info('honeypot', { id: ctx.id, ip: ctx.ip });
    return res.status(200).json({ ok: true });
  }

  const ip = limiter.hit('ip:' + ctx.ip, ...IP_LIMIT);
  if (!ip.ok) {
    res.setHeader('Retry-After', String(ip.retryAfter));
    log.warn('rate limited', { id: ctx.id, ip: ctx.ip });
    return fail(res, 429, 'rate_limited', ctx.meta);
  }

  const parsed = parseLead(b);
  if (parsed.error) return fail(res, 400, parsed.error, { field: parsed.field, ...ctx.meta });
  const lead = parsed.value;

  const dup = limiter.hit('phone:' + hash(lead.digits), ...PHONE_LIMIT);
  if (!dup.ok) {
    res.setHeader('Retry-After', String(dup.retryAfter));
    return fail(res, 429, 'rate_limited', ctx.meta);
  }

  const cfg = env.get();
  if (!cfg.ok) {
    log.error('invalid environment', { id: ctx.id, vars: cfg.invalid });
    return fail(res, 500, 'config', ctx.meta);
  }

  const phoneKey = 'phone:' + hash(lead.digits);
  try {
    const r = await createLead(cfg.config, lead);
    log.info('lead created', { id: ctx.id, ip: ctx.ip, crmId: r.id, lang: lead.lang, utmSource: lead.utm.UTM_SOURCE });
    return res.status(200).json({ ok: true });
  } catch (e) {
    limiter.forget(phoneKey); // a failed attempt must not block the visitor's retry
    const timeout = e?.name === 'TimeoutError' || e?.name === 'AbortError';
    log.error('crm failed', { id: ctx.id, reason: String(e?.message || e).slice(0, 200), timeout, orphanContactId: e?.contactId });
    return fail(res, timeout ? 504 : 502, timeout ? 'crm_timeout' : 'crm', ctx.meta);
  }
}

module.exports = async (req, res) => {
  const id = requestId(req);
  const ctx = { id, ip: hash(clientIp(req)), meta: { requestId: id } };
  try {
    return await handle(req, res, ctx);
  } catch (e) {
    log.error('unhandled', { id, reason: String(e?.message || e).slice(0, 200) });
    if (!res.headersSent) return fail(res, 500, 'internal', ctx.meta);
  }
};
