'use strict';
// Environment validation. Read once per instance; never log values (the webhook URL is a secret).
//   BITRIX_WEBHOOK_URL       https://<portal>.bitrix24.kz/rest/<user>/<code>/   (required, secret)
//   BITRIX_DEAL_CATEGORY_ID  deal pipeline id, or "lead" to create leads        (optional, default from site.js)
//   BITRIX_DEAL_STAGE_ID     deal stage, e.g. C5:NEW                            (optional)
//   BITRIX_STATUS_ID         lead status, e.g. NEW                              (optional)
//   BITRIX_SOURCE_ID         source, e.g. WEB                                   (optional)
//   BITRIX_ASSIGNED_BY_ID    responsible user id                                (optional)
const site = require('./site');

function load(env = process.env) {
  const errors = [];
  const get = (k) => (env[k] || '').trim();

  // Accept the URL with or without a method on the end (…/profile.json, …/crm.lead.add).
  const raw = get('BITRIX_WEBHOOK_URL');
  const re = /^https:\/\/[^/\s]+\/rest\/\d+\/[^/\s]+\//;
  const m = raw.match(re) || (raw + '/').match(re);
  if (!m) errors.push('BITRIX_WEBHOOK_URL');

  const optional = (k, re) => {
    const v = get(k);
    if (v && !re.test(v)) errors.push(k);
    return v;
  };
  const category = optional('BITRIX_DEAL_CATEGORY_ID', /^(\d+|lead)$/) || site.defaultDealCategory;
  const config = {
    webhook: m ? m[0] : '',
    category,
    dealStageId: optional('BITRIX_DEAL_STAGE_ID', /^[A-Za-z0-9_:]+$/),
    statusId: optional('BITRIX_STATUS_ID', /^[A-Za-z0-9_:]+$/),
    sourceId: optional('BITRIX_SOURCE_ID', /^[A-Za-z0-9_:]+$/),
    assignedById: optional('BITRIX_ASSIGNED_BY_ID', /^\d+$/),
  };
  return errors.length ? { ok: false, invalid: errors } : { ok: true, config };
}

let cached;
const get = () => (cached ||= load());
module.exports = { load, get, _reset: () => (cached = undefined) };
