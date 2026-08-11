import assert from 'node:assert/strict';
import test from 'node:test';

import {
  addCalendarDays,
  deriveBoatCrewStatus,
  getBoatCrewCountLabel,
  getAllowedBoatDays,
  getBoatCrewMapLabel,
  getBoatCrewSharePath,
  getProjectedSharePhp,
} from './surf-boat-board.ts';

test('four surfers turns the indicative 1200 PHP boat into 300 PHP each', () => {
  assert.equal(getProjectedSharePhp(1200, 1), 300);
  assert.equal(getProjectedSharePhp(1200, 4), 300);
  assert.equal(getProjectedSharePhp(1200, 5), 240);
});

test('the board only accepts today and tomorrow in Manila', () => {
  const now = new Date('2026-08-11T01:00:00.000Z');
  assert.deepEqual(getAllowedBoatDays(now), ['2026-08-11', '2026-08-12']);
  assert.equal(addCalendarDays('2026-12-31', 1), '2027-01-01');
});

test('crew state moves from formation through operator and crew acceptance', () => {
  assert.equal(deriveBoatCrewStatus({ confirmedCount: 3, acceptedCount: 0 }), 'FORMING');
  assert.equal(deriveBoatCrewStatus({ confirmedCount: 4, acceptedCount: 0 }), 'AWAITING_OPERATOR');
  assert.equal(
    deriveBoatCrewStatus({ confirmedCount: 4, acceptedCount: 3, operatorConfirmedAt: '2026-08-11T00:00:00Z' }),
    'OPERATOR_CONFIRMED',
  );
  assert.equal(
    deriveBoatCrewStatus({ confirmedCount: 4, acceptedCount: 4, operatorConfirmedAt: '2026-08-11T00:00:00Z' }),
    'READY',
  );
});

test('departure is derived without rewriting the crew record', () => {
  assert.equal(
    deriveBoatCrewStatus({
      confirmedCount: 4,
      acceptedCount: 4,
      operatorConfirmedAt: '2026-08-11T00:00:00Z',
      departureAt: '2026-08-11T01:00:00Z',
      now: new Date('2026-08-11T01:01:00Z'),
    }),
    'DEPARTED',
  );
});

test('the canonical venue marker gets one compact boat label', () => {
  assert.equal(getBoatCrewMapLabel({ confirmedCount: 3, minimumCrew: 4, status: 'FORMING' }), 'BOAT 3/4');
  assert.equal(getBoatCrewMapLabel({ confirmedCount: 5, minimumCrew: 4, status: 'AWAITING_OPERATOR' }), 'BOAT 5+');
  assert.equal(getBoatCrewMapLabel({ confirmedCount: 4, minimumCrew: 4, status: 'READY' }), 'BOAT READY');
  assert.equal(getBoatCrewMapLabel({ confirmedCount: 4, minimumCrew: 4, status: 'DEPARTED' }), null);
});

test('boat sharing keeps four as a minimum rather than a hard capacity', () => {
  assert.equal(
    getBoatCrewCountLabel({ confirmedCount: 5, minimumCrew: 4, operatorConfirmation: null }),
    '5+',
  );
  assert.equal(getBoatCrewSharePath('crew one'), '/community/boat/crew%20one');
});
