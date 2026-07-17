import assert from 'node:assert/strict';
import test from 'node:test';

import { buildCorroborationMissionDraft, conflictActionSchema } from './conflict-policy.ts';

test('accept correction requires a selected challenger', () => {
  assert.equal(
    conflictActionSchema.safeParse({ conflictId: 'c1', action: 'ACCEPT_CORRECTION' }).success,
    false,
  );
});

test('corroboration creates an unfunded no-money draft', () => {
  const draft = buildCorroborationMissionDraft({
    conflictId: 'c1',
    venueId: 'v1',
    venueName: 'Venue',
    kind: 'ITEM_PRICE',
    subjectKey: 'flat_white',
    requestedBy: 'admin',
    requestedAt: new Date('2026-07-17T00:00:00.000Z'),
  });
  assert.equal(draft.status, 'UNFUNDED_DRAFT');
  assert.equal(draft.moneyMovementAuthorized, false);
  assert.equal('dareId' in draft, false);
});
