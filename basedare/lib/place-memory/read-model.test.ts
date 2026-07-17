import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertPrivacySafePublicValue,
  assertPublicReceiptContentHash,
  effectivePublicAssertionState,
  readPublicReceiptPayload,
} from './read-model.ts';
import { domainHash } from './contracts.ts';

const safePayload = {
  version: 1,
  serialNumber: 42,
  outcome: 'MEMORY_UPDATED',
  issuedAt: '2026-07-17T00:00:00.000Z',
  venue: { slug: 'test-place', name: 'Test Place' },
  dare: { id: 'dare-1', title: 'Check the coffee price' },
  proof: {
    observedAt: '2026-07-17T00:00:00.000Z',
    proximityDecision: 'ACCEPT',
    proximityCode: 'INSIDE_RADIUS',
  },
  facts: [
    {
      kind: 'ITEM_PRICE',
      subjectKey: 'coffee',
      valueSchemaVersion: 1,
      value: { itemLabel: 'Coffee', amountMinor: 15000, currency: 'PHP' },
      outcome: 'MEMORY_UPDATED',
    },
  ],
};

test('public receipt accepts versioned safe projection', () => {
  assert.equal(readPublicReceiptPayload(safePayload).serialNumber, 42);
  assert.doesNotThrow(() => assertPrivacySafePublicValue(safePayload));
  const contentHash = domainHash('basedare:place-receipt:v1', safePayload);
  assert.doesNotThrow(() => assertPublicReceiptContentHash(contentHash, contentHash));
});

test('public receipt rejects validly shaped content that was changed after issuance', () => {
  const contentHash = domainHash('basedare:place-receipt:v1', safePayload);
  const changedPayload = readPublicReceiptPayload({ ...safePayload, outcome: 'MEMORY_CONFIRMED' });
  assert.throws(
    () =>
      assertPublicReceiptContentHash(
        domainHash('basedare:place-receipt:v1', changedPayload),
        contentHash,
      ),
    /content hash mismatch/,
  );
});

test('public projection rejects exact/private evidence fields', () => {
  assert.throws(
    () => assertPrivacySafePublicValue({ ...safePayload, submittedLatitude: 9.78 }),
    /private field submittedlatitude/,
  );
  assert.throws(
    () => assertPrivacySafePublicValue({ ...safePayload, systemActor: 'cron:retry' }),
    /private field systemactor/,
  );
});

test('public receipt rejects malformed fact and proof bodies', () => {
  assert.throws(() =>
    readPublicReceiptPayload({
      ...safePayload,
      facts: [{ kind: 'ITEM_PRICE', subjectKey: 'coffee', valueSchemaVersion: 1, value: {}, outcome: 'NOT_REAL' }],
    }),
  );
  assert.throws(() => readPublicReceiptPayload({ ...safePayload, proof: { observedAt: 'yesterday' } }));
});

test('public assertion state derives staleness and conflict from durable evidence', () => {
  const now = new Date('2026-07-17T00:00:00.000Z');
  assert.equal(
    effectivePublicAssertionState({
      storedState: 'CURRENT',
      hasCurrentVersion: true,
      hasOpenConflict: false,
      refreshDueAt: new Date('2026-07-16T23:59:59.000Z'),
      now,
    }),
    'STALE',
  );
  assert.equal(
    effectivePublicAssertionState({
      storedState: 'STALE',
      hasCurrentVersion: true,
      hasOpenConflict: true,
      refreshDueAt: null,
      now,
    }),
    'CONFLICTED',
  );
  assert.equal(
    effectivePublicAssertionState({
      storedState: 'CURRENT',
      hasCurrentVersion: false,
      hasOpenConflict: false,
      refreshDueAt: null,
      now,
    }),
    'UNKNOWN',
  );
});
