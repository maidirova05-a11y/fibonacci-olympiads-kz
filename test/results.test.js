'use strict';
// npm test — results cabinet (api/results/*) against an in-memory store and a captured mailer.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

delete process.env.VERCEL;
delete process.env.RESEND_API_KEY;
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.KV_REST_API_URL;
process.env.RESULTS_SESSION_SECRET = 'test-secret-test-secret-test-secret-123';

const store = require('../api/_lib/store');
const mailer = require('../api/_lib/mailer');
const limiter = require('../api/_lib/ratelimit');
const results = require('../api/_lib/results');
const auth = require('../api/_lib/auth');
const H = {
  request: require('../api/results/request-password'),
  login: require('../api/results/login'),
  me: require('../api/results/me'),
  change: require('../api/results/change-password'),
  logout: require('../api/results/logout'),
};

const ORIGIN = 'https://fibonacci-olympiads.kz';
let mails, db, cookie;

function call(h, body, over = {}) {
  const req = {
    method: over.method || 'POST',
    headers: { origin: ORIGIN, 'content-type': 'application/json', 'x-forwarded-for': over.ip || '1.2.3.4', cookie: over.cookie ?? cookie, ...over.headers },
    body,
  };
  const out = { headers: {} };
  const res = {
    headersSent: false,
    setHeader: (k, v) => (out.headers[k.toLowerCase()] = v),
    getHeader: (k) => out.headers[k.toLowerCase()],
    status: (c) => ((out.status = c), res),
    json: (b) => ((out.body = b), res),
    end: () => res,
  };
  return H[h](req, res).then(() => {
    const sc = out.headers['set-cookie'];
    if (sc) cookie = sc.split(';')[0];
    return out;
  });
}
const lastPassword = () => mails.at(-1).letter.text.match(/(?:Пароль|Құпиясөз|Password): (\d{6})/)[1];

test.beforeEach(async () => {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'res-')), 'db.json');
  db = store.fileStore(file);
  store._set(db);
  limiter.reset();
  cookie = '';
  mails = [];
  mailer.send = async (cfg, to, letter) => (mails.push({ to, letter }), { id: 'x' });
  await db.set(results.key.people('parent@mail.ru'), JSON.stringify([{ code: '260002', name: 'Серікбай Ардана', score: 55, grade: '3', school: 'Binom', city: 'Астана', stage: '17.10.2026, Астана', lang: 'kk' }]));
});

test('6-digit password generator', () => {
  for (let i = 0; i < 200; i++) assert.match(auth.newPassword(), /^\d{6}$/);
});

test('full flow: request → login → me → change password → old password fails', async () => {
  let r = await call('request', { email: '  Parent@Mail.ru ', lang: 'ru' });
  assert.equal(r.status, 200);
  assert.equal(mails.length, 1);
  assert.equal(mails[0].to, 'parent@mail.ru');
  const pw = lastPassword();
  assert.match(pw, /^\d{6}$/);

  r = await call('me', {});
  assert.equal(r.status, 401);

  r = await call('login', { email: 'parent@mail.ru', password: '000000' === pw ? '111111' : '000000' });
  assert.equal(r.status, 401);
  assert.equal(r.body.error, 'credentials');

  r = await call('login', { email: 'PARENT@mail.ru', password: pw });
  assert.equal(r.status, 200);
  assert.match(r.headers['set-cookie'], /HttpOnly/);
  assert.match(r.headers['set-cookie'], /SameSite=Strict/);

  r = await call('me', {});
  assert.equal(r.status, 200);
  assert.equal(r.body.participants[0].score, 55);
  assert.equal(r.body.participants[0].name, 'Серікбай Ардана');
  assert.equal(r.body.customPassword, false);

  r = await call('change', { current: 'wrong1', password: 'mysecret' });
  assert.equal(r.body.error, 'current');
  r = await call('change', { current: pw, password: '123' });
  assert.equal(r.body.error, 'weak');
  const before = cookie;
  r = await call('change', { current: pw, password: 'mysecret' });
  assert.equal(r.status, 200);

  // the old session cookie is invalidated, the new one works
  assert.equal((await call('me', {}, { cookie: before })).status, 401);
  assert.equal((await call('me', {})).body.customPassword, true);

  cookie = '';
  assert.equal((await call('login', { email: 'parent@mail.ru', password: pw })).status, 401);
  assert.equal((await call('login', { email: 'parent@mail.ru', password: 'mysecret' })).status, 200);

  r = await call('logout', {});
  assert.match(r.headers['set-cookie'], /Max-Age=0/);
});

test('only e-mails from the sheet get a letter; the answer does not tell which are there', async () => {
  const r = await call('request', { email: 'stranger@mail.ru' });
  assert.equal(r.status, 200);
  assert.equal(mails.length, 0);
  assert.equal((await call('login', { email: 'stranger@mail.ru', password: '123456' })).status, 401);
  assert.equal((await call('request', { email: 'not-an-email' })).body.error, 'email');
});

