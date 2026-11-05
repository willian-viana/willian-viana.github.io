import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const result = spawnSync('pnpm', ['exec', 'vite', 'build', '--ssr', 'tests/fixtures/render-locales.tsx', '--outDir', '.test-build', '--logLevel', 'warn'], { encoding: 'utf8' });
assert.equal(result.status, 0, result.stdout + result.stderr);
const { renderPage, renderCard, renderForm, renderGallery, renderPayments, giftCatalog, giftPrice } = await import(pathToFileURL(resolve('.test-build/render-locales.js')).href);
const original = JSON.parse(readFileSync('src/entities/gift/catalog.json', 'utf8'));
const english = JSON.parse(readFileSync('src/entities/gift/catalog.en.json', 'utf8'));
const content = JSON.parse(readFileSync('src/entities/event/content.en.json', 'utf8'));
const photos = JSON.parse(readFileSync('src/entities/family-photo/photos.json', 'utf8'));

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
  const welcome = renderToStaticMarkup(createElement('p', { className: 'welcome-message' }, content.welcomeMessage || 'English welcome message coming soon.'));
  assert.ok(html.includes(welcome));
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

test('neither locale renders language-switching pills or links', () => {
  for (const locale of ['pt', 'en']) {
    const html = renderPage(locale);
    assert.ok(!html.includes('class="language-switcher"'));
    assert.ok(!/href="\/(pt|en)\//.test(html));
  }
});

test('both locales provide the family gallery with lazy previews and localized titles', () => {
  for (const [locale, title, tab] of [['pt', 'Fotos da nossa família', 'Fotos'], ['en', 'Our family pictures', 'Photos']]) {
    assert.ok(renderPage(locale).includes(`>${tab}</button>`));
    const html = renderGallery(locale);
    assert.ok(html.includes(title));
    assert.equal((html.match(/<img /g) || []).length, photos.length);
    for (const photo of photos) {
      assert.ok(html.includes(`src="/${photo.thumbnail}"`));
      assert.ok(!html.includes(photo.full));
      assert.ok(!html.includes(`/pictures/${photo.file}`));
    }
    assert.equal((html.match(/loading="lazy"/g) || []).length, photos.length);
  }
});

test('Brazilian Presentear opens options with the product checkout, copy action and mobile disclaimer', () => {
  for (const gift of giftCatalog('pt')) {
    const html = renderCard(gift, 'pt');
    assert.match(html, /<button[^>]*aria-label="Presentear:/);
    assert.ok(!/<a\b[^>]*>Presentear<\/a>/.test(html));
    assert.match(html, /<button[^>]*aria-label="Ver detalhes:/);
    const payments = renderPayments(gift, 'pt');
    const link = payments.match(/<a\b[^>]*>Abrir Mercado Pago<svg[\s\S]*?<\/a>/)?.[0];
    assert.ok(link, gift.id);
    assert.ok(link.includes(`href="${gift.paymentUrl}"`), gift.id);
    assert.ok(link.includes('target="_blank"'), gift.id);
    assert.ok(link.includes('rel="noopener noreferrer"'), gift.id);
    assert.ok(payments.includes(`<p class="payment-detail">${gift.paymentUrl}</p>`), gift.id);
    assert.ok(payments.includes('Copiar link de pagamento'), gift.id);
    assert.ok(payments.includes('Se o Mercado Pago tentar abrir o aplicativo ou fechar a página, copie o link de pagamento e cole diretamente no navegador do seu celular.'), gift.id);
    assert.ok(payments.includes('https://wise.com/pay/me/willianb67'));
    assert.ok(payments.includes('Copiar Wisetag'));
    assert.ok(!payments.includes('paypal.com'));
    assert.ok(!payments.includes('QR code'));
  }
});

test('English gift actions keep opening details and never use Brazilian checkout links', () => {
  for (const gift of giftCatalog('en')) {
    const html = renderCard(gift, 'en');
    assert.ok(!html.includes('https://mpago.la/'), gift.id);
    assert.ok(!/<a\b[^>]*>Give this gift<\/a>/.test(html), gift.id);
    assert.match(html, /<button[^>]*aria-label="Give this gift:/);
  }
  const pt = giftCatalog('pt')[0];
  const pending = renderCard({ ...pt, paymentUrl: null }, 'pt');
  assert.ok(!/<a\b[^>]*>Presentear<\/a>/.test(pending));
  assert.match(pending, /<button[^>]*aria-label="Presentear:/);
});

test('international contributions use the supplied PayPal and Wise details', () => {
  const html = renderPayments(giftCatalog('en')[0], 'en');
  for (const url of ['https://www.paypal.com/myaccount/transfer/send', 'https://wise.com/pay/me/willianb67']) {
    const link = html.match(new RegExp(`<a[^>]*href="${url.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>`))?.[0];
    assert.ok(link, url);
    assert.ok(link.includes('target="_blank"'));
    assert.ok(link.includes('rel="noopener noreferrer"'));
  }
  for (const text of ['PayPal', 'Wise', 'Copy email', 'Copy Wisetag', 'willian.batista.viana@gmail.com', '@willianb67', 'Amount of your choice']) {
    assert.ok(html.includes(text), text);
  }
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('QR code'));
  assert.ok(!html.includes('International payment link coming soon'));
  assert.ok(!html.includes('mpago.la'));
  assert.ok(!html.includes('Mercado Pago'));
});
