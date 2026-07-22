import assert from 'node:assert/strict';
import test from 'node:test';

import { derivePlaceHealth, type PlaceHealthObservation } from './place-health.ts';

const now = new Date('2026-07-23T12:00:00Z');

function observation(overrides: Partial<PlaceHealthObservation> = {}): PlaceHealthObservation {
  return {
    id: 'obs-1',
    buyerQuestion: 'Is the venue open tonight?',
    reportedOutcome: { kind: 'YES', maintenanceOutcome: 'CONFIRMED' },
    observedAt: '2026-07-23T10:00:00Z',
    acceptedAt: '2026-07-23T10:10:00Z',
    refreshAt: '2026-07-24T10:00:00Z',
    outcomeContractSnapshot: { missionKit: { key: 'OPEN_NOW' } },
    ...overrides,
  };
}

test('fresh accepted observation keeps a place fresh', () => {
  assert.equal(derivePlaceHealth([observation()], now).state, 'FRESH');
});

test('aging observations propose a recheck without funding it', () => {
  const result = derivePlaceHealth([observation({ observedAt: '2026-07-20T12:00:00Z', refreshAt: '2026-07-24T12:00:00Z' })], now);
  assert.equal(result.state, 'AGING');
  assert.equal(result.recheckProposal?.missionKitKey, 'OPEN_NOW');
  assert.match(result.recheckProposal?.fundingBoundary ?? '', /human.*fund/i);
});

test('expired and inconclusive observations need a recheck', () => {
  assert.equal(derivePlaceHealth([observation({ refreshAt: '2026-07-23T11:00:00Z' })], now).state, 'NEEDS_RECHECK');
  assert.equal(derivePlaceHealth([observation({ reportedOutcome: { kind: 'INCONCLUSIVE', maintenanceOutcome: 'COULD_NOT_VERIFY' } })], now).state, 'NEEDS_RECHECK');
});

test('closed or moved retires the place but still requires a human-funded recheck', () => {
  const result = derivePlaceHealth([observation({ reportedOutcome: { kind: 'NO', maintenanceOutcome: 'CLOSED_OR_MOVED' } })], now);
  assert.equal(result.state, 'RETIRED');
  assert.ok(result.recheckProposal);
});

test('conflicting current observations are disputed', () => {
  const result = derivePlaceHealth([
    observation({ id: 'confirmed', reportedOutcome: { kind: 'YES', maintenanceOutcome: 'CONFIRMED' } }),
    observation({ id: 'changed', acceptedAt: '2026-07-23T11:00:00Z', reportedOutcome: { kind: 'NO', maintenanceOutcome: 'CHANGED' } }),
  ], now);
  assert.equal(result.state, 'DISPUTED');
});
