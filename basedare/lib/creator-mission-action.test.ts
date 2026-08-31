import assert from 'node:assert/strict';
import test from 'node:test';

import { getCreatorMissionActionState } from './creator-mission-action.ts';

const base = {
  walletAddress: '0xcreator',
  assignedWallet: null,
  claimRequestWallet: null,
  claimRequestStatus: null,
  missionStatus: 'PENDING',
  hasProof: false,
  isAvailable: false,
};

test('a pending request cannot submit work before approval', () => {
  assert.equal(
    getCreatorMissionActionState({
      ...base,
      claimRequestWallet: '0xCreator',
      claimRequestStatus: 'PENDING',
    }),
    'REQUESTED',
  );
});

test('an assigned creator can submit or resume the existing proof rail', () => {
  assert.equal(
    getCreatorMissionActionState({ ...base, assignedWallet: '0xCreator' }),
    'READY_TO_SUBMIT',
  );
  assert.equal(
    getCreatorMissionActionState({ ...base, assignedWallet: '0xCreator', hasProof: true }),
    'RESUME_SUBMISSION',
  );
});

test('post-submission states remain read-only', () => {
  assert.equal(
    getCreatorMissionActionState({
      ...base,
      assignedWallet: '0xCreator',
      missionStatus: 'PENDING_REVIEW',
    }),
    'UNDER_REVIEW',
  );
  assert.equal(
    getCreatorMissionActionState({
      ...base,
      assignedWallet: '0xCreator',
      missionStatus: 'PENDING_PAYOUT',
    }),
    'PAYOUT_QUEUED',
  );
  assert.equal(
    getCreatorMissionActionState({
      ...base,
      assignedWallet: '0xCreator',
      missionStatus: 'VERIFIED',
    }),
    'PAID',
  );
});

test('an unassigned visitor sees availability rather than another creator state', () => {
  assert.equal(getCreatorMissionActionState({ ...base, isAvailable: true }), 'AVAILABLE');
  assert.equal(getCreatorMissionActionState(base), 'UNAVAILABLE');
});
