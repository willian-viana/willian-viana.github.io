import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
const catalog=JSON.parse(readFileSync(new URL('../src/entities/gift/catalog.json',import.meta.url)));
test('complete local catalog with safe payment links',()=>{assert.equal(catalog.items.length,29);assert.equal(new Set(catalog.items.map(x=>x.id)).size,29);for(const item of catalog.items){assert.ok(item.name.trim());assert.ok(Number.isInteger(item.priceCents)&&item.priceCents>0);assert.ok(existsSync(`public${item.photoUrl}`));assert.ok(!item.paymentUrl||new URL(item.paymentUrl).protocol==='https:');}});
