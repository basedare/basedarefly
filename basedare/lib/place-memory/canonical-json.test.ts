import assert from 'node:assert/strict';
import { test } from 'node:test';

import { canonicalJson, observationHash, placeValueHash } from './contracts.ts';

test('canonical JSON ignores object insertion order', () => {
  assert.equal(
    canonicalJson({ b: 2, nested: { z: true, a: 'x' }, a: 1 }),
    canonicalJson({ a: 1, nested: { a: 'x', z: true }, b: 2 }),
  );
});

test('canonical JSON rejects unsupported values', () => {
  assert.throws(() => canonicalJson({ value: undefined }), /rejects undefined/);
  assert.throws(() => canonicalJson({ value: Number.NaN }), /non-finite/);
  assert.throws(() => canonicalJson(new Date()), /plain objects/);
  const cyclic: Record<string, unknown> = {};
  cyclic.self = cyclic;
  assert.throws(() => canonicalJson(cyclic), /cyclic/);
});

test('value hash is key-order independent and domain separated by subject/schema', () => {
  const base = {
    kind: 'ITEM_PRICE',
    subjectKey: 'flat_white',
    valueSchemaVersion: 1,
  };
  const one = placeValueHash({ ...base, value: { currency: 'PHP', amountMinor: 18000 } });
  const reordered = placeValueHash({ ...base, value: { amountMinor: 18000, currency: 'PHP' } });
  assert.equal(one, reordered);
  assert.notEqual(one, placeValueHash({ ...base, subjectKey: 'latte', value: { amountMinor: 18000, currency: 'PHP' } }));
  assert.notEqual(one, placeValueHash({ ...base, valueSchemaVersion: 2, value: { amountMinor: 18000, currency: 'PHP' } }));
});

test('observation time changes observation hash but never value hash', () => {
  const valueHash = placeValueHash({
    kind: 'PAYMENT_METHOD',
    subjectKey: 'cash',
    valueSchemaVersion: 1,
    value: { methodCode: 'cash', accepted: true },
  });
  const first = observationHash({ valueHash, proofAttemptId: 'attempt-1', observedAt: '2026-07-17T00:00:00.000Z' });
  const second = observationHash({ valueHash, proofAttemptId: 'attempt-1', observedAt: '2026-07-17T00:01:00.000Z' });
  assert.notEqual(first, second);
});
