import assert from 'node:assert/strict';
import test from 'node:test';

import { MISSION_KITS, preflightMissionKit } from './mission-kits.ts';

test('approved kits declare evidence, safety, privacy, rejection and recheck rails', () => {
  for (const kit of Object.values(MISSION_KITS)) {
    assert.ok(kit.requiredEvidence.length >= 3);
    assert.ok(kit.safetyRules.length >= 2);
    assert.ok(kit.privacyRules.length >= 2);
    assert.ok(kit.rejectionReasons.length >= 3);
    assert.ok(kit.recheckRule.length > 20);
    assert.equal(kit.recommendedGrossRewardUsd, 125);
    if (kit.requiresAuthorization) {
      assert.ok((kit.authorizationRules?.length ?? 0) >= 2);
    }
  }
});

test('preflight rejects subjective, unsafe and freshness-mismatched questions', () => {
  assert.equal(preflightMissionKit({
    kitKey: 'OPEN_NOW', question: 'Is this the best secret place to sneak into?',
    freshnessWindowHours: 24, areaLabel: 'General Luna',
  }).ok, false);
});

test('crowd kit requires a threshold and compiles an immutable snapshot', () => {
  assert.equal(preflightMissionKit({
    kitKey: 'CROWD_LEVEL', question: 'Is Hideaway busy tonight?',
    freshnessWindowHours: 3, areaLabel: 'General Luna',
  }).ok, false);
  const result = preflightMissionKit({
    kitKey: 'CROWD_LEVEL', question: 'Does Hideaway have at least 20 customers between 8pm and 9pm tonight?',
    freshnessWindowHours: 3, areaLabel: 'General Luna', createdAt: new Date('2026-07-23T00:00:00Z'),
  });
  assert.equal(result.ok, true);
  assert.equal(result.snapshot.key, 'CROWD_LEVEL');
  assert.equal(result.snapshot.compiledAt, '2026-07-23T00:00:00.000Z');
});

test('impact kits cannot compile without recorded partner authorization', () => {
  const base = {
    kitKey: 'IMPACT_CLEANUP' as const,
    question:
      'Did the authorized cleanup at Cloud 9 remove at least 10 bags during the agreed two-hour window?',
    freshnessWindowHours: 12,
    areaLabel: 'Cloud 9 public cleanup zone',
    createdAt: new Date('2026-07-27T00:00:00Z'),
  };
  const unauthorized = preflightMissionKit(base);
  assert.equal(unauthorized.ok, false);
  assert.match(unauthorized.errors.join(' '), /authorization/i);

  const authorized = preflightMissionKit({
    ...base,
    authorizationConfirmed: true,
  });
  assert.equal(authorized.ok, true);
  assert.equal(authorized.snapshot.authorizationConfirmed, true);
});
