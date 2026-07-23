import assert from 'node:assert/strict';
import test from 'node:test';

import { canCompleteRouteStop, evaluateRoutePublication } from './playable-route-policy.ts';
import type { PlaceHealthState } from './place-health.ts';

function stop(id: string, state: PlaceHealthState = 'FRESH') {
  return {
    venueId: id,
    venueName: `Place ${id}`,
    active: true,
    health: {
      state,
      reason: `${state} test state`,
      latestObservedAt: '2026-07-23T00:00:00.000Z',
      refreshAt: '2026-07-24T00:00:00.000Z',
      recheckProposal: null,
    },
  };
}

test('publishes only a three-to-five stop route with fresh distinct places', () => {
  assert.equal(evaluateRoutePublication([stop('a'), stop('b'), stop('c')]).publishable, true);
  assert.equal(evaluateRoutePublication([stop('a'), stop('b')]).publishable, false);
  assert.equal(evaluateRoutePublication([stop('a'), stop('b'), stop('c'), stop('d'), stop('e'), stop('f')]).publishable, false);
  assert.equal(evaluateRoutePublication([stop('a'), stop('a'), stop('c')]).publishable, false);
});

test('blocks a route when a stop is no longer an active public place', () => {
  const inactive = { ...stop('b'), active: false };
  const decision = evaluateRoutePublication([stop('a'), inactive, stop('c')]);
  assert.equal(decision.publishable, false);
  assert.match(decision.failures.join(' '), /no longer an active public place/i);
});

test('blocks routes with stale, disputed, unsafe or retired place memory', () => {
  for (const state of ['AGING', 'NEEDS_RECHECK', 'DISPUTED', 'RETIRED'] as const) {
    const decision = evaluateRoutePublication([stop('a'), stop('b', state), stop('c')]);
    assert.equal(decision.publishable, false);
    assert.match(decision.failures.join(' '), new RegExp(state.toLowerCase().split('_').join(' '), 'i'));
  }
});

test('ordered routes require earlier stops while free play does not', () => {
  assert.deepEqual(canCompleteRouteStop({ mode: 'ORDERED', ordinal: 3, completedOrdinals: [1, 2] }), { allowed: true, reason: null });
  assert.deepEqual(canCompleteRouteStop({ mode: 'ORDERED', ordinal: 3, completedOrdinals: [1] }), { allowed: false, reason: 'Complete stop 2 first.' });
  assert.deepEqual(canCompleteRouteStop({ mode: 'FREE_PLAY', ordinal: 5, completedOrdinals: [] }), { allowed: true, reason: null });
});
