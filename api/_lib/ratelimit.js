'use strict';
// Best-effort in-memory limiter. State lives per warm serverless instance, so it stops bursts and
// naive floods but is not a global guarantee; add Vercel Firewall rate limiting for a hard cap.
const buckets = new Map();
const MAX_KEYS = 5000;

// Allow `limit` hits per `windowMs` for `key`. Returns { ok, retryAfter } (seconds).
function hit(key, limit, windowMs, now = Date.now()) {
  if (buckets.size > MAX_KEYS) {
    for (const [k, v] of buckets) if (!v.some((t) => now - t < windowMs)) buckets.delete(k);
    if (buckets.size > MAX_KEYS) buckets.clear();
  }
  const recent = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (recent.length >= limit) {
    buckets.set(key, recent);
    return { ok: false, retryAfter: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
  }
  recent.push(now);
  buckets.set(key, recent);
  return { ok: true, retryAfter: 0 };
}

const forget = (key) => buckets.delete(key);
const reset = () => buckets.clear();
module.exports = { hit, forget, reset };
