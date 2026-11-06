'use strict';
// Outgoing mail for the results cabinet. Production: Resend REST API (RESEND_API_KEY + MAIL_FROM).
// Local development without a key: the letter is printed to the console and appended to .data/dev-mail.log.
const fs = require('node:fs');
const path = require('node:path');

const TIMEOUT_MS = 6000;
const SITE = 'https://fibonacci-olympiads.kz/results';

const TEXT = {
  ru: {
    subject: 'Пароль для входа в личный кабинет — Fibonacci Olympiad',
    hi: 'Здравствуйте!',
    body: 'Вы запросили доступ к результатам олимпиады Fibonacci International Maths Olympiad.',
    login: 'Логин',
    pass: 'Пароль',
    hint: 'Войдите на странице результатов. Пароль можно сменить в личном кабинете.',
    btn: 'Открыть результаты',
    ignore: 'Если вы не запрашивали пароль, просто проигнорируйте это письмо.',
  },
  kk: {
    subject: 'Жеке кабинетке кіру құпиясөзі — Fibonacci Olympiad',
    hi: 'Сәлеметсіз бе!',
    body: 'Сіз Fibonacci International Maths Olympiad нәтижелеріне қол жеткізуді сұрадыңыз.',
    login: 'Логин',
    pass: 'Құпиясөз',
    hint: 'Нәтижелер бетінде кіріңіз. Құпиясөзді жеке кабинетте өзгертуге болады.',
    btn: 'Нәтижелерді ашу',
    ignore: 'Егер сіз құпиясөз сұрамаған болсаңыз, бұл хатты елемеңіз.',
  },
  en: {
    subject: 'Your sign-in password — Fibonacci Olympiad',
    hi: 'Hello!',
    body: 'You requested access to the Fibonacci International Maths Olympiad results.',
    login: 'Login',
    pass: 'Password',
    hint: 'Sign in on the results page. You can change the password in your account.',
    btn: 'Open results',
    ignore: 'If you did not request a password, just ignore this email.',
  },
};

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function passwordLetter(email, password, lang) {
  const t = TEXT[lang] || TEXT.ru;
  // No e-mail in the link: page URLs end up in analytics.
  const url = SITE + '?lang=' + (TEXT[lang] ? lang : 'ru');
  const text = [t.hi, '', t.body, '', `${t.login}: ${email}`, `${t.pass}: ${password}`, '', t.hint, url, '', t.ignore].join('\n');
  const html = `<!doctype html><html><body style="margin:0;background:#F4F2EF;font-family:Arial,Helvetica,sans-serif;color:#0E0E0E">
<div style="max-width:520px;margin:0 auto;padding:32px 20px">
<div style="background:#fff;border:1px solid #E6E1DA;border-radius:16px;padding:28px">
<p style="margin:0 0 6px;font-size:13px;letter-spacing:.08em;text-transform:uppercase;color:#6E6860">Fibonacci International Maths Olympiad</p>
<p style="margin:0 0 14px;font-size:16px">${esc(t.hi)}</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">${esc(t.body)}</p>
<table style="border-collapse:collapse;margin:0 0 18px;font-size:15px">
<tr><td style="padding:4px 14px 4px 0;color:#6E6860">${esc(t.login)}</td><td style="padding:4px 0;font-weight:bold">${esc(email)}</td></tr>
<tr><td style="padding:4px 14px 4px 0;color:#6E6860">${esc(t.pass)}</td><td style="padding:4px 0;font-weight:bold;font-size:24px;letter-spacing:.2em">${esc(password)}</td></tr>
</table>
<p style="margin:0 0 20px;font-size:14px;line-height:1.5;color:#6E6860">${esc(t.hint)}</p>
<a href="${esc(url)}" style="display:inline-block;background:#E1001B;color:#fff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:10px">${esc(t.btn)}</a>
<p style="margin:22px 0 0;font-size:12px;color:#6E6860">${esc(t.ignore)}</p>
</div></div></body></html>`;
  return { subject: t.subject, text, html };
}

async function send(cfg, to, letter) {
  if (cfg.dev) {
    const line = `\n=== ${new Date().toISOString()} → ${to}\n${letter.subject}\n${letter.text}\n`;
    console.log('[dev mail]' + line);
    try {
      const f = path.join(__dirname, '..', '..', '.data', 'dev-mail.log');
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.appendFileSync(f, line);
    } catch {}
    return { id: 'dev' };
  }
  const r = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + cfg.resendKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: cfg.from, to: [to], subject: letter.subject, text: letter.text, html: letter.html }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok || !data.id) {
    const e = new Error(`mail: ${r.status} ${data.name || ''}`.trim());
    e.mailStatus = r.status;
    throw e;
  }
  return data;
}

module.exports = { passwordLetter, send };
