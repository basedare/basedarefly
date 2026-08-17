import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  computeLivePlanTotals,
  dedupeLivePlans,
  getSpotsNeeded,
  shapeLiveBoatPlan,
  shapeLiveDarePlan,
  shapeLiveMeetupPlan,
  shapeLiveVenueEventPlan,
  shouldIncludeLiveDare,
  sortLivePlans,
  type LivePlan,
} from './live-plans.ts';
import type { BoatCrewSummary } from './surf-boat-board.ts';

test('spots needed never falls below zero and stays null without a threshold', () => {
  assert.equal(getSpotsNeeded(1, 4), 3);
  assert.equal(getSpotsNeeded(5, 4), 0);
  assert.equal(getSpotsNeeded(2, null), null);
});

test('boat plan exposes the real Rally threshold, price, viewer state and share path', () => {
  const crew: BoatCrewSummary = {
    id: 'crew-1',
    venueSlug: 'kanaway-surf-school',
    departureDay: '2026-08-16',
    timeWindow: 'early',
    destination: 'rock-island',
    abilityLane: 'independent',
    minimumCrew: 4,
    indicativeTotalPhp: 1200,
    status: 'FORMING',
    confirmedCount: 3,
    interestedCount: 1,
    boardCount: 0,
    acceptedCount: 0,
    projectedSharePhp: 300,
    creatorTag: '@surfer',
    isCreator: false,
    viewerMembership: {
      commitment: 'CONFIRMED',
      needsBoard: false,
      acceptedFinalDetails: false,
    },
    operatorConfirmation: null,
  };
  const plan = shapeLiveBoatPlan(crew, {
    venueId: 'venue-1',
    latitude: 9.81234,
    longitude: 126.15678,
    startsAt: new Date('2026-08-15T23:00:00.000Z'),
    endsAt: new Date('2026-08-16T01:00:00.000Z'),
    distanceKm: 1.2,
    viewerIdentified: true,
    display: {
      launchLabel: 'Kanaway',
      destinationLabel: "Stimpy's",
      timeLabel: 'Early · 7–9 AM',
      statusLabel: 'Loading',
      shareText: "Stimpy's surf boat\nKanaway",
      href: '/community/boat/crew-1?invite=crew',
    },
  });

  assert.equal(plan.type, 'boat');
  assert.equal(plan.people?.spotsNeeded, 1);
  assert.equal(plan.people?.unlocked, false);
  assert.equal(plan.value?.indicativePerPersonPhp, 300);
  assert.equal(plan.action.label, 'Join crew');
  assert.equal(plan.viewer.state, 'GOING');
  assert.equal(plan.viewer.isNextMove, true);
  assert.equal(plan.place.lat, 9.812);
  assert.equal(plan.share.href, '/community/boat/crew-1?invite=crew');
});

test('meetup plan becomes a forming Rally only when minimumPeople is present', () => {
  const plan = shapeLiveMeetupPlan({
    id: 'meet-1',
    title: 'Padel match',
    note: 'Intermediate, rackets available.',
    placeLabel: 'Siargao Padel Club',
    venueId: 'venue-2',
    venueSlug: 'siargao-padel-club',
    approxLat: 9.8,
    approxLng: 126.16,
    startTime: new Date('2026-08-16T09:00:00.000Z'),
    minimumPeople: 4,
  }, {
    going: 2,
    viewerIdentified: false,
    viewerJoined: false,
    distanceKm: 0.4,
  });
  assert.equal(plan.status.forming, true);
  assert.equal(plan.people?.spotsNeeded, 2);
  assert.equal(plan.status.label, '2 more needed');
  assert.equal(plan.action.label, "I'm in");
});

test('venue event keeps source trust and real RSVP states', () => {
  const plan = shapeLiveVenueEventPlan({
    id: 'event-1',
    slug: 'trivia-night',
    title: 'Trivia Night',
    summary: 'Weekly public trivia.',
    startsAt: new Date('2026-08-16T11:00:00.000Z'),
    endsAt: null,
    priceLabel: null,
    trustLabel: 'Venue confirmed',
    sourceLabel: 'Instagram',
    venue: {
      id: 'venue-3',
      slug: 'hideaway',
      name: 'Hideaway',
      latitude: 9.8,
      longitude: 126.16,
    },
  }, {
    going: 6,
    interested: 2,
    viewerIdentified: true,
    viewerStatus: 'GOING',
    distanceKm: 0.8,
  });
  assert.equal(plan.trust.label, 'Venue confirmed');
  assert.equal(plan.trust.sourceLabel, 'Instagram');
  assert.equal(plan.viewer.isNextMove, true);
  assert.equal(plan.people?.going, 6);
});

