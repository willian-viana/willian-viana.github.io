import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const result = spawnSync('pnpm', ['exec', 'vite', 'build', '--ssr', 'tests/fixtures/render-locales.tsx', '--outDir', '.test-build', '--logLevel', 'warn'], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stdout + result.stderr);
const { renderPage, renderCard, renderForm, giftCatalog, giftPrice } = await import(pathToFileURL(resolve('.test-build/render-locales.js')).href);
const original = JSON.parse(readFileSync('src/entities/gift/catalog.json', 'utf8'));
const english = JSON.parse(readFileSync('src/entities/gift/catalog.en.json', 'utf8'));
const content = JSON.parse(readFileSync('src/entities/event/content.en.json', 'utf8'));

test('Portuguese retains the original welcome, attendance and original BRL catalog', () => {
  const html = renderPage('pt');
  assert.ok(html.includes(original.event.welcomeMessage));
  assert.ok(html.includes('Confirmar presença'));
  assert.ok(html.includes(original.event.location));
  assert.deepEqual(giftCatalog('pt'), original.items);
  assert.match(giftPrice(original.items[0], 'pt'), /^R\$/);
  assert.match(renderForm('pt', true), /Vou, com certeza/);
});

test('English has independent placeholder content and no attendance UI or event logistics', () => {
  const html = renderPage('en');
  assert.ok(html.includes(content.welcomeMessage || 'English welcome message coming soon.'));
  for (const forbidden of ['#presenca', 'Confirmar presença', 'Presença', 'Você vem?', 'companions', original.event.location, original.event.welcomeMessage]) {
    assert.ok(!html.includes(forbidden), forbidden);
  }
  const form = renderForm('en', true);
  assert.ok(form.includes('Your message'));
  assert.ok(!form.includes('name="attending"'));
  assert.ok(!form.includes('acompanhante'));
});

test('English prices and links are independent and use USD once configured', () => {
  const gifts = giftCatalog('en');
  assert.equal(gifts.length, original.items.length);
  assert.equal(new Set(gifts.map(gift => gift.id)).size, gifts.length);
  for (const gift of gifts) {
    assert.ok(original.items.some(source => source.id === gift.id && source.photoUrl === gift.photoUrl));
    const configured = english.find(source => source.id === gift.id);
    assert.equal(gift.name, configured.name);
    assert.equal(gift.description, configured.description);
    assert.equal(gift.priceCents, configured.priceCents);
    assert.equal(gift.paymentUrl, configured.paymentUrl);
    assert.ok(gift.priceCents === null || Number.isInteger(gift.priceCents) && gift.priceCents > 0);
    assert.ok(gift.paymentUrl === null || new URL(gift.paymentUrl).protocol === 'https:');
  }
  const configured = { ...gifts[0], priceCents: 1234, paymentUrl: 'https://payments.example.com/international-test' };
  assert.equal(giftPrice(configured, 'en'), '$12.34');
  assert.ok(renderCard(configured, 'en').includes('$12.34'));
  assert.equal(giftCatalog('pt')[0].priceCents, original.items[0].priceCents);
  const placeholder = renderCard({ ...gifts[0], priceCents: null, paymentUrl: null }, 'en');
  assert.ok(placeholder.includes('USD price coming soon'));
  assert.ok(!placeholder.includes('R$'));
});

test('GitHub Pages contains real localized entrypoints that reference root assets', () => {
  const root = readFileSync('dist/index.html', 'utf8');
  for (const [locale, lang] of [['pt', 'pt-BR'], ['en', 'en']]) {
    const html = readFileSync(`dist/${locale}/index.html`, 'utf8');
    assert.ok(html.includes(`lang="${lang}"`));
    assert.equal(html.replace(`lang="${lang}"`, 'lang="pt-BR"'), root);
    assert.match(html, /src="\/assets\/[^\"]+\.js"/);
  }
});
