import assert from 'node:assert/strict';
import test from 'node:test';
import { activationPlanningAmount, canReviseActivationEnquiry } from './activation-budget.ts';
test('repeat enquiries preserve approved scope and payment records', () => {
  for (const status of ['NEW', 'QUALIFIED', 'NEEDS_INFO']) assert.equal(canReviseActivationEnquiry(status), true);
  for (const status of ['READY_TO_INVOICE', 'PAYMENT_SENT', 'PAID_CONFIRMED', 'LAUNCHED', 'REJECTED', 'UNKNOWN', null]) assert.equal(canReviseActivationEnquiry(status), false);
});
test('an undecided budget does not turn a venue enquiry into a priced lead', () => {
  assert.equal(activationPlanningAmount('discuss'), null);
});
test('an explicitly selected managed service retains the approved quote', () => {
  assert.equal(activationPlanningAmount('verified_field_sprint'), 2500);
  assert.equal(activationPlanningAmount('1500_5000'), 1500);
});
