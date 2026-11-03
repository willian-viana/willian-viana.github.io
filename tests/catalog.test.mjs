import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../src/entities/gift/catalog.json',import.meta.url)));
test('complete local catalog with safe payment links',()=>{assert.equal(catalog.items.length,42);assert.equal(new Set(catalog.items.map(x=>x.id)).size,42);for(const item of catalog.items){assert.ok(item.name.trim());assert.ok(Number.isInteger(item.priceCents)&&item.priceCents>0);assert.ok(existsSync(`public${item.photoUrl}`));assert.ok(!item.paymentUrl||new URL(item.paymentUrl).protocol==='https:');}});

const english = JSON.parse(readFileSync(new URL('../src/entities/gift/catalog.en.json', import.meta.url)));

test('new gifts have both locales and sourced descriptions', () => {
  const ids = [
    'tramontina-century-24086108', 'electrolux-ekm40', 'electrolux-bse20',
    'electrolux-efp500', 'electrolux-eib20', 'electrolux-esg20', 'electrolux-ecp10',
    'tramontina-professional-62633207', 'tramontina-solar-62135247',
    'tokstok-hush-435952', 'tramontina-utilita-25685180',
    'acasa-cachepot-galinha-5548372',
    'linlight-utensilios-b0fvsz2jvr',
    'zara-home-pepper-mill-48221558',
  ];
  assert.equal(english.length, catalog.items.length);
  assert.equal(new Set(english.map(item => item.id)).size, english.length);
  for (const id of ids) {
    const pt = catalog.items.find(item => item.id === id);
    const en = english.find(item => item.id === id);
    assert.ok(pt && en, id);
    assert.equal(catalog.items.filter(item => item.externalUrl === pt.externalUrl).length, 1);
    assert.ok(pt.description.trim() && en.description.trim());
    assert.notEqual(en.name, pt.name);
    assert.notEqual(en.description, pt.description);
    assert.equal(new URL(pt.paymentUrl).protocol, 'https:');
    assert.equal(en.paymentUrl, null);
    assert.equal(new URL(pt.sourceImageUrl).protocol, 'https:');
  }
  assert.equal(catalog.items.filter(item => item.externalUrl?.includes('eaf85-')).length, 1);
});

test('every Brazilian product has an explicitly configured HTTPS payment link', () => {
  for (const gift of catalog.items) {
    assert.ok(gift.paymentUrl, gift.id);
    assert.equal(new URL(gift.paymentUrl).protocol, 'https:');
  }
});

test('only the approved scissors pair may share a Brazilian payment link', () => {
  const links = new Map();
  for (const gift of catalog.items) {
    const ids = links.get(gift.paymentUrl) || [];
    ids.push(gift.id);
    links.set(gift.paymentUrl, ids);
  }
  for (const ids of links.values()) {
    if (ids.length > 1) {
      assert.deepEqual(ids.slice().sort(), [
        '35447f99-4129-4232-9d1c-e010b782ed4d',
        '30d36e05-441b-4b60-8b72-73aaf42036fa',
      ].sort());
    }
  }
});
