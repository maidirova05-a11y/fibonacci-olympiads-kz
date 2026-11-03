'use strict';
// Bitrix24 REST client + lead creation. The only module that talks to the CRM.
const site = require('./site');

const TIMEOUT_MS = 4500; // two sequential calls must fit in maxDuration (vercel.json)

async function call(webhook, method, fields) {
  const r = await fetch(webhook + method + '.json', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fields, params: { REGISTER_SONET_EVENT: 'Y' } }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.result) {
    const e = new Error(`${method}: ${r.status} ${data.error || ''}`.trim());
    e.bitrixStatus = r.status;
    throw e;
  }
  return data.result;
}

// Creates contact + deal (or a single lead when category is "lead"). Returns { contactId?, id }.
async function createLead(config, lead) {
  const common = {
    COMMENTS: [
      lead.question && 'Вопрос: ' + lead.question,
      'Язык сайта: ' + lead.lang,
      lead.page && 'Страница: ' + lead.page,
      lead.referrer && 'Источник перехода: ' + lead.referrer,
    ].filter(Boolean).join('\n'),
    SOURCE_DESCRIPTION: site.sourceDescription,
    ...lead.utm,
  };
  if (config.sourceId) common.SOURCE_ID = config.sourceId;
  if (config.assignedById) common.ASSIGNED_BY_ID = config.assignedById;
  const title = site.dealTitlePrefix + lead.name;
  const contact = { NAME: lead.name, PHONE: [{ VALUE: lead.phone, VALUE_TYPE: 'WORK' }] };

  if (config.category === 'lead') {
    const l = { ...common, ...contact, TITLE: title };
    if (config.statusId) l.STATUS_ID = config.statusId;
    return { id: await call(config.webhook, 'crm.lead.add', l) };
  }
  const contactId = await call(config.webhook, 'crm.contact.add', {
    ...contact, SOURCE_ID: common.SOURCE_ID, ASSIGNED_BY_ID: common.ASSIGNED_BY_ID,
  });
  const deal = { ...common, TITLE: title, CATEGORY_ID: config.category, CONTACT_ID: contactId };
  if (config.dealStageId) deal.STAGE_ID = config.dealStageId;
  try {
    return { contactId, id: await call(config.webhook, 'crm.deal.add', deal) };
  } catch (e) {
    e.contactId = contactId; // lets the handler log the orphaned contact
    throw e;
  }
}

module.exports = { createLead };