test('dare adapters preserve Play versus Claim and never emit a zero reward', () => {
  const common = {
    shortId: null,
    expiresAt: null,
    venueId: null,
    venueSlug: null,
    locationLabel: 'Cloud 9',
    latitude: 9.81,
    longitude: 126.17,
    claimedBy: null,
    claimRequestWallet: null,
  };
  const spark = shapeLiveDarePlan({ ...common, id: 'spark-1', title: 'Name your line', tag: 'community', bounty: 0 }, {
    viewerIdentified: false,
    viewerWallet: null,
    distanceKm: null,
  });
  const paid = shapeLiveDarePlan({ ...common, id: 'dare-1', title: 'Check the trail', tag: 'fitness', bounty: 8 }, {
    viewerIdentified: false,
    viewerWallet: null,
    distanceKm: null,
  });
  assert.equal(spark.type, 'community_spark');
  assert.equal(spark.action.label, 'Play');
  assert.equal(spark.value, null);
  assert.equal(paid.type, 'paid_dare');
  assert.equal(paid.action.label, 'Claim');
  assert.equal(paid.value?.rewardUsdc, 8);
  assert.equal(shouldIncludeLiveDare({ tag: 'fitness', bounty: 0 }), false);
  assert.equal(shouldIncludeLiveDare({ tag: 'community', bounty: 0 }), true);
  assert.equal(shouldIncludeLiveDare({ tag: 'fitness', bounty: 8 }), true);
});

function stub(id: string, type: LivePlan['type'], overrides: Partial<LivePlan> = {}): LivePlan {
  return {
    id: `${type}:${id}`,
    sourceId: id,
    type,
    title: 'Trivia Night',
    summary: null,
    startsAt: null,
    endsAt: null,
    place: { venueId: 'venue-1', venueSlug: 'hideaway', label: 'Hideaway', lat: 9.8, lng: 126.16, approx: true },
    distanceKm: 1,
    people: null,
    value: null,
    status: { key: 'OPEN', label: 'Open', forming: false },
    action: { kind: 'JOIN', label: "I'm in", href: '/x' },
    share: { href: '/x', title: 'x', text: 'x' },
    trust: { label: 'Public', sourceLabel: null },
    viewer: { identified: false, state: 'NONE', isNextMove: false },
    visibility: 'public',
    ...overrides,
  };
}

test('dedupe is conservative: exact paid dare place/title wins, different titles stay', () => {
  const result = dedupeLivePlans([
    stub('paid', 'paid_dare'),
    stub('event', 'venue_event'),
    stub('meet', 'meetup', { title: 'Padel match' }),
  ]);
  assert.deepEqual(result.map((plan) => plan.id), ['paid_dare:paid', 'meetup:meet']);
});

test('sorting prioritizes My Next Move, then plans that need people', () => {
  const sorted = sortLivePlans([
    stub('open', 'meetup'),
    stub('forming', 'meetup', { status: { key: 'FORMING', label: '1 more', forming: true } }),
    stub('mine', 'venue_event', { viewer: { identified: true, state: 'GOING', isNextMove: true } }),
  ], new Date('2026-08-15T00:00:00.000Z'));
  assert.deepEqual(sorted.map((plan) => plan.sourceId), ['mine', 'forming', 'open']);
});

test('totals keep sources and real people separate', () => {
  const totals = computeLivePlanTotals([
    stub('boat', 'boat', { people: { going: 3, interested: 1, minimum: 4, spotsNeeded: 1, unlocked: false }, status: { key: 'FORMING', label: 'Loading', forming: true } }),
    stub('event', 'venue_event', { people: { going: 6, interested: 2, minimum: null, spotsNeeded: null, unlocked: true } }),
    stub('spark', 'community_spark'),
  ]);
  assert.deepEqual(totals, {
    plans: 3,
    going: 9,
    forming: 1,
    boats: 1,
    meetups: 0,
    events: 1,
    sparks: 1,
    paidDares: 0,
  });
});
