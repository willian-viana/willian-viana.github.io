import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectLocale, resolveLocale, localePath } from '../src/shared/i18n/locale.ts';

test('explicit locale URLs override saved preferences and IP-based locale', () => {
  assert.equal(resolveLocale('/pt', 'en', 'en'), 'pt');
  assert.equal(resolveLocale('/en/', 'pt', 'pt'), 'en');
});

test('root uses a manual preference, then IP-based locale, defaulting to Portuguese', () => {
  assert.equal(resolveLocale('/', 'pt', 'en'), 'pt');
  assert.equal(resolveLocale('/', 'en', 'pt'), 'en');
  assert.equal(resolveLocale('/', null, 'en'), 'en');
  assert.equal(resolveLocale('/', 'invalid', 'pt'), 'pt');
  assert.equal(resolveLocale('/', null), 'pt');
});

test('IP lookup validates the response and never includes credentials or caches a visitor locale', async t => {
  let body = { locale: 'en' };
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.example.com/api/locale');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.cache, 'no-store');
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json(body);
  });
  assert.equal(await detectLocale('https://api.example.com/'), 'en');
  for (body of [{ locale: 'pt' }, { locale: 'invalid' }, {}, null, 'en']) {
    assert.equal(await detectLocale('https://api.example.com'), 'pt');
  }
});

test('missing configuration, failed lookup, invalid JSON and timeout default to Portuguese', async t => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => { throw Error('Network unavailable'); });
  assert.equal(await detectLocale(undefined), 'pt');
  assert.equal(fetchMock.mock.callCount(), 0);
  assert.equal(await detectLocale('https://api.example.com'), 'pt');
  fetchMock.mock.mockImplementation(async () => new Response('', { status: 503 }));
  assert.equal(await detectLocale('https://api.example.com'), 'pt');
  fetchMock.mock.mockImplementation(async () => new Response('invalid JSON'));
  assert.equal(await detectLocale('https://api.example.com'), 'pt');
  t.mock.method(AbortSignal, 'timeout', ms => {
    assert.equal(ms, 3000);
    return AbortSignal.abort(new DOMException('Timed out', 'TimeoutError'));
  });
  fetchMock.mock.mockImplementation(async (_, options) => { options.signal.throwIfAborted(); });
  assert.equal(await detectLocale('https://api.example.com'), 'pt');
});

test('language switching preserves shared sections but never targets English attendance', () => {
  assert.equal(localePath('en', '#presentes'), '/en/#presentes');
  assert.equal(localePath('en', '#presenca'), '/en/#inicio');
  assert.equal(localePath('pt', '#presenca'), '/pt/#presenca');
});
