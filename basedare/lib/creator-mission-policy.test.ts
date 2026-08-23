import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildCreatorMissionCopy,
  calculateCreatorPayout,
  isCreatorMissionAvailable,
  isPublicFacingDareTitle,
  type CreatorMissionRecord,
} from './creator-mission-policy.ts';

function openMission(overrides: Partial<CreatorMissionRecord> = {}): CreatorMissionRecord {
  return {
    status: 'PENDING',
    title: 'Film the sunset menu special',
    bounty: 100,
    isSimulated: false,
    missionMode: 'IRL',
    tag: null,
    streamerHandle: '@open',
    claimedBy: null,
    targetWalletAddress: null,
    claimRequestStatus: null,
    expiresAt: new Date('2026-09-01T00:00:00.000Z'),
    outcomeContractSnapshot: null,
    ...overrides,
  };
}

test('only genuine open paid missions enter the creator feed', () => {
  const now = new Date('2026-08-23T00:00:00.000Z');
  assert.equal(isCreatorMissionAvailable(openMission(), now), true);
  assert.equal(isCreatorMissionAvailable(openMission({ bounty: 0 }), now), false);
  assert.equal(isCreatorMissionAvailable(openMission({ isSimulated: true }), now), false);
  assert.equal(isCreatorMissionAvailable(openMission({ streamerHandle: '@specific' }), now), false);
  assert.equal(isCreatorMissionAvailable(openMission({ claimRequestStatus: 'PENDING' }), now), false);
  assert.equal(isCreatorMissionAvailable(openMission({ expiresAt: new Date('2026-08-22T23:59:59.000Z') }), now), false);
});

test('QA and smoke rows stay off public creator surfaces', () => {
  assert.equal(isPublicFacingDareTitle('Brand Smoke Test Autocreate'), false);
  assert.equal(isPublicFacingDareTitle('Acceptance Flow PLACE 177000001'), false);
  assert.equal(isPublicFacingDareTitle('Film the sunset menu special'), true);
});

test('mission copy turns contract families into creator language', () => {
  const copy = buildCreatorMissionCopy({
    title: 'Check the opening hours',
    missionMode: 'IRL',
    tag: 'field-truth',
    outcomeContractSnapshot: {
      family: 'FIELD_TRUTH',
      mission: {
        do: 'Check whether the venue is open at 6 PM.',
        prove: 'Upload fresh server-pinned media showing the entrance.',
      },
      rights: { baseDareDisplay: true, sponsorCommercialReuseRequired: false },
    },
  });

  assert.equal(copy.typeLabel, 'Visit & report');
  assert.equal(copy.whatToMake, 'Check whether the venue is open at 6 PM.');
  assert.match(copy.submitLabel, /honest answer/i);
  assert.equal(copy.baseDareCanDisplay, true);
});

test('creator payout is explicit about the canonical four percent fee', () => {
  assert.equal(calculateCreatorPayout(100), 96);
  assert.equal(calculateCreatorPayout(12.5), 12);
  assert.equal(calculateCreatorPayout(0), 0);
});
