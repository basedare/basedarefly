import assert from 'node:assert/strict';
import test from 'node:test';

import {
  didMeetupJustUnlock,
  getDefaultMeetHereStart,
  getMeetupShareText,
  getMeetupSharePath,
  getRepeatRallyHref,
  normalizeMeetupInviteTags,
} from './meetup-plan.ts';

test('meetup share paths are stable deep links', () => {
  assert.equal(getMeetupSharePath('meet one'), '/community/meet/meet%20one');
});

test('invite tags are normalized, deduplicated and bounded', () => {
  assert.deepEqual(
    normalizeMeetupInviteTags([' @Maya ', 'maya', '@kai.surf', 'bad tag', '@one', '@two', '@three', '@four']),
    ['maya', 'kai.surf', 'one', 'two', 'three'],
  );
});

test('the default meetup time is nearby and quarter-hour aligned', () => {
  const start = getDefaultMeetHereStart(new Date('2026-08-11T08:02:00.000Z'));
  assert.equal(start.toISOString(), '2026-08-11T08:45:00.000Z');
});

test('Rally sharing makes the missing-person threshold explicit', () => {
  const text = getMeetupShareText({
    title: 'Padel match',
    placeLabel: 'Siargao Padel Club',
    startTime: '2026-08-16T09:00:00.000Z',
    note: null,
    rsvpCount: 2,
    minimumPeople: 4,
  });
  assert.match(text, /^Padel match\n/);
  assert.match(text, /2 going · 2 more needed/);
});

test('repeat links preserve the activity, place and unlock threshold', () => {
  const href = getRepeatRallyHref({
    id: 'meetup-previous',
    title: 'Thursday trivia',
    type: 'trivia',
    venueId: 'venue-1',
    minimumPeople: 5,
  });
  const url = new URL(href, 'https://basedare.xyz');
  assert.equal(url.pathname, '/community/rally/new');
  assert.equal(url.searchParams.get('repeat'), '1');
  assert.equal(url.searchParams.get('template'), 'trivia');
  assert.equal(url.searchParams.get('venueId'), 'venue-1');
  assert.equal(url.searchParams.get('minimum'), '5');
  assert.equal(url.searchParams.get('repeatFrom'), 'meetup-previous');
});

test('crew unlocks only when a real RSVP crosses the stated minimum', () => {
  assert.equal(didMeetupJustUnlock({ previousCount: 3, nextCount: 4, minimumPeople: 4 }), true);
  assert.equal(didMeetupJustUnlock({ previousCount: 4, nextCount: 4, minimumPeople: 4 }), false);
  assert.equal(didMeetupJustUnlock({ previousCount: 2, nextCount: 3, minimumPeople: 4 }), false);
  assert.equal(didMeetupJustUnlock({ previousCount: 1, nextCount: 2, minimumPeople: null }), false);
});
