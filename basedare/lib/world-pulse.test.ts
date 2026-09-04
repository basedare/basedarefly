import assert from 'node:assert/strict';
import test from 'node:test';

import type { LivePlan } from './live-plans.ts';
import {
  filterWorldPulsePlans,
  getWorldPulseDecision,
  getWorldPulseMapHref,
  getWorldPulseMapViewHref,
  getWorldPulseSideQuest,
  getWorldPulseSignal,
  getWorldPulseViewHref,
  normalizeWorldPulseCenter,
  parseWorldPulseMode,
  pickWorldPulsePlan,
} from './world-pulse.ts';

const daytime = { now: new Date('2026-09-04T02:00:00Z'), window: 'now' as const, timeZone: 'Asia/Manila' };

function plan(id: string, input: Partial<LivePlan> = {}): LivePlan {
  return {
    id,
    sourceId: id,
    type: 'meetup',
    title: id,
    summary: null,
    startsAt: null,
    endsAt: null,
    place: {
      venueId: 'venue-1',
      venueSlug: 'kanaway-surf-school',
      label: 'Kanaway',
      lat: 9.812345,
      lng: 126.156789,
      approx: true,
    },
    distanceKm: null,
    people: { going: 3, interested: 0, minimum: 4, spotsNeeded: 1, unlocked: false },
    value: null,
    status: { key: 'FORMING', label: '1 more needed', forming: true },
    action: { kind: 'JOIN', label: "I'm in", href: `/community/meet/${id}` },
    share: { href: `/community/meet/${id}?invite=1`, title: id, text: id },
    trust: { label: 'Public-place plan', sourceLabel: null },
    viewer: { identified: false, state: 'NONE', isNextMove: false },
    visibility: 'public',
    ...input,
  };
}

test('pulse mode parsing is strict and defaults to now', () => {
  assert.equal(parseWorldPulseMode('next2h'), 'NEXT_2H');
  assert.equal(parseWorldPulseMode('TONIGHT'), 'TONIGHT');
  assert.equal(parseWorldPulseMode('next 2 hours'), 'NOW');
});

test('NOW is honest while NEXT 2H includes the immediate horizon', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');
  const open = plan('open');
  const inTwenty = plan('20m', { startsAt: '2026-08-30T00:20:00.000Z' });
  const inNinety = plan('90m', { startsAt: '2026-08-30T01:30:00.000Z' });
  const inThreeHours = plan('3h', { startsAt: '2026-08-30T03:00:00.000Z' });
  const ended = plan('ended', {
    startsAt: '2026-08-29T23:00:00.000Z',
    endsAt: '2026-08-29T23:59:59.000Z',
  });
  const source = [open, inTwenty, inNinety, inThreeHours, ended];

  assert.deepEqual(filterWorldPulsePlans(source, 'NOW', now).map((entry) => entry.id), ['open', '20m']);
  assert.deepEqual(filterWorldPulsePlans(source, 'NEXT_2H', now).map((entry) => entry.id), ['open', '20m', '90m']);
});

test('TONIGHT uses the destination timezone and excludes open unscheduled inventory', () => {
  const now = new Date('2026-08-30T08:00:00.000Z'); // 16:00 in Manila
  const earlyNight = plan('early', { startsAt: '2026-08-30T12:00:00.000Z' });
  const lateNight = plan('late', { startsAt: '2026-08-30T19:30:00.000Z' });
  const afterFour = plan('after', { startsAt: '2026-08-30T20:30:00.000Z' });
  const open = plan('open');

  assert.deepEqual(
    filterWorldPulsePlans([earlyNight, lateNight, afterFour, open], 'TONIGHT', now).map((entry) => entry.id),
    ['early', 'late'],
  );
});

test('pulse labels separate real crew reports, source-checked events and stale plans', () => {
  const now = new Date('2026-08-30T00:00:00.000Z');
  assert.equal(getWorldPulseSignal(plan('needs-one'), now).label, 'Needs 1');
  assert.equal(getWorldPulseSignal(plan('crew', {
    people: { going: 4, interested: 0, minimum: 4, spotsNeeded: 0, unlocked: true },
    status: { key: 'READY', label: 'Ready', forming: false },
  }), now).state, 'REPORTED');
  assert.equal(getWorldPulseSignal(plan('event', {
    type: 'venue_event',
    status: { key: 'PUBLISHED', label: 'Source checked', forming: false },
    startsAt: '2026-08-30T00:10:00.000Z',
    trust: { label: 'Venue confirmed', sourceLabel: 'Instagram' },
  }), now).state, 'SOURCE_CHECKED');
  assert.equal(getWorldPulseSignal(plan('old', { endsAt: '2026-08-29T23:59:59.000Z' }), now).state, 'OUTDATED');
});

