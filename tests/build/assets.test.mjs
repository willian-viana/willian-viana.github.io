import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

test('Pages artifact references compiled JavaScript instead of the TSX entrypoint', () => {
  const html = readFileSync('dist/index.html', 'utf8');
  const scripts = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map(match => match[1]);
  assert.ok(scripts.length > 0);
  for (const path of scripts) {
    assert.match(path, /^\/assets\/.+\.js$/);
    assert.ok(existsSync(`dist${path}`));
  }
  assert.ok(!html.includes('/src/app/main.tsx'));
});
