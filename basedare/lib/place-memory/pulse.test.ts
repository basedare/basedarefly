import assert from 'node:assert/strict';
import { test } from 'node:test';

import { computePulseV1, pulseStateForScore, refreshDueAt } from './pulse.ts';

const NOW = new Date('2026-07-17T00:00:00.000Z');

test('no assertions is cold even with posting activity', () => {
  const pulse = computePulseV1({ assertions: [], recentSparkCount: 50, now: NOW });
  assert.equal(pulse.score, 0);
  assert.equal(pulse.state, 'COLD');
});

test('fresh covered corroborated memory can become blazing', () => {
  const pulse = computePulseV1({
    assertions: [
      { kind: 'OPENING_WINDOW', hasCurrentVersion: true, observedAt: NOW, supportCount: 3, conflicted: false },
      { kind: 'ITEM_PRICE', hasCurrentVersion: true, observedAt: NOW, supportCount: 3, conflicted: false },
      { kind: 'PAYMENT_METHOD', hasCurrentVersion: true, observedAt: NOW, supportCount: 3, conflicted: false },
    ],
    recentSparkCount: 5,
    now: NOW,
  });
  assert.equal(pulse.score, 100);
  assert.equal(pulse.state, 'BLAZING');
});

test('open conflict caps score at simmering 49', () => {
  const pulse = computePulseV1({
    assertions: [
      { kind: 'ITEM_PRICE', hasCurrentVersion: true, observedAt: NOW, supportCount: 3, conflicted: true },
    ],
    recentSparkCount: 5,
    now: NOW,
  });
  assert.equal(pulse.score, 49);
  assert.equal(pulse.state, 'SIMMERING');
  assert.equal(pulse.components.conflictCapApplied, true);
});

test('critically stale assertion prevents blazing', () => {
  const old = new Date('2025-01-01T00:00:00.000Z');
  const pulse = computePulseV1({
    assertions: [
      { kind: 'PAYMENT_METHOD', hasCurrentVersion: true, observedAt: NOW, supportCount: 3, conflicted: false },
      { kind: 'ITEM_PRICE', hasCurrentVersion: true, observedAt: old, supportCount: 3, conflicted: false },
    ],
    recentSparkCount: 5,
    now: NOW,
  });
  assert.ok(pulse.score <= 74);
  assert.notEqual(pulse.state, 'BLAZING');
});

test('thresholds and refresh priors are deterministic at boundaries', () => {
  assert.equal(pulseStateForScore(24), 'COLD');
  assert.equal(pulseStateForScore(25), 'SIMMERING');
  assert.equal(pulseStateForScore(49), 'SIMMERING');
  assert.equal(pulseStateForScore(50), 'IGNITING');
  assert.equal(pulseStateForScore(74), 'IGNITING');
  assert.equal(pulseStateForScore(75), 'BLAZING');
  assert.equal(refreshDueAt('ITEM_PRICE', NOW).toISOString(), '2026-08-16T00:00:00.000Z');
});
