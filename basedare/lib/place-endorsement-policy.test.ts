import assert from 'node:assert/strict';
import test from 'node:test';

import {
  evaluatePlaceEndorsementEligibility,
  WORTH_A_DETOUR_MAX_ACTIVE,
} from './place-endorsement-policy.ts';

const eligible = {
  placeIsFresh: true,
  hasRecentSecureVisit: true,
  acceptedContributionCount: 3,
  distinctContributionPlaces: 2,
  activeEndorsementCount: 2,
  alreadyEndorsed: false,
  suppressed: false,
};

test('requires fresh memory, a secure visit and a proven multi-place record', () => {
  assert.equal(evaluatePlaceEndorsementEligibility(eligible).eligible, true);
  assert.equal(evaluatePlaceEndorsementEligibility({ ...eligible, placeIsFresh: false }).eligible, false);
  assert.equal(evaluatePlaceEndorsementEligibility({ ...eligible, hasRecentSecureVisit: false }).eligible, false);
  assert.equal(evaluatePlaceEndorsementEligibility({ ...eligible, acceptedContributionCount: 2 }).eligible, false);
  assert.equal(evaluatePlaceEndorsementEligibility({ ...eligible, distinctContributionPlaces: 1 }).eligible, false);
});

test('keeps endorsements scarce while allowing an existing endorsement to remain legible', () => {
  assert.equal(evaluatePlaceEndorsementEligibility({ ...eligible, activeEndorsementCount: WORTH_A_DETOUR_MAX_ACTIVE }).eligible, false);
  assert.equal(evaluatePlaceEndorsementEligibility({ ...eligible, activeEndorsementCount: WORTH_A_DETOUR_MAX_ACTIVE, alreadyEndorsed: true }).eligible, true);
});

test('moderation suppression cannot be bypassed by another request', () => {
  const decision = evaluatePlaceEndorsementEligibility({ ...eligible, alreadyEndorsed: true, suppressed: true });
  assert.equal(decision.eligible, false);
  assert.match(decision.reasons.join(' '), /moderation/i);
});
