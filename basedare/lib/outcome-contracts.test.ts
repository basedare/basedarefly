import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  ACTIVE_OUTCOME_CONTRACT_FAMILIES,
  OUTCOME_CONTRACT_SETTLEMENT_FEE_PERCENT,
  OUTCOME_CONTRACT_FAMILIES,
  buildOutcomeContractSnapshot,
  formatAcceptedOutcomeReceipt,
  getAllowedReportedOutcomes,
  validateReportedOutcome,
} from './outcome-contracts.ts';
import { SETTLEMENT_SPLIT } from './financial-canon.ts';

function fieldTruth(overrides: Partial<Parameters<typeof buildOutcomeContractSnapshot>[0]> = {}) {
  return buildOutcomeContractSnapshot({
    title: 'Check whether the café is open after 9pm',
    buyerQuestion: 'Is the café open after 9pm tonight?',
    family: 'FIELD_TRUTH',
    missionMode: 'IRL',
    missionTag: 'field-truth',
    amount: 20,
    locationLabel: 'General Luna Café',
    isNearbyDare: true,
    createdAt: new Date(Date.now() - 60 * 60 * 1000),
    expiresAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
    ...overrides,
  });
}

test('registry defines six families but activates only the three alpha families', () => {
  assert.deepEqual(OUTCOME_CONTRACT_FAMILIES, [
    'FIELD_TRUTH',
    'EXPERIENCE_EXECUTION',
    'PUBLICATION',
    'ATTENTION',
    'ARRIVAL_REDEMPTION',
    'QUALIFIED_ACTION',
  ]);
  assert.deepEqual(ACTIVE_OUTCOME_CONTRACT_FAMILIES, [
    'FIELD_TRUTH',
    'EXPERIENCE_EXECUTION',
    'PUBLICATION',
  ]);
});

test('frozen earn copy uses the executable 96/4 financial canon', () => {
  assert.equal(OUTCOME_CONTRACT_SETTLEMENT_FEE_PERCENT, SETTLEMENT_SPLIT.platformPercent);
  assert.equal(SETTLEMENT_SPLIT.completerPercent, 96);
});

test('mission compiler locks Go / Do / Prove / Win / Earn before funding', () => {
  const contract = fieldTruth();
  assert.match(contract.mission.go, /General Luna Café/);
  assert.match(contract.mission.do, /Is the café open/);
  assert.match(contract.mission.prove, /structured answer/i);
  assert.match(contract.mission.win, /Good news is not required/);
  assert.match(contract.mission.earn, /19\.20 USDC/);
  assert.match(contract.mission.earn, /20\.00 USDC gross reward/);
});

test('truthful negative field observation is a valid payable outcome', () => {
  const contract = fieldTruth();
  assert.deepEqual(getAllowedReportedOutcomes(contract), ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE']);
  const result = validateReportedOutcome(contract, {
    kind: 'NO',
    summary: 'The café was closed at 9:14pm and the front shutters were down.',
    observedAt: new Date().toISOString(),
  });
  assert.equal(result.ok, true);
  assert.match(contract.payoutTrigger, /whether.*positive or negative/i);
});

test('evidence receipt reports the observation without claiming traffic or purchase', () => {
  const receipt = formatAcceptedOutcomeReceipt({
    snapshot: fieldTruth(),
    reportedOutcome: {
      kind: 'NO',
      summary: 'No dinner service was operating at 9:20pm.',
      observedAt: new Date().toISOString(),
    },
  });
  assert.match(receipt ?? '', /reported no/i);
  assert.doesNotMatch(receipt ?? '', /arrived|bought|purchase|conversion/i);
});

test('a family cannot accept an outcome from another contract family', () => {
  const result = validateReportedOutcome(fieldTruth(), {
    kind: 'PUBLISHED',
    summary: 'A reel was published.',
    observedAt: new Date().toISOString(),
  });
  assert.equal(result.ok, false);
});

test('field truth fails closed without a location-bound mission', () => {
  assert.throws(
    () => fieldTruth({ isNearbyDare: false }),
    /location-bound mission/,
  );
});

test('inactive contract families cannot be instantiated', () => {
  assert.throws(
    () => fieldTruth({ family: 'ARRIVAL_REDEMPTION' }),
    /not active in the alpha/,
  );
});

test('future, pre-funding, and stale observations fail temporal validation', () => {
  const contract = fieldTruth({
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000),
    maximumObservationAgeHours: 1,
  });
  const future = validateReportedOutcome(contract, {
    kind: 'NO', summary: 'Closed.', observedAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  const beforeFunding = validateReportedOutcome(contract, {
    kind: 'NO', summary: 'Closed.', observedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
  });
  const stale = validateReportedOutcome(contract, {
    kind: 'NO', summary: 'Closed.', observedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
  });
  assert.equal(future.ok, false);
  assert.equal(beforeFunding.ok, false);
  assert.equal(stale.ok, false);
});
