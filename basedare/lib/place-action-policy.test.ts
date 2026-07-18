import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  resolvePlaceActionPolicy,
  resolvePlaceVisitorIntent,
} from './place-action-policy.ts';

test('ordinary map traffic stays exploration-first', () => {
  assert.equal(resolvePlaceVisitorIntent({ source: 'home-radar' }), 'explore');
  assert.equal(resolvePlaceVisitorIntent({}), 'explore');
});

test('only explicit buyer, venue, and contributor routes alter intent', () => {
  assert.equal(resolvePlaceVisitorIntent({ source: 'control' }), 'fund');
  assert.equal(resolvePlaceVisitorIntent({ source: 'first-spark-route-picker' }), 'fund');
  assert.equal(resolvePlaceVisitorIntent({ mode: 'venue' }), 'fund');
  assert.equal(resolvePlaceVisitorIntent({ action: 'verify' }), 'contribute');
});

test('a live dare wins without adding unpaid verification pressure for remote visitors', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: true,
    hasVerifiedTrace: false,
    isPlayerNearby: false,
    canCheckIn: true,
    intent: 'fund',
  });

  assert.equal(policy.primary, 'join-live-dare');
  assert.equal(policy.secondary, 'open-venue');
  assert.deepEqual(policy.tertiary, ['fund-dare']);
});

test('a nearby player gets the first-verification loop', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    hasVerifiedTrace: false,
    isPlayerNearby: true,
    canCheckIn: false,
    intent: 'explore',
  });

  assert.equal(policy.primary, 'verify-place');
  assert.equal(policy.secondary, 'open-venue');
  assert.equal(policy.verifyLabel, 'Be first to verify');
  assert.deepEqual(policy.tertiary, ['fund-dare']);
});

test('a cold explorer is not asked to do unpaid work before seeing the venue', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    hasVerifiedTrace: false,
    isPlayerNearby: false,
    canCheckIn: false,
    intent: 'explore',
  });

  assert.equal(policy.primary, 'open-venue');
  assert.equal(policy.secondary, null);
  assert.deepEqual(policy.tertiary, ['fund-dare']);
});

test('explicit contributor intent keeps verification available regardless of place state', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    hasVerifiedTrace: true,
    isPlayerNearby: false,
    canCheckIn: false,
    intent: 'contribute',
  });

  assert.equal(policy.primary, 'verify-place');
  assert.equal(policy.secondary, 'open-venue');
  assert.equal(policy.verifyLabel, 'Add fresh proof');
  assert.deepEqual(policy.tertiary, ['fund-dare']);
});

test('explicit buyer intent promotes funding without affecting normal explorers', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    hasVerifiedTrace: false,
    isPlayerNearby: true,
    canCheckIn: false,
    intent: 'fund',
  });

  assert.equal(policy.primary, 'fund-dare');
  assert.equal(policy.secondary, 'open-venue');
  assert.deepEqual(policy.tertiary, ['verify-place']);
});

test('verified places lead with venue utility and expose check-in only when usable nearby', () => {
  const nearby = resolvePlaceActionPolicy({
    hasLiveDare: false,
    hasVerifiedTrace: true,
    isPlayerNearby: true,
    canCheckIn: true,
    intent: 'explore',
  });
  const remote = resolvePlaceActionPolicy({
    hasLiveDare: false,
    hasVerifiedTrace: true,
    isPlayerNearby: false,
    canCheckIn: true,
    intent: 'explore',
  });

  assert.equal(nearby.primary, 'open-venue');
  assert.equal(nearby.secondary, 'check-in');
  assert.equal(nearby.verifyLabel, 'Add fresh proof');
  assert.equal(remote.primary, 'open-venue');
  assert.equal(remote.secondary, null);
  assert.deepEqual(remote.tertiary, ['fund-dare']);
});
