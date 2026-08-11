import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CEMETERY_BOAT_VENUE_SLUG,
  addCalendarDays,
  deriveBoatCrewStatus,
  getBoatCrewCountLabel,
  getBoatCrewDepartureLabel,
  getBoatCrewInvitePath,
  getBoatCrewLoadingLabel,
  getBoatCrewMarkerPosition,
  getAllowedBoatDays,
  getBoatLaunchDestinations,
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

test('boat sharing keeps four as a minimum rather than a hard capacity', () => {
  assert.equal(
    getBoatCrewCountLabel({ confirmedCount: 5, minimumCrew: 4, operatorConfirmation: null }),
    '5+',
  );
  assert.equal(getBoatCrewSharePath('crew one'), '/community/boat/crew%20one');
  assert.equal(getBoatCrewInvitePath('crew one'), '/community/boat/crew%20one?invite=crew');
});

test('each launch exposes only the breaks it can actually serve', () => {
  assert.deepEqual(getBoatLaunchDestinations(CEMETERY_BOAT_VENUE_SLUG).map((item) => item.value), ['cemetery']);
  assert.equal(getBoatLaunchDestinations('kanaway-surf-school').some((item) => item.value === 'cemetery'), false);
});

test('multiple crews occupy independent offshore boat slots', () => {
  const first = getBoatCrewMarkerPosition('kanaway-surf-school', 0);
  const second = getBoatCrewMarkerPosition('kanaway-surf-school', 1);
  const cemetery = getBoatCrewMarkerPosition(CEMETERY_BOAT_VENUE_SLUG, 0);
  assert.notDeepEqual(first, second);
  assert.notDeepEqual(first, cemetery);
});

test('map boats say whether they are loading and when they leave', () => {
  const forming = {
    confirmedCount: 3,
    minimumCrew: 4,
    status: 'FORMING' as const,
  };
  assert.equal(getBoatCrewLoadingLabel(forming), 'LOADING · 3/4');
  assert.equal(
    getBoatCrewDepartureLabel(
      { departureDay: '2026-08-11', timeWindow: 'early', operatorConfirmation: null },
      new Date('2026-08-11T00:00:00.000Z'),
    ),
    'TODAY · Early 7–9',
  );
});
