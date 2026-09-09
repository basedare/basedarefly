import assert from 'node:assert/strict';
import test from 'node:test';
import { readCreatorPoolSummary } from './creator-pool-display.ts';

const pool = {
  total: 224000,
  liveDares: { amount: 125, count: 1 },
  venueActivations: { amount: 10000, count: 2 },
  paidOut: { amount: 213875, count: 2000 },
  updatedAt: '2026-09-07T00:00:00Z',
};
const response = (creatorPool = pool) => ({ success: true, data: { creatorPool } });

test('active reward display cannot include campaign budgets or historical payouts', () => {
  const summary = readCreatorPoolSummary(response(), 'database');
  assert.equal(summary?.liveDares.amount, 125);
  assert.equal(summary?.paidOut.amount, 213875);
  assert.equal(summary && 'total' in summary, false);
});

test('fallback zeroes are unknown while a measured zero remains zero', () => {
  const zero = response({ ...pool, liveDares: { amount: 0, count: 0 } });
  assert.equal(readCreatorPoolSummary(zero, 'fallback'), null);
  assert.equal(readCreatorPoolSummary({ ...zero, data: { ...zero.data, fallbackReason: 'Unavailable' } }, null), null);
  assert.equal(readCreatorPoolSummary(zero, 'database')?.liveDares.amount, 0);
});

test('failed or malformed reward data cannot become financial claims', () => {
  assert.equal(readCreatorPoolSummary(null, null), null);
  assert.equal(readCreatorPoolSummary({ ...response(), success: false }, 'database'), null);
  assert.equal(readCreatorPoolSummary(response({ ...pool, liveDares: { amount: NaN, count: 1 } }), 'database'), null);
  assert.equal(readCreatorPoolSummary(response({ ...pool, paidOut: { amount: -10, count: 1 } }), 'database'), null);
});

test('cached summaries retain their original recording time', () => {
  assert.equal(readCreatorPoolSummary(response(), 'stale')?.updatedAt, pool.updatedAt);
});
