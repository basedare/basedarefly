import assert from 'node:assert/strict';
import test from 'node:test';

import {
  buildFirstNodeDecisionBrief,
  nextActivationCloseRoomStatus,
  responseEventType,
} from './first-node-conversion.ts';

test('an unsigned venue never turns public signals into verified evidence', () => {
  const brief = buildFirstNodeDecisionBrief({
    venueName: 'Example Cafe',
    acceptedProofs: 0,
    verifiedOutcomes: 0,
    checkIns: 0,
    publicSignalDetail: 'Public listing and mapped address.',
  });

  assert.equal(brief.state, 'UNSIGNED');
  assert.equal(brief.evidence.some((item) => item.label === 'VERIFIED'), false);
  assert.match(brief.summary, /not yet proven/i);
  assert.match(brief.evidence.at(-1)?.label ?? '', /NOT YET FUNDED/);
});

test('accepted evidence is labelled verified without claiming purchases', () => {
  const brief = buildFirstNodeDecisionBrief({
    venueName: 'Example Cafe',
    acceptedProofs: 2,
    verifiedOutcomes: 1,
    checkIns: 3,
    publicSignalDetail: 'Mapped venue.',
  });

  assert.equal(brief.state, 'PROVEN');
  assert.match(brief.evidence[0]?.detail ?? '', /2 accepted proofs/);
  assert.doesNotMatch(brief.evidence[0]?.detail ?? '', /purchase|sale|revenue/i);
});

test('buyer response types map to append-only report events', () => {
  assert.equal(responseEventType('REQUEST_PILOT'), 'PILOT_REQUESTED');
  assert.equal(responseEventType('CORRECT_REPORT'), 'CORRECTION_SUBMITTED');
  assert.equal(responseEventType('ASK_QUESTION'), 'QUESTION_SUBMITTED');
  assert.equal(responseEventType('DECLINE'), 'DECLINED');
});

test('keeps scope approval separate from payment and launch', () => {
  assert.equal(nextActivationCloseRoomStatus('NEW', 'APPROVE_SCOPE'), 'QUALIFIED');
  assert.equal(nextActivationCloseRoomStatus('NEEDS_INFO', 'APPROVE_SCOPE'), 'QUALIFIED');
  assert.equal(nextActivationCloseRoomStatus('PAID_CONFIRMED', 'DECLINE'), 'PAID_CONFIRMED');
  assert.equal(nextActivationCloseRoomStatus('LAUNCHED', 'CORRECT_SCOPE'), 'LAUNCHED');
});

test('records questions, corrections, and declines without reviving terminal states', () => {
  assert.equal(nextActivationCloseRoomStatus('NEW', 'NEEDS_INFO'), 'NEEDS_INFO');
  assert.equal(nextActivationCloseRoomStatus('QUALIFIED', 'CORRECT_SCOPE'), 'NEEDS_INFO');
  assert.equal(nextActivationCloseRoomStatus('NEW', 'DECLINE'), 'REJECTED');
  assert.equal(nextActivationCloseRoomStatus('PAYMENT_SENT', 'DECLINE'), 'PAYMENT_SENT');
});
