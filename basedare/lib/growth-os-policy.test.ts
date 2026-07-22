import assert from 'node:assert/strict';
import { test } from 'node:test';

import { buildGrowthQuests, buildGrowthScore } from './growth-os-policy.ts';
import type { GrowthOperatingInputs } from './growth-os-types.ts';

const baseInputs: GrowthOperatingInputs = {
  fundedSprints: 0,
  completedSprints: 0,
  buyerRepeatRequests: 0,
  settledDares: 0,
  approvedPlaceRecords: 0,
  verifiedStationArrivals: 0,
  confirmedCheckIns: 0,
  reviewQueue: 0,
  payoutBacklog: 0,
  activeVenueLeads: 0,
  overdueVenueLeads: 0,
  activeActivationIntakes: 0,
  overdueActivationIntakes: 0,
  activeCreators: 4,
  fieldStationCount: 0,
  activeSprint: null,
  completedSprintAwaitingDecision: null,
  dailyCommand: null,
};

test('growth score rewards verified outcomes and reveals the next level', () => {
  const score = buildGrowthScore({
    fundedSprints: 1,
    completedSprints: 1,
    buyerRepeatRequests: 1,
    settledDares: 4,
    approvedPlaceRecords: 2,
    verifiedStationArrivals: 1,
    confirmedCheckIns: 3,
  });

  assert.equal(score.total, 564);
  assert.equal(score.level, 'Closer');
  assert.equal(score.nextLevel, 'Grid Builder');
  assert.equal(score.pointsToNextLevel, 36);
});

test('trust and payout debt outrank growth work', () => {
  const quests = buildGrowthQuests({ ...baseInputs, reviewQueue: 2, payoutBacklog: 1 });
  assert.equal(quests[0].id, 'clear-trust-money');
  assert.equal(quests[0].owner, 'Verifier / ops');
  assert.match(quests[0].scoreOutcome, /No points/);
});

test('funded demand routes contributors before cold prospecting', () => {
  const quests = buildGrowthQuests({
    ...baseInputs,
    activeSprint: {
      id: 'sprint-1',
      receiptCode: 'SPRINT-001',
      buyerLabel: 'Design Partner',
      question: 'Is this venue active after 9pm?',
      status: 'FUNDED',
      missionCount: 4,
    },
  });
  assert.equal(quests[0].id, 'route-funded-sprint');
  assert.equal(quests.some((quest) => quest.id === 'create-buyer-question'), false);
});

test('completed receipt creates a bounded repeat decision quest', () => {
  const quests = buildGrowthQuests({
    ...baseInputs,
    completedSprintAwaitingDecision: {
      id: 'sprint-1',
      receiptCode: 'SPRINT-001',
      buyerLabel: 'Design Partner',
    },
  });
  const repeat = quests.find((quest) => quest.id === 'ask-for-repeat');
  assert.ok(repeat);
  assert.match(repeat.definitionOfDone, /REPEAT, ADJUST, ASK, or STOP/);
  assert.match(repeat.scoreOutcome, /not booked revenue/);
});

test('field station work is blocked until a station exists and scans never score', () => {
  const quests = buildGrowthQuests(baseInputs);
  const station = quests.find((quest) => quest.id === 'station-health');
  assert.equal(station?.status, 'blocked');
  assert.match(station?.scoreOutcome ?? '', /verified arrival/);
});
