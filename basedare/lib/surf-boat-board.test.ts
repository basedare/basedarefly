import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CEMETERY_BOAT_VENUE_SLUG,
  addCalendarDays,
  deriveBoatCrewStatus,
  getAvailableBoatDays,
  getAvailableBoatTimeWindows,
  getBoatCrewCountLabel,
  getBoatCrewDepartureLabel,
  getBoatCrewInvitePath,
  getBoatCrewLoadingLabel,
  getBoatCrewMarkerPosition,
  getRepeatBoatCrewHref,
  getAllowedBoatDays,
  getBoatLaunchDestinations,
  getBoatCrewSharePath,
  getProjectedSharePhp,
  isBoatWindowOpen,
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

test('expired same-day windows cannot create invisible boat calls', () => {
  const beforeEarlyClose = new Date('2026-08-11T00:30:00.000Z'); // 08:30 Manila
  assert.equal(isBoatWindowOpen('2026-08-11', 'early', beforeEarlyClose), true);
  assert.deepEqual(
    getAvailableBoatTimeWindows('2026-08-11', beforeEarlyClose).map((window) => window.value),
    ['early', 'later', 'flexible'],
  );

  const afterFinalClose = new Date('2026-08-11T15:46:00.000Z'); // 23:46 Manila
  assert.equal(isBoatWindowOpen('2026-08-11', 'flexible', afterFinalClose), false);
  assert.deepEqual(getAvailableBoatDays(afterFinalClose), ['2026-08-12']);
  assert.deepEqual(
    getAvailableBoatTimeWindows('2026-08-12', afterFinalClose).map((window) => window.value),
    ['dawn', 'early', 'later', 'flexible'],
  );
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
  const kanawaySlots = Array.from({ length: 5 }, (_, index) =>
    getBoatCrewMarkerPosition('kanaway-surf-school', index),
  );
  const [first, second] = kanawaySlots;
  const cemetery = getBoatCrewMarkerPosition(CEMETERY_BOAT_VENUE_SLUG, 0);
  assert.notDeepEqual(first, second);
  assert.notDeepEqual(first, cemetery);
  kanawaySlots.forEach((slot) => {
    assert.ok(slot.latitude >= 9.81375, 'Kanaway boats stay north of the public-launch shoreline');
    assert.ok(slot.latitude <= 9.8145, 'Kanaway boats remain grouped in the launch bay');
    assert.ok(slot.longitude >= 126.156, 'Kanaway boats remain east of the bay boundary');
    assert.ok(slot.longitude <= 126.157, 'Kanaway boats stay in the vetted offshore water pocket');
  });
  assert.ok(cemetery.longitude >= 126.168, 'Cemetery boats stay east of the General Luna shoreline');
});

test('map boats say whether they are loading and when they leave', () => {
  const forming = {
    confirmedCount: 3,
    minimumCrew: 4,
    status: 'FORMING' as const,
  };
  assert.equal(getBoatCrewLoadingLabel(forming), 'BOAT 3/4+ · NEEDS 1');
  assert.equal(
    getBoatCrewDepartureLabel(
      { departureDay: '2026-08-11', timeWindow: 'early', operatorConfirmation: null },
      new Date('2026-08-11T00:00:00.000Z'),
    ),
    'TODAY · Early 7–9',
  );
});

test('repeat boat links preserve the real launch, break, window and ability lane', () => {
  const href = getRepeatBoatCrewHref({
    id: 'crew-previous',
    venueSlug: 'kanaway-surf-school',
    destination: 'rock-island',
    timeWindow: 'early',
    abilityLane: 'independent',
    viewerMembership: { needsBoard: true },
  });
  const url = new URL(href, 'https://basedare.xyz');
  assert.equal(url.pathname, '/community/boat/kanaway');
  assert.equal(url.searchParams.get('repeat'), 'boat');
  assert.equal(url.searchParams.get('launch'), 'kanaway-surf-school');
  assert.equal(url.searchParams.get('destination'), 'rock-island');
  assert.equal(url.searchParams.get('time'), 'early');
  assert.equal(url.searchParams.get('ability'), 'independent');
  assert.equal(url.searchParams.get('board'), '1');
  assert.equal(url.searchParams.get('repeatFrom'), 'crew-previous');
});
