'use strict';
// Input validation and sanitising. Everything from the request body goes through here.

// Only strings/numbers count as input (objects would become "[object Object]").
// C0/C1 controls and Unicode line/paragraph separators are blanked so a field cannot add lines to COMMENTS.
const clean = (v, max) =>
  (typeof v === 'string' || typeof v === 'number' ? String(v) : '')
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]/g, ' ')
    .trim()
    .slice(0, max);

// Only absolute http(s) URLs are kept, anything else is dropped.
const httpUrl = (v, max) => {
  const s = clean(v, max);
  try {
    return /^https?:$/.test(new URL(s).protocol) ? s : '';
  } catch {
    return '';
  }
};

const UTM = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const LANGS = ['ru', 'kk', 'en'];

// Returns { value } or { error, field }.
function parseLead(b) {
  const name = clean(b.name, 100);
  if (!name) return { error: 'name', field: 'name' };
  const phone = clean(b.phone, 32);
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 10 || digits.length > 15) {
    return { error: 'phone', field: 'phone' };
  }
  const utm = {};
  for (const k of UTM) {
    const v = clean(b[k], 200);
    if (v) utm[k.toUpperCase()] = v;
  }
  return {
    value: {
      name,
      phone,
      digits,
      question: clean(b.question, 1000),
      lang: LANGS.includes(b.lang) ? b.lang : 'ru',
      page: httpUrl(b.page, 500),
      referrer: httpUrl(b.referrer, 500),
      utm,
    },
  };
}

module.exports = { clean, httpUrl, parseLead };
