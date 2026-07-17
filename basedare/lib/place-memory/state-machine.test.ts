import assert from 'node:assert/strict';
import { test } from 'node:test';

import { aggregateReceiptOutcome, planAssertionTransition } from './state-machine.ts';

test('first observation creates the first current version', () => {
  const plan = planAssertionTransition({
    state: 'UNKNOWN',
    currentVersionHash: null,
    observationValueHash: 'new',
    refreshDue: false,
    hasActiveConflict: false,
  });
  assert.equal(plan.transition, 'CREATE_FIRST_VERSION');
  assert.equal(plan.replaceCurrentVersion, true);
  assert.equal(plan.closePriorSystemInterval, false);
});

test('same value confirms without creating another version', () => {
  const plan = planAssertionTransition({
    state: 'CURRENT',
    currentVersionHash: 'same',
    observationValueHash: 'same',
    refreshDue: false,
    hasActiveConflict: false,
  });
  assert.equal(plan.transition, 'CONFIRM_CURRENT_VERSION');
  assert.equal(plan.replaceCurrentVersion, false);
  assert.equal(plan.receiptContribution, 'MEMORY_CONFIRMED');
});

test('different stale value closes only the old system interval and creates successor', () => {
  const plan = planAssertionTransition({
    state: 'CURRENT',
    currentVersionHash: 'old',
    observationValueHash: 'new',
    refreshDue: true,
    hasActiveConflict: false,
  });
  assert.equal(plan.transition, 'CREATE_SUCCESSOR_VERSION');
  assert.equal(plan.closePriorSystemInterval, true);
  assert.equal(plan.replaceCurrentVersion, true);
});

test('different fresh value opens conflict without replacing current pointer', () => {
  const plan = planAssertionTransition({
    state: 'CURRENT',
    currentVersionHash: 'old',
    observationValueHash: 'new',
    refreshDue: false,
    hasActiveConflict: false,
  });
  assert.equal(plan.transition, 'OPEN_CONFLICT');
  assert.equal(plan.replaceCurrentVersion, false);
  assert.equal(plan.nextState, 'CONFLICTED');
});

test('already-conflicted observation joins one active conflict', () => {
  const plan = planAssertionTransition({
    state: 'CONFLICTED',
    currentVersionHash: 'old',
    observationValueHash: 'third',
    refreshDue: true,
    hasActiveConflict: true,
  });
  assert.equal(plan.transition, 'JOIN_ACTIVE_CONFLICT');
  assert.equal(plan.replaceCurrentVersion, false);
});

test('receipt outcome uses conflict then update then confirmation precedence', () => {
  assert.equal(aggregateReceiptOutcome(['MEMORY_CONFIRMED']), 'MEMORY_CONFIRMED');
  assert.equal(aggregateReceiptOutcome(['MEMORY_CONFIRMED', 'MEMORY_UPDATED']), 'MEMORY_UPDATED');
  assert.equal(aggregateReceiptOutcome(['MEMORY_UPDATED', 'CONFLICT_OPENED']), 'CONFLICT_OPENED');
});