test('password e-mail: once a minute, five a day; letter in the chosen language', async () => {
  assert.equal((await call('request', { email: 'parent@mail.ru', lang: 'kk' })).status, 200);
  assert.match(mails[0].letter.subject, /құпиясөзі/);
  const r = await call('request', { email: 'parent@mail.ru' });
  assert.equal(r.status, 429);
  assert.equal(r.body.error, 'mail_wait');
  for (let i = 0; i < 4; i++) {
    await db.del(results.key.mailGap('parent@mail.ru'));
    assert.equal((await call('request', { email: 'parent@mail.ru' }, { ip: '9.9.9.' + i })).status, 200);
  }
  await db.del(results.key.mailGap('parent@mail.ru'));
  assert.equal((await call('request', { email: 'parent@mail.ru' }, { ip: '8.8.8.8' })).body.error, 'mail_daily');
});

test('the latest code works; requesting a code does not reset the own password of the parent', async () => {
  await call('request', { email: 'parent@mail.ru' });
  const first = lastPassword();
  await db.del(results.key.mailGap('parent@mail.ru'));
  await call('request', { email: 'parent@mail.ru' });
  const second = lastPassword();
  assert.equal((await call('login', { email: 'parent@mail.ru', password: second })).status, 200);
  assert.equal((await call('change', { current: second, password: 'mysecret' })).status, 200);
  const session = cookie;

  // a stranger requests a new code: the parent's password and session keep working
  await db.del(results.key.mailGap('parent@mail.ru'));
  assert.equal((await call('request', { email: 'parent@mail.ru' }, { cookie: '' })).status, 200);
  const third = lastPassword();
  assert.equal((await call('me', {}, { cookie: session })).status, 200);
  cookie = '';
  assert.equal((await call('login', { email: 'parent@mail.ru', password: 'mysecret' })).status, 200);
  // the code itself is single-use: after signing in with it, it is gone and becomes the password
  cookie = '';
  await db.del(results.key.mailGap('parent@mail.ru'));
  await call('request', { email: 'parent@mail.ru' });
  const fourth = lastPassword();
  assert.equal((await call('login', { email: 'parent@mail.ru', password: fourth })).status, 200);
  assert.equal((await call('me', {}, { cookie: session })).status, 401, 'old sessions end once the code is used');
});

test('parallel requests send one letter', async () => {
  const rs = await Promise.all([1, 2, 3, 4, 5].map((i) => call('request', { email: 'parent@mail.ru' }, { ip: '7.7.7.' + i })));
  assert.equal(rs.filter((r) => r.status === 200).length, 1);
  assert.equal(mails.length, 1);
});

test('parallel wrong guesses cannot get past the limit', async () => {
  await call('request', { email: 'parent@mail.ru' });
  const pw = lastPassword();
  await call('login', { email: 'parent@mail.ru', password: pw });
  assert.equal((await call('change', { current: pw, password: 'mysecret' })).status, 200);
  cookie = '';
  const rs = await Promise.all(Array.from({ length: 30 }, (_, i) => call('login', { email: 'parent@mail.ru', password: 'guess' + i }, { ip: '4.4.' + i + '.1' })));
  assert.equal(rs.filter((r) => r.status === 401).length, results.limits.FAIL_LIMIT);
  assert.equal(rs.filter((r) => r.body.error === 'locked').length, 30 - results.limits.FAIL_LIMIT);
  // locked: even the right password waits, but a fresh code from the mail opens the account
  assert.equal((await call('login', { email: 'parent@mail.ru', password: 'mysecret' })).body.error, 'locked');
  await db.del(results.key.mailGap('parent@mail.ru'));
  await call('request', { email: 'parent@mail.ru' });
  assert.equal((await call('login', { email: 'parent@mail.ru', password: lastPassword() })).status, 200);
});

test('a mailed code is burnt after ten wrong tries', async () => {
  await call('request', { email: 'parent@mail.ru' });
  const pw = lastPassword();
  for (let i = 0; i < results.limits.OTP_TRIES; i++) await call('login', { email: 'parent@mail.ru', password: 'x' + i });
  assert.notEqual((await call('login', { email: 'parent@mail.ru', password: pw })).status, 200);
});

test('addresses removed from the sheet cannot sign in', async () => {
  await call('request', { email: 'parent@mail.ru' });
  const pw = lastPassword();
  await db.del(results.key.people('parent@mail.ru'));
  assert.equal((await call('login', { email: 'parent@mail.ru', password: pw })).status, 401);
});

