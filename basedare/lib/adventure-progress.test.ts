import { test } from 'node:test';
import assert from 'node:assert/strict';
import { activeAdventure, completeAdventure, readAdventureProgress, updateAdventureStep, type AdventureProgress } from './adventure-progress';
import { SIARGAO_ACTIVITY_AREA } from './home-activities';
import { PilotConfigSchema, PilotRecordSchema, activeLocalSpendPilot } from './local-spend-pilot';
import { buildVenuePerkUnlock, getActiveVenuePerk, getVenuePerkSnapshot, writeVenuePerkToMetadata } from './venue-perks';

const now = Date.now();
const progress = (): AdventureProgress => ({ runs: [{ runId: 'one', activityId: 'postcard', area: SIARGAO_ACTIVITY_AREA, startedAt: now - 1000, steps: [] }] });
test('a free adventure needs every distinct step, and completing twice cannot add a result', () => {
  let state = progress();
  assert.equal(completeAdventure(state, 'one', now), state);
  for (let step = 0; step < 3; step++) state = updateAdventureStep(state, 'one', step, now);
  state = completeAdventure(state, 'one', now);
  assert.equal(state.runs[0].completedAt, now);
  assert.equal(completeAdventure(state, 'one', now), state);
});
test('expired active runs cannot complete; completed history remains', () => {
  const state = progress(); state.runs[0].startedAt = now - 86400000;
  assert.equal(activeAdventure(state, now), null);
  assert.equal(completeAdventure(state, 'one', now), state);
  state.runs[0].steps = [0, 1, 2]; state.runs[0].completedAt = now - 1000;
  assert.equal(readAdventureProgress(state, now).runs.length, 1);
});
test('untrusted storage cannot supply invented activities, future completions or duplicate steps', () => {
  for (const patch of [{ activityId: 'fake-reward' }, { steps: [0, 0, 2] }, { completedAt: now + 1 }, { area: { lat: 999, lng: 0, label: 'x' } }, { placeSlug: '../admin' }]) {
    assert.equal(readAdventureProgress({ runs: [{ ...progress().runs[0], ...patch }] }, now).runs.length, 0);
  }
});
test('a step cannot update a different or completed run', () => {
  const state = progress();
  assert.equal(updateAdventureStep(state, 'another', 0, now), state);
  assert.equal(updateAdventureStep(state, 'one', 99, now), state);
});
test('perk dates control availability and claimed expiry cannot outlast the offer', () => {
  const start = new Date(now - 1000).toISOString(); const end = new Date(now + 1000).toISOString();
  const { metadata } = writeVenuePerkToMetadata({}, { enabled: true, title: 'Coffee', startsAt: start, endsAt: end, quantityLimit: 2, offerId: 'offer', conditions: 'Join the quiz' });
  const perk = getActiveVenuePerk(metadata, new Date(now))!;
  assert.ok(perk); assert.equal(getActiveVenuePerk(metadata, new Date(now + 1000)), null);
  assert.equal(getActiveVenuePerk(metadata, new Date(now - 2000)), null);
  const unlock = buildVenuePerkUnlock({ perk, checkInId: 'visit', scannedAt: new Date(now) });
  assert.equal(unlock.expiresAt, end);
  assert.equal(getVenuePerkSnapshot({ venuePerk: unlock })?.conditions, 'Join the quiz');
});
test('a payment option cannot go live without merchant test evidence', () => {
  assert.equal(PilotConfigSchema.safeParse({ enabled: true, merchantQrTested: false, merchantReceiptConfirmed: false, testedAt: null, testReference: '' }).success, false);
  const config = { enabled: true, merchantQrTested: true, merchantReceiptConfirmed: true, testedAt: new Date(now - 1000).toISOString(), testReference: 'receipt-1' };
  assert.ok(activeLocalSpendPilot({ localSpendPilot: config }, now));
  assert.equal(activeLocalSpendPilot({ localSpendPilot: config }, now + 31 * 86400000), null);
  assert.equal(PilotConfigSchema.safeParse({ ...config, enabled: false, testedAt: new Date(now - 31 * 86400000).toISOString() }).success, true, 'an expired pilot can always be disabled');
});
test('merchant-confirmed purchase requires amount received and receipt; failed zero-spend attempts can be recorded', () => {
  const record = { recordId: '3dfb0c28-d720-44bb-82ab-8b3b4e3c4b9a', consent: true, outcome: 'COMPLETED', evidence: 'MERCHANT_CONFIRMED', stablecoin: 'USDC', amountSpent: '2.10', elapsedSeconds: 30 };
  assert.equal(PilotRecordSchema.safeParse(record).success, false);
  assert.equal(PilotRecordSchema.safeParse({ ...record, phpReceived: '120', receiptReference: 'merchant-1' }).success, true);
  assert.equal(PilotRecordSchema.safeParse({ ...record, consent: false, phpReceived: '120', receiptReference: 'merchant-1' }).success, false);
  assert.equal(PilotRecordSchema.safeParse({ ...record, outcome: 'FAILED', evidence: 'PARTICIPANT_REPORTED', amountSpent: '0' }).success, true);
});