test('PeeBear lanes only select matching real visible inventory', () => {
  const workout = plan('workout', {
    title: 'Make a mini workout',
    type: 'community_spark',
    people: null,
    status: { key: 'OPEN', label: 'Open', forming: false },
  });
  const surf = plan('surf', {
    title: 'Choose today’s surf plan',
    type: 'community_spark',
    people: null,
    status: { key: 'OPEN', label: 'Open', forming: false },
  });
  const social = plan('social', {
    title: 'Trivia tonight',
    type: 'venue_event',
    people: null,
    status: { key: 'PUBLISHED', label: 'Source checked', forming: false },
  });

  assert.equal(pickWorldPulsePlan([workout, surf, social], 'SURF', daytime)?.id, 'surf');
  assert.equal(pickWorldPulsePlan([workout, surf, social], 'MEET', daytime)?.id, 'social');
  assert.equal(pickWorldPulsePlan([workout, surf, social], 'PLAY', daytime)?.id, 'workout');
  assert.equal(pickWorldPulsePlan([workout, surf, social], 'SURPRISE', daytime)?.id, 'workout');
  assert.equal(pickWorldPulsePlan([workout], 'SURF', daytime), null);
});

test('PeeBear showdown compares at most two real plans and resolves one winner', () => {
  const surf = plan('surf', {
    title: 'Choose today’s surf plan',
    type: 'community_spark',
    people: null,
    status: { key: 'OPEN', label: 'Open', forming: false },
  });
  const boat = plan('boat', {
    type: 'boat',
    title: 'Rock Island surf boat',
  });
  const trivia = plan('trivia', {
    type: 'venue_event',
    title: 'Trivia tonight',
    people: null,
    status: { key: 'PUBLISHED', label: 'Source checked', forming: false },
  });
  const sequence = [0.99, 0];
  const decision = getWorldPulseDecision([boat, surf, trivia], 'SURF', () => sequence.shift() ?? 0, daytime);

  assert.ok(decision);
  assert.deepEqual(decision.candidates.map((candidate) => candidate.id), ['boat', 'surf']);
  assert.equal(decision.winner.id, 'surf');
  assert.equal(decision.runnerUp?.id, 'boat');
  assert.match(decision.sideQuest ?? '', /combo|mate|easy version/i);
  assert.equal(decision.candidates.every((candidate) => [boat, surf, trivia].includes(candidate)), true);
});

test('PeeBear showdown degrades honestly to one candidate and never adds a paid-mission side quest', () => {
  const paid = plan('paid', {
    type: 'paid_dare',
    people: null,
    status: { key: 'PENDING', label: 'Open', forming: false },
  });
  const decision = getWorldPulseDecision([paid], 'SURPRISE', () => 0, daytime);

  assert.ok(decision);
  assert.equal(decision.candidates.length, 1);
  assert.equal(decision.winner, paid);
  assert.equal(decision.runnerUp, null);
  assert.equal(decision.sideQuest, null);
  assert.equal(getWorldPulseSideQuest(paid, () => 0), null);
});

test('shared pulse links preserve public map context without precise device coordinates', () => {
  const selected = plan('meet-1');
  const mapUrl = new URL(getWorldPulseMapHref(selected, 'NEXT_2H'), 'https://basedare.xyz');
  assert.equal(mapUrl.pathname, '/map');
  assert.equal(mapUrl.searchParams.get('pulse'), 'next2h');
  assert.equal(mapUrl.searchParams.get('plan'), 'meet-1');
  assert.equal(mapUrl.searchParams.get('meetupId'), 'meet-1');
  assert.equal(mapUrl.searchParams.get('lat'), '9.812');
  assert.equal(mapUrl.searchParams.get('lng'), '126.157');

  const mapViewUrl = new URL(getWorldPulseMapViewHref({ latitude: 9.803456, longitude: 126.159876 }, 'NOW'), 'https://basedare.xyz');
  assert.equal(mapViewUrl.searchParams.get('pulse'), 'now');
  assert.equal(mapViewUrl.searchParams.get('lat'), '9.803');
  assert.equal(mapViewUrl.searchParams.get('lng'), '126.16');

  const viewUrl = new URL(getWorldPulseViewHref({
    mode: 'TONIGHT',
    center: { latitude: 9.803456, longitude: 126.159876 },
    radiusKm: 12,
    selectedPlanId: 'meetup:meet-1',
    needsPeople: true,
  }), 'https://basedare.xyz');
  assert.equal(viewUrl.searchParams.get('mode'), 'tonight');
  assert.equal(viewUrl.searchParams.get('lat'), '9.803');
  assert.equal(viewUrl.searchParams.get('lng'), '126.16');
  assert.equal(viewUrl.searchParams.get('plan'), 'meetup:meet-1');
  assert.equal(viewUrl.searchParams.get('needs'), '1');
  assert.deepEqual(normalizeWorldPulseCenter('91', '126'), { latitude: 9.803, longitude: 126.159 });
});
