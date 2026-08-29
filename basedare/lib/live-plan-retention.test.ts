import assert from 'node:assert/strict';
import test from 'node:test';

import { countCompletedTogetherPlans, livePlanParticipantKey, livePlanTargetType } from './live-plan-retention.ts';

test('a plan counts only after two distinct participants confirm', () => {
  assert.equal(countCompletedTogetherPlans([
    { targetType: 'MEETUP', targetId: 'm1', participantKey: 'baretag:a' },
    { targetType: 'MEETUP', targetId: 'm1', participantKey: 'baretag:a' },
  ]), 0);
  assert.equal(countCompletedTogetherPlans([
    { targetType: 'MEETUP', targetId: 'm1', participantKey: 'baretag:a' },
    { targetType: 'MEETUP', targetId: 'm1', participantKey: 'baretag:b' },
  ]), 1);
});
test('completion is grouped by plan and ignores incomplete ledger rows', () => {
  assert.equal(countCompletedTogetherPlans([
    { targetType: 'MEETUP', targetId: 'm1', participantKey: 'baretag:a' },
    { targetType: 'MEETUP', targetId: 'm1', participantKey: 'baretag:b' },
    { targetType: 'SURF_BOAT_CREW', targetId: 'b1', participantKey: 'baretag:a' },
    { targetType: null, targetId: 'bad', participantKey: 'baretag:c' },
  ]), 1);
});

test('target and participant identities are stable', () => {
  assert.equal(livePlanTargetType('boat'), 'SURF_BOAT_CREW');
  assert.equal(livePlanTargetType('meetup'), 'MEETUP');
  assert.equal(livePlanParticipantKey('abc'), 'baretag:abc');
});
