import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventCountdown } from '../src/entities/event/countdown.ts';

test('countdown follows the event calendar in São Paulo', () => {
  assert.equal(eventCountdown('2026-12-19', new Date('2026-10-29T20:00:00Z')), 'faltam 51 dias');
  assert.equal(eventCountdown('2026-12-19', new Date('2026-12-19T02:59:00Z')), 'falta 1 dia');
  assert.equal(eventCountdown('2026-12-19', new Date('2026-12-19T03:00:00Z')), 'É hoje!');
  assert.equal(eventCountdown('2026-12-19', new Date('2026-12-20T03:00:00Z')), null);
});