test('failed mail keeps the previous password working', async () => {
  await call('request', { email: 'parent@mail.ru' });
  const pw = lastPassword();
  await db.del(results.key.mailGap('parent@mail.ru'));
  mailer.send = async () => { throw new Error('down'); };
  assert.equal((await call('request', { email: 'parent@mail.ru' })).status, 502);
  assert.equal(await db.get(results.key.mailGap('parent@mail.ru')), null, 'a failed letter frees the one-minute slot');
  assert.equal((await call('login', { email: 'parent@mail.ru', password: pw })).status, 200);
});

test('brute force: account locks after 10 wrong passwords', async () => {
  await call('request', { email: 'parent@mail.ru' });
  const pw = lastPassword();
  const wrong = pw === '999999' ? '999998' : '999999';
  for (let i = 0; i < results.limits.FAIL_LIMIT; i++) {
    assert.equal((await call('login', { email: 'parent@mail.ru', password: wrong }, { ip: '5.5.5.' + i })).status, 401);
  }
  const r = await call('login', { email: 'parent@mail.ru', password: pw }, { ip: '6.6.6.6' });
  assert.equal(r.status, 429);
  assert.equal(r.body.error, 'locked');
});

test('forged or foreign session cookie is rejected', async () => {
  const forged = auth.issueSession('another-secret-another-secret-12345', 'parent@mail.ru', 'v');
  assert.equal((await call('me', {}, { cookie: 'fib_res=' + forged })).status, 401);
  assert.equal((await call('me', {}, { cookie: 'fib_res=garbage' })).status, 401);
});

test('origin, method and content type are enforced', async () => {
  assert.equal((await call('login', {}, { headers: { origin: 'https://evil.example' } })).status, 403);
  assert.equal((await call('login', {}, { headers: { origin: undefined } })).status, 403);
  assert.equal((await call('login', {}, { method: 'GET' })).status, 405);
  assert.equal((await call('login', {}, { headers: { 'content-type': 'text/plain' } })).status, 415);
});

test('config: production requires Redis, Resend and a session secret', () => {
  store._reset();
  const c = results.config({ VERCEL: '1' });
  assert.equal(c.ok, false);
  assert.deepEqual(c.invalid.sort(), ['MAIL_FROM', 'RESEND_API_KEY', 'RESULTS_SESSION_SECRET', 'UPSTASH_REDIS_REST_URL'].sort());
  store._reset();
  const ok = results.config({ VERCEL: '1', RESULTS_SESSION_SECRET: 'x'.repeat(40), RESEND_API_KEY: 're_abc', MAIL_FROM: 'Fibonacci <results@fibonacci-olympiads.kz>', KV_REST_API_URL: 'https://x.upstash.io', KV_REST_API_TOKEN: 't' });
  assert.equal(ok.ok, true);
  assert.equal(ok.db.kind, 'redis');
  store._set(db);
});

test('Upstash REST client: pipeline shape and errors', async () => {
  const calls = [];
  const saved = global.fetch;
  global.fetch = async (u, o) => {
    calls.push([u, o.headers.Authorization, JSON.parse(o.body)]);
    return { ok: true, status: 200, json: async () => JSON.parse(o.body).map((c) => ({ result: c[0] === 'INCR' ? 3 : 'OK' })) };
  };
  try {
    const r = store.redisStore({ url: 'https://x.upstash.io', token: 'tok' });
    assert.equal(await r.set('k', 'v', 60), 'OK');
    assert.equal(await r.incr('n', 30), 3);
    assert.deepEqual(calls[0], ['https://x.upstash.io/pipeline', 'Bearer tok', [['SET', 'k', 'v', 'EX', '60']]]);
    assert.deepEqual(calls[1][2], [['INCR', 'n'], ['EXPIRE', 'n', '30', 'NX']]);
    global.fetch = async () => ({ ok: true, status: 200, json: async () => [{ error: 'ERR' }] });
    await assert.rejects(r.get('k'));
  } finally {
    global.fetch = saved;
  }
});

test('codes from the last three letters work; an older one does not', async () => {
  const codes = [];
  for (let i = 0; i < 4; i++) {
    await db.del(results.key.mailGap('parent@mail.ru'));
    await call('request', { email: 'parent@mail.ru' });
    codes.push(lastPassword());
  }
  const oldest = codes[0];
  if (!codes.slice(1).includes(oldest)) assert.equal((await call('login', { email: 'parent@mail.ru', password: oldest })).status, 401);
  // the parent types the code from the second of the last three letters: accepted
  assert.equal((await call('login', { email: 'parent@mail.ru', password: codes[2] })).status, 200);
  // once a code is used, the others are gone
  cookie = '';
  if (codes[3] !== codes[2]) assert.equal((await call('login', { email: 'parent@mail.ru', password: codes[3] })).status, 401);
});

test('an older single-code record is still accepted', async () => {
  await db.set(results.key.otp('parent@mail.ru'), JSON.stringify({ h: await auth.hashPassword('424242'), t: '' }));
  assert.equal((await call('login', { email: 'parent@mail.ru', password: '424242' })).status, 200);
});
