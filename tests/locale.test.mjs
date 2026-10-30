import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLocale, localePath } from '../src/shared/i18n/locale.ts';

test('explicit locale URLs override saved preferences and browser languages', () => {
  assert.equal(resolveLocale('/pt', 'en', ['en-US']), 'pt');
  assert.equal(resolveLocale('/en/', 'pt', ['pt-BR']), 'en');
});

test('root uses a valid preference, then supported browser languages, then English', () => {
  assert.equal(resolveLocale('/', 'pt', ['en-US']), 'pt');
  assert.equal(resolveLocale('/', null, ['pt-BR', 'en']), 'pt');
  assert.equal(resolveLocale('/', 'invalid', ['fr-FR', 'en-GB']), 'en');
  assert.equal(resolveLocale('/', null, ['fr-FR']), 'en');
});

test('language switching preserves shared sections but never targets English attendance', () => {
  assert.equal(localePath('en', '#presentes'), '/en/#presentes');
  assert.equal(localePath('en', '#presenca'), '/en/#inicio');
  assert.equal(localePath('pt', '#presenca'), '/pt/#presenca');
});
