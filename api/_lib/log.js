'use strict';
// Structured logging: one JSON object per line, picked up by Vercel log drains.
// Never pass names, phones, free text or secrets in `fields`.
const emit = (level, msg, fields) => {
  const line = JSON.stringify({ level, msg, ...fields, t: new Date().toISOString() });
  (level === 'error' || level === 'warn' ? console.error : console.log)(line);
};
module.exports = {
  info: (msg, fields) => emit('info', msg, fields),
  warn: (msg, fields) => emit('warn', msg, fields),
  error: (msg, fields) => emit('error', msg, fields),
};
