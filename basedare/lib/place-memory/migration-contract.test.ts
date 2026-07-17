import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import { PROOF_POLICY_DEFINITIONS, proofPolicyHash } from './contracts.ts';

const migration = readFileSync(
  new URL('../../prisma/migrations/20260717120000_add_place_memory_stage_1/migration.sql', import.meta.url),
  'utf8',
);

test('migration seeds the exact immutable server proof-policy hashes', () => {
  for (const definition of Object.values(PROOF_POLICY_DEFINITIONS)) {
    assert.match(migration, new RegExp(definition.id));
    assert.match(migration, new RegExp(proofPolicyHash(definition.policy)));
  }
});

test('migration enforces the accepted-attempt, conflict, serial, and target-lock invariants', () => {
  assert.match(migration, /Dare_approvedProofAttempt_identity_fkey/);
  assert.match(migration, /PlaceReceipt_proofAttempt_identity_fkey/);
  assert.match(migration, /AssertionConflict_previousVersion_identity_fkey/);
  assert.match(migration, /AssertionConflict_resolvedVersion_identity_fkey/);
  assert.match(migration, /AssertionConflict_one_active_per_assertion_key/);
  assert.match(migration, /WHERE "status" IN \('OPEN', 'NEEDS_CORROBORATION'\)/);
  assert.match(migration, /PlaceReceipt_global_serial_seq/);
  assert.match(migration, /DareAssertionTarget_configuration_guard/);
  assert.match(migration, /FOR UPDATE/);
});

test('every new durable table enables RLS and revokes direct client access', () => {
  const tables = [
    'ProofPolicyVersion',
    'DareAssertionTarget',
    'FieldStationProfile',
    'PlaceAssertion',
    'AssertionObservation',
    'AssertionVersion',
    'AssertionVersionObservation',
    'AssertionConflict',
    'AssertionConflictObservation',
    'RefreshSchedule',
    'PlaceReceipt',
    'PlaceReceiptObservation',
    'PlaceReceiptAssertionVersion',
  ];
  for (const table of tables) {
    assert.match(migration, new RegExp(`ALTER TABLE "${table}" ENABLE ROW LEVEL SECURITY`));
    assert.match(migration, new RegExp(`REVOKE ALL ON TABLE "${table}" FROM anon, authenticated`));
  }
});
