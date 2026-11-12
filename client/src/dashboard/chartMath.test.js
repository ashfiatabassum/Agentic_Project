// Client unit tests (M6, E93): pure dashboard helpers. Run with `npm run test:client`.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatPrice, labelStep, niceMax, summarise, ticksFor } from './chartMath.js';

test('niceMax: small values use 0–4; larger ones round up to a value with a whole middle tick', () => {
  for (const [max, top] of [[0, 4], [3, 4], [4, 4], [5, 10], [9, 10], [10, 10], [11, 20], [24, 50], [25, 50], [51, 100], [101, 200], [999, 1000]]) {
    assert.equal(niceMax(max), top, `max ${max}`);
    assert.ok(Number.isInteger(top / 2), `whole middle tick for ${top}`);
  }
});

test('ticksFor: five ticks up to 4, otherwise 0, half, top', () => {
  assert.deepEqual(ticksFor(4), [0, 1, 2, 3, 4]);
  assert.deepEqual(ticksFor(50), [0, 25, 50]);
});

test('summarise: total and busiest day, or a no-data sentence', () => {
  const daily = [{ date: '2026-11-10', count: 1 }, { date: '2026-11-11', count: 4 }, { date: '2026-11-12', count: 0 }];
  assert.equal(summarise(daily, 7), '5 testimonials in the last 7 days; busiest day 11 Nov with 4.');
  assert.equal(summarise([{ date: '2026-11-12', count: 1 }], 7), '1 testimonial in the last 7 days; busiest day 12 Nov with 1.');
  assert.equal(summarise([{ date: '2026-11-12', count: 0 }], 30), 'No testimonials in the last 30 days.');
});

test('labelStep: every label when there is room, fewer on narrow charts', () => {
  assert.equal(labelStep(7, 900), 1);
  assert.equal(labelStep(30, 900), 2);
  assert.equal(labelStep(30, 300), 6);
  assert.equal(labelStep(30, 0), 30);
});

test('formatPrice: minor units with the currency symbol', () => {
  assert.equal(formatPrice(99900, 'BDT'), '৳999');
  assert.equal(formatPrice(0, 'BDT'), '৳0');
  assert.equal(formatPrice(1050, 'USD'), '$10.50');
});
