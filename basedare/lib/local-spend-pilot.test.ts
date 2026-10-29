import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PilotConfigSchema, PilotRecordSchema, activeLocalSpendPilot } from './local-spend-pilot';
const now = Date.now();
const config = { enabled: true, merchantPermission: true, merchantQrTested: true, merchantReceiptConfirmed: true, testedAt: new Date(now - 1000).toISOString(), testReference: 'private-receipt', testedNetwork: 'Base', testedAsset: 'USDC', qrMethod: 'QR_PH_MERCHANT' };
test('local payment listing requires permission and specific tested rails; legacy evidence alone cannot advertise availability', () => {
  const active = activeLocalSpendPilot({ localSpendPilot: config }, now);
  assert.deepEqual(active, { testedAt: config.testedAt, network: 'Base', asset: 'USDC', qrMethod: 'QR_PH_MERCHANT' });
  assert.equal(JSON.stringify(active).includes('private-receipt'), false);
  for (const patch of [{ merchantPermission: false }, { testedNetwork: '' }, { testedAsset: undefined }, { qrMethod: undefined }, { merchantReceiptConfirmed: false }, { testedAt: new Date(now + 60000).toISOString() }]) {
    assert.equal(activeLocalSpendPilot({ localSpendPilot: { ...config, ...patch } }, now), null);
    assert.equal(PilotConfigSchema.safeParse({ ...config, ...patch, enabled: false }).success, true, 'an operator can always disable incomplete evidence');
  }
  assert.equal(activeLocalSpendPilot({ localSpendPilot: config }, now + 31 * 86400000), null);
});
test('manual merchant confirmation requires separate provider and PHP receipt evidence', () => {
  const record = { recordId: '3dfb0c28-d720-44bb-82ab-8b3b4e3c4b9a', consent: true, outcome: 'COMPLETED', evidence: 'MERCHANT_CONFIRMED', stablecoin: 'USDC', network: 'Base', qrMethod: 'QR_PH_MERCHANT', amountSpent: '2.10', elapsedSeconds: 30, phpReceived: '120', receiptReference: 'merchant-1', providerReference: 'provider-1', fees: 'Included in actual quote' };
  assert.equal(PilotRecordSchema.safeParse(record).success, true);
  for (const patch of [{ providerReference: '' }, { receiptReference: '' }, { phpReceived: null }, { consent: false }, { network: '' }, { qrMethod: 'GCASH_PERSONAL' }]) assert.equal(PilotRecordSchema.safeParse({ ...record, ...patch }).success, false);
  assert.equal(PilotRecordSchema.safeParse({ ...record, outcome: 'FAILED', evidence: 'PARTICIPANT_REPORTED', amountSpent: '0', phpReceived: null, providerReference: '' }).success, true);
});
