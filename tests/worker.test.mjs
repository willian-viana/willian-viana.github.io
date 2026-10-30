import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../worker/src/index.ts';

const origin = 'https://willian-viana.github.io';
const validRsvp = { name: ' Ana ', attending: true, companions: [' Bruno '], turnstileToken: 'token' };
const validMessage = { name: 'Ana', message: 'Felicidades!', turnstileToken: 'token' };

function setup(t, { verify, emailStatus = 200, emailBody = { id: 'email-id' } } = {}) {
  const db = new DatabaseSync(':memory:');
  db.exec(readFileSync('worker/migrations/0001_create_rsvps.sql', 'utf8'));
  t.after(() => db.close());
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    if (url === 'https://challenges.cloudflare.com/turnstile/v0/siteverify') {
      const action = calls.expectedAction || 'rsvp';
      return Response.json(verify === undefined ? { success: true, hostname: new URL(origin).hostname, action } : verify);
    }
    assert.equal(url, 'https://api.resend.com/emails');
    return Response.json(emailBody, { status: emailStatus });
  });
  const env = {
    ALLOWED_ORIGINS: origin, ENVIRONMENT: 'production',
    TURNSTILE_SECRET_KEY: 'test-fixture-secret', RESEND_API_KEY: 'test-fixture-resend',
    RESEND_FROM: 'Event <event@example.com>', HOST_EMAIL: 'host@example.com',
    DB: {
      prepare(sql) {
        return { bind(...values) { return { async run() { db.prepare(sql).run(...values); return { success: true }; } }; } };
      },
    },
  };
  const send = (path = '/api/rsvp', body = validRsvp, headers = {}) => worker.fetch(new Request(`https://api.example.com${path}`, {
    method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body),
  }), env);
  return { db, env, calls, send };
}

test('RSVP stores trimmed names, all companions, attendance and UTC timestamp in the migration schema', async t => {
  const { db, send, calls } = setup(t);
  const response = await send();
  assert.equal(response.status, 201);
  assert.equal(response.headers.get('Access-Control-Allow-Origin'), origin);
  const result = await response.json();
  const row = db.prepare('SELECT * FROM rsvps WHERE id = ?').get(result.id);
  assert.equal(row.guest_name, 'Ana');
  assert.equal(row.attending, 1);
  assert.deepEqual(JSON.parse(row.companions_json), ['Bruno']);
  assert.match(row.created_at, /^\d{4}-\d\d-\d\dT.*Z$/);
  assert.equal(calls.length, 1);
  const form = calls[0].options.body;
  assert.equal(form.get('response'), 'token');
});

test('declines persist with no companions; SQL parameters keep guest text as data', async t => {
  const { db, send } = setup(t);
  const name = "Robert'); DROP TABLE rsvps;--";
  assert.equal((await send('/api/rsvp', { ...validRsvp, name, attending: false, companions: [] })).status, 201);
  const row = db.prepare('SELECT * FROM rsvps').get();
  assert.equal(row.guest_name, name);
  assert.equal(row.attending, 0);
  assert.equal(row.companions_json, '[]');
});

test('invalid field types, blank/long names, invalid companions and inconsistent declines have no side effects', async t => {
  const { send, calls, db } = setup(t);
  for (const body of [null, [], {}, { ...validRsvp, name: ' ' }, { ...validRsvp, name: 'a'.repeat(121) },
    { ...validRsvp, attending: 'true' }, { ...validRsvp, companions: 'Bruno' },
    { ...validRsvp, companions: Array(11).fill('Ana') }, { ...validRsvp, companions: [' '] },
    { ...validRsvp, companions: [3] }, { ...validRsvp, attending: false }, { ...validRsvp, turnstileToken: '' }]) {
    assert.equal((await send('/api/rsvp', body)).status, 400);
  }
  assert.equal(calls.length, 0);
  assert.equal(db.prepare('SELECT count(*) AS n FROM rsvps').get().n, 0);
});

test('unknown, malformed, oversized and non-JSON requests are rejected', async t => {
  const { send, env, calls } = setup(t);
  assert.equal((await send('/other')).status, 404);
  assert.equal((await send('/api/rsvp', validRsvp, { 'Content-Type': 'text/plain' })).status, 415);
  for (const [body, status] of [['{', 400], ['x'.repeat(16 * 1024 + 1), 413]]) {
    const response = await worker.fetch(new Request('https://api.example.com/api/rsvp', {
      method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body,
    }), env);
    assert.equal(response.status, status);
  }
  assert.equal((await send('/api/rsvp', validRsvp, { 'Content-Length': String(20 * 1024) })).status, 413);
  assert.equal(calls.length, 0);
});

test('CORS allows only exact configured origins and POST/Content-Type preflights', async t => {
  const { env, send, calls } = setup(t);
  for (const bad of ['https://willian-viana.github.io.evil.example', 'https://elsewhere.example', 'null', '']) {
    const response = await send('/api/rsvp', validRsvp, { Origin: bad });
    assert.equal(response.status, 403);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), null);
  }
  const preflight = headers => worker.fetch(new Request('https://api.example.com/api/rsvp', {
    method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'POST', 'Access-Control-Request-Headers': 'content-type', ...headers },
  }), env);
  const response = await preflight();
  assert.equal(response.status, 204);
  assert.equal(response.headers.get('Access-Control-Allow-Methods'), 'POST');
  assert.equal(response.headers.get('Vary'), 'Origin');
  assert.equal((await preflight({ 'Access-Control-Request-Method': 'DELETE' })).status, 403);
  assert.equal((await preflight({ 'Access-Control-Request-Headers': 'Authorization' })).status, 403);
  const method = await worker.fetch(new Request('https://api.example.com/api/rsvp', { headers: { Origin: origin } }), env);
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('Allow'), 'POST, OPTIONS');
  assert.equal(calls.length, 0);
});

