import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';

const photos = JSON.parse(readFileSync('src/entities/family-photo/photos.json', 'utf8'));

test('gallery includes every supplied PNG once with previews and alt text in both languages', () => {
  const originals = readdirSync('public/pictures').filter(file => file.endsWith('.png')).sort();
  assert.ok(originals.length > 0);
  assert.deepEqual(photos.map(photo => photo.file).sort(), originals);
  assert.equal(new Set(photos.map(photo => photo.file)).size, photos.length);
  for (const photo of photos) {
    assert.ok(photo.alt.pt.trim() && photo.alt.en.trim());
    assert.ok(photo.width > 0 && photo.height > 0);
    for (const path of [photo.thumbnail, photo.full]) {
      assert.ok(existsSync(`public/${path}`), path);
      assert.ok(statSync(`public/${path}`).size < statSync(`public/pictures/${photo.file}`).size, path);
    }
  }
});
