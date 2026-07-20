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
    canNavigate: true,
    hasVerifiedTrace: false,
    isPlayerNearby: false,
    canCheckIn: true,
    intent: 'fund',
  });

  assert.equal(policy.primary, 'join-live-dare');
  assert.equal(policy.secondary, 'directions');
  assert.deepEqual(policy.tertiary, ['open-venue', 'fund-dare']);
});

test('a nearby explorer gets navigation before an optional first-verification ask', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    canNavigate: true,
    hasVerifiedTrace: false,
    isPlayerNearby: true,
    canCheckIn: false,
    intent: 'explore',
  });

  assert.equal(policy.primary, 'directions');
  assert.equal(policy.secondary, 'open-venue');
  assert.equal(policy.verifyLabel, 'Be first to verify');
  assert.deepEqual(policy.tertiary, ['verify-place', 'fund-dare']);
});

test('a cold explorer is not asked to do unpaid work before seeing the venue', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    canNavigate: true,
    hasVerifiedTrace: false,
    isPlayerNearby: false,
    canCheckIn: false,
    intent: 'explore',
  });

  assert.equal(policy.primary, 'directions');
  assert.equal(policy.secondary, 'open-venue');
  assert.deepEqual(policy.tertiary, ['fund-dare']);
});

test('explicit contributor intent keeps verification available regardless of place state', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    canNavigate: true,
    hasVerifiedTrace: true,
    isPlayerNearby: false,
    canCheckIn: false,
    intent: 'contribute',
  });

  assert.equal(policy.primary, 'verify-place');
  assert.equal(policy.secondary, 'directions');
  assert.equal(policy.verifyLabel, 'Add fresh proof');
  assert.deepEqual(policy.tertiary, ['open-venue', 'fund-dare']);
});

test('explicit buyer intent promotes funding without affecting normal explorers', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    canNavigate: true,
    hasVerifiedTrace: false,
    isPlayerNearby: true,
    canCheckIn: false,
    intent: 'fund',
  });

  assert.equal(policy.primary, 'fund-dare');
  assert.equal(policy.secondary, 'directions');
  assert.deepEqual(policy.tertiary, ['open-venue', 'verify-place']);
});

test('verified places lead with directions and expose check-in only when usable nearby', () => {
  const nearby = resolvePlaceActionPolicy({
    hasLiveDare: false,
    canNavigate: true,
    hasVerifiedTrace: true,
    isPlayerNearby: true,
    canCheckIn: true,
    intent: 'explore',
  });
  const remote = resolvePlaceActionPolicy({
    hasLiveDare: false,
    canNavigate: true,
    hasVerifiedTrace: true,
    isPlayerNearby: false,
    canCheckIn: true,
    intent: 'explore',
  });

  assert.equal(nearby.primary, 'directions');
  assert.equal(nearby.secondary, 'open-venue');
  assert.equal(nearby.verifyLabel, 'Add fresh proof');
  assert.deepEqual(nearby.tertiary, ['check-in', 'verify-place', 'fund-dare']);
  assert.equal(remote.primary, 'directions');
  assert.equal(remote.secondary, 'open-venue');
  assert.deepEqual(remote.tertiary, ['fund-dare']);
});

test('a claimed mission makes navigation the journey action', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: true,
    hasClaimedMission: true,
    hasVerifiedTrace: true,
    isPlayerNearby: false,
    canCheckIn: false,
    canNavigate: true,
    intent: 'explore',
  });

  assert.equal(policy.primary, 'directions');
  assert.equal(policy.secondary, 'join-live-dare');
  assert.deepEqual(policy.tertiary, ['open-venue', 'fund-dare']);
});

test('an approximate or sensitive place falls back to BaseDare details', () => {
  const policy = resolvePlaceActionPolicy({
    hasLiveDare: false,
    hasVerifiedTrace: false,
    isPlayerNearby: false,
    canCheckIn: false,
    canNavigate: false,
    intent: 'explore',
  });

  assert.equal(policy.primary, 'open-venue');
  assert.equal(policy.secondary, null);
  assert.deepEqual(policy.tertiary, ['fund-dare']);
});