for (const verify of [
  { success: false, 'error-codes': ['timeout-or-duplicate'] },
  { success: true, hostname: 'evil.example', action: 'rsvp' },
  { success: true, hostname: new URL(origin).hostname, action: 'message' },
]) {
  test(`Turnstile rejection or context mismatch blocks writes: ${JSON.stringify(verify)}`, async t => {
    const { send, calls, db } = setup(t, { verify });
    assert.equal((await send()).status, 403);
    assert.equal(calls.length, 1);
    assert.equal(db.prepare('SELECT count(*) AS n FROM rsvps').get().n, 0);
  });
}

test('provider outage and invalid Turnstile secret fail closed', async t => {
  const { send, db } = setup(t);
  t.mock.method(globalThis, 'fetch', async () => { throw Error('private upstream diagnostic'); });
  const response = await send();
  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes('private upstream diagnostic'));
  assert.equal(db.prepare('SELECT count(*) AS n FROM rsvps').get().n, 0);
});

test('official test secrets cannot enable a production bypass', async t => {
  const { send, env, calls } = setup(t);
  env.TURNSTILE_SECRET_KEY = '1x0000000000000000000000000000000AA';
  env.ENVIRONMENT = 'local';
  assert.equal((await send()).status, 503); // Even local mode cannot use dummy keys for a public origin.
  env.ENVIRONMENT = 'production';
  assert.equal((await send()).status, 503);
  assert.equal(calls.length, 0);
});

test('database errors return a retryable error rather than false success', async t => {
  const { send, env } = setup(t);
  env.DB.prepare = () => { throw Error('database internals'); };
  const response = await send();
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error.code, 'STORAGE_UNAVAILABLE');
});

test('message sends fixed sender/recipient and plain text to Resend after verification', async t => {
  const { send, calls } = setup(t);
  calls.expectedAction = 'message';
  const response = await send('/api/message', { ...validMessage, name: '<b>Ana</b>', message: '<script>hello</script>' });
  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), { ok: true });
  assert.equal(calls.length, 2);
  const email = JSON.parse(calls[1].options.body);
  assert.deepEqual(email.to, ['host@example.com']);
  assert.equal(email.from, 'Event <event@example.com>');
  assert.equal(email.subject, 'Novo recado — República da Brisinha');
  assert.equal(email.text, 'De: <b>Ana</b>\n\n<script>hello</script>');
  assert.equal(email.html, undefined);
});

test('invalid or unconfigured messages never contact providers', async t => {
  const { send, env, calls } = setup(t);
  for (const message of ['', ' ', 'a'.repeat(3001), 5]) {
    assert.equal((await send('/api/message', { ...validMessage, message })).status, 400);
  }
  env.RESEND_API_KEY = '';
  assert.equal((await send('/api/message', validMessage)).status, 503);
  assert.equal(calls.length, 0);
});

test('messages reach both configured hosts and ignore guest-supplied recipients', async t => {
  const { send, env, calls } = setup(t);
  calls.expectedAction = 'message';
  env.HOST_EMAIL = ' host@example.com, cohost@example.com ';
  const response = await send('/api/message', { ...validMessage, to: ['someone-else@example.com'] });
  assert.equal(response.status, 200);
  assert.deepEqual(JSON.parse(calls[1].options.body).to, ['host@example.com', 'cohost@example.com']);
});

test('empty or invalid recipient configuration fails before contacting providers', async t => {
  const { send, env, calls } = setup(t);
  for (const recipients of ['', ' ', 'host@example.com,', 'not-an-email', 'host@example.com,invalid']) {
    env.HOST_EMAIL = recipients;
    assert.equal((await send('/api/message', validMessage)).status, 503);
  }
  assert.equal(calls.length, 0);
});

for (const emailStatus of [429, 500]) {
  test(`Resend ${emailStatus} never produces false success or leaks provider errors`, async t => {
    const { send, calls } = setup(t, { emailStatus, emailBody: { message: 'private diagnostic' } });
    calls.expectedAction = 'message';
    const response = await send('/api/message', validMessage);
    assert.equal(response.status, 502);
    assert.ok(!(await response.text()).includes('private diagnostic'));
  });
}

test('migration rejects inconsistent attendance and non-array companion data', t => {
  const { db } = setup(t);
  for (const [attending, companions] of [[2, '[]'], [0, '["Ana"]'], [1, '{}'], [1, 'not json']]) {
    assert.throws(() => db.prepare('INSERT INTO rsvps (id, guest_name, attending, companions_json) VALUES (?, ?, ?, ?)').run(crypto.randomUUID(), 'Ana', attending, companions));
  }
});

for (const verify of [null, { success: 'true' }, { success: false, 'error-codes': ['invalid-input-secret'] }]) {
  test(`malformed or misconfigured Siteverify response fails closed: ${JSON.stringify(verify)}`, async t => {
    const { send, db } = setup(t, { verify });
    assert.equal((await send()).status, 503);
    assert.equal(db.prepare('SELECT count(*) AS n FROM rsvps').get().n, 0);
  });
}

test('a Resend response without an email ID cannot claim success', async t => {
  const { send, calls } = setup(t, { emailBody: {} });
  calls.expectedAction = 'message';
  assert.equal((await send('/api/message', validMessage)).status, 502);
});
