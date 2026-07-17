import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  buildStructuredSubmissionSnapshots,
  itemPriceV1Schema,
  openingWindowV1Schema,
  parseStructuredValue,
  paymentMethodV1Schema,
  PROOF_POLICY_DEFINITIONS,
  proofPolicyHash,
  type StructuredTargetContract,
} from './contracts.ts';

test('opening window accepts normal and overnight windows', () => {
  assert.equal(
    openingWindowV1Schema.parse({ closed: false, opens: '08:00', closes: '17:00', timezone: 'Asia/Manila' }).opens,
    '08:00',
  );
  assert.equal(
    openingWindowV1Schema.parse({ closed: false, opens: '18:00', closes: '02:00', timezone: 'Asia/Manila' }).closes,
    '02:00',
  );
});

test('opening window rejects invalid closed/times and timezone combinations', () => {
  assert.throws(() => openingWindowV1Schema.parse({ closed: true, opens: '08:00', closes: null, timezone: 'Asia/Manila' }));
  assert.throws(() => openingWindowV1Schema.parse({ closed: false, opens: null, closes: '17:00', timezone: 'Asia/Manila' }));
  assert.throws(() => openingWindowV1Schema.parse({ closed: false, opens: '8am', closes: '17:00', timezone: 'Mars/Olympus' }));
});

test('item price requires integer minor amounts and uppercase currency', () => {
  assert.equal(itemPriceV1Schema.parse({ itemLabel: 'Flat white', amountMinor: 18000, currency: 'PHP' }).amountMinor, 18000);
  assert.throws(() => itemPriceV1Schema.parse({ itemLabel: 'Flat white', amountMinor: 180.5, currency: 'PHP' }));
  assert.throws(() => itemPriceV1Schema.parse({ itemLabel: 'Flat white', amountMinor: 18000, currency: 'php' }));
});

test('payment method requires a safe code and configured subject match', () => {
  assert.equal(paymentMethodV1Schema.parse({ methodCode: 'contactless', accepted: true }).accepted, true);
  assert.throws(() => paymentMethodV1Schema.parse({ methodCode: '4111 1111 1111 1111', accepted: true }));
  assert.throws(() =>
    parseStructuredValue({
      kind: 'PAYMENT_METHOD',
      subjectKey: 'cash',
      valueSchemaVersion: 1,
      value: { methodCode: 'visa', accepted: true },
    }),
  );
  assert.throws(() => paymentMethodV1Schema.parse({ methodCode: 'some_new_wallet', accepted: true }));
});

test('structured text rejects contact, account, card, receipt, and credential details', () => {
  assert.throws(() =>
    openingWindowV1Schema.parse({
      closed: false,
      opens: '09:00',
      closes: '17:00',
      timezone: 'Asia/Manila',
      note: 'Message owner@example.com',
    }),
  );
  assert.throws(() =>
    paymentMethodV1Schema.parse({
      methodCode: 'gcash',
      accepted: true,
      evidenceContext: 'Account number 09171234567',
    }),
  );
});

function target(overrides: Partial<StructuredTargetContract> = {}): StructuredTargetContract {
  const definition = PROOF_POLICY_DEFINITIONS.ITEM_PRICE;
  return {
    id: 'target-price',
    kind: 'ITEM_PRICE',
    subjectKey: 'flat_white',
    valueSchemaVersion: 1,
    required: true,
    position: 0,
    displayConfigJson: { label: 'Flat white price' },
    proofPolicyVersion: {
      identifier: definition.identifier,
      version: definition.version,
      canonicalPolicyJson: definition.policy,
      policyHash: proofPolicyHash(definition.policy),
    },
    ...overrides,
  };
}

test('structured snapshot rejects unknown, duplicate, and missing required targets', () => {
  assert.throws(() => buildStructuredSubmissionSnapshots([target()], []), /Missing required/);
  assert.throws(
    () => buildStructuredSubmissionSnapshots([target()], [{ targetId: 'unknown', value: {} }]),
    /Unknown assertion target/,
  );
  const value = { itemLabel: 'Flat white', amountMinor: 18000, currency: 'PHP' };
  assert.throws(
    () => buildStructuredSubmissionSnapshots([target()], [
      { targetId: 'target-price', value },
      { targetId: 'target-price', value },
    ]),
    /Duplicate assertion target/,
  );
});

test('structured snapshot supports several target answers with immutable policy provenance', () => {
  const cash = PROOF_POLICY_DEFINITIONS.PAYMENT_METHOD;
  const snapshot = buildStructuredSubmissionSnapshots(
    [
      target(),
      target({
        id: 'target-cash',
        kind: 'PAYMENT_METHOD',
        subjectKey: 'cash',
        position: 1,
        proofPolicyVersion: {
          identifier: cash.identifier,
          version: cash.version,
          canonicalPolicyJson: cash.policy,
          policyHash: proofPolicyHash(cash.policy),
        },
      }),
    ],
    [
      { targetId: 'target-price', value: { itemLabel: 'Flat white', amountMinor: 18000, currency: 'PHP' } },
      { targetId: 'target-cash', value: { methodCode: 'cash', accepted: true } },
    ],
  );
  assert.ok(snapshot);
  assert.equal(snapshot.answers.length, 2);
  assert.match(snapshot.structuredAnswersHash, /^[a-f0-9]{64}$/);
  assert.match(snapshot.proofPolicySnapshotHash, /^[a-f0-9]{64}$/);
});

test('structured snapshot rejects a policy body/hash that drifted from the server template', () => {
  const drifted = target({
    proofPolicyVersion: {
      ...target().proofPolicyVersion,
      canonicalPolicyJson: { unsafe: true },
      policyHash: proofPolicyHash({ unsafe: true }),
    },
  });
  assert.throws(
    () => buildStructuredSubmissionSnapshots([drifted], [
      { targetId: 'target-price', value: { itemLabel: 'Flat white', amountMinor: 18000, currency: 'PHP' } },
    ]),
    /invalid or retired proof policy/,
  );
});
