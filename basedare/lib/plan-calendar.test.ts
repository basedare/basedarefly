import assert from 'node:assert/strict';
import test from 'node:test';

import { buildPlanCalendarFile } from './plan-calendar.ts';

test('calendar files preserve the exact plan time, place and deep link', () => {
  const file = buildPlanCalendarFile({
    id: 'meetup:crew one',
    title: 'Trivia, then tacos',
    placeLabel: 'Hideaway; General Luna',
    startsAt: '2026-08-25T11:00:00.000Z',
    endsAt: '2026-08-25T13:00:00.000Z',
    detailsUrl: 'https://basedare.xyz/community/meet/crew-one',
    description: '4/6 going\nNeeds two more',
  }, new Date('2026-08-24T01:02:03.000Z'));

  assert.ok(file);
  assert.equal(file.filename, 'trivia-then-tacos.ics');
  assert.match(file.content, /DTSTAMP:20260824T010203Z/);
  assert.match(file.content, /DTSTART:20260825T110000Z/);
  assert.match(file.content, /DTEND:20260825T130000Z/);
  assert.match(file.content, /LOCATION:Hideaway\\; General Luna/);
  assert.match(file.content, /DESCRIPTION:4\/6 going\\nNeeds two more\\n\\nhttps:\/\/basedare\.xyz/);
});

test('calendar files fail closed without a valid start and omit invalid ends', () => {
  assert.equal(buildPlanCalendarFile({
    id: 'open-spark',
    title: 'Open Spark',
    placeLabel: 'Cloud 9',
    startsAt: null,
    detailsUrl: 'https://basedare.xyz/dare/open-spark',
  }), null);

  const file = buildPlanCalendarFile({
    id: 'meet-2',
    title: 'Coffee crew',
    placeLabel: 'Nalu',
    startsAt: '2026-08-25T03:00:00.000Z',
    endsAt: 'not-a-date',
    detailsUrl: 'https://basedare.xyz/community/meet/meet-2',
  }, new Date('2026-08-24T00:00:00.000Z'));
  assert.ok(file);
  assert.doesNotMatch(file.content, /DTEND:/);
});
