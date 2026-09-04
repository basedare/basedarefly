import assert from 'node:assert/strict';
import test from 'node:test';
import { assessRecommendation, destinationHour, rankRecommendations, requiresDaylight, solarElevation, type RecommendationContext, type RecommendationInput } from './recommendation-policy.ts';
import { tonightWindow, type TonightActivity } from './tonight.ts';
import { rankTonightActivities } from './tonight-recommendations.ts';
import { getSiargaoNightGuide } from './siargao-nightlife.ts';
import { filterWorldPulsePlans, getWorldPulseDecision } from './world-pulse.ts';
import type { LivePlan } from './live-plans.ts';

const fridayNight: RecommendationContext = { now: new Date('2026-09-04T15:00:00Z'), window: 'now', timeZone: 'Asia/Manila' };
const daytime: RecommendationContext = { ...fridayNight, now: new Date('2026-09-04T02:00:00Z') };
const surf: RecommendationInput = { title: 'Cloud 9', kind: 'place', categories: ['surf', 'beach'], latitude: 9.81, longitude: 126.16 };
const bar: RecommendationInput = { ...surf, title: 'Beach bar', categories: ['bar', 'beach', 'surf'] };
const activity = (extra: Partial<RecommendationInput> = {}): RecommendationInput => ({ ...surf, kind: 'activity', title: 'Trivia', ...extra });

test('Friday night: popularity can never bring a surf spot back into now', () => {
  const ranked = rankRecommendations([surf, bar], (item) => item, fridayNight, (item) => item === surf ? 1_000_000 : 0);
  assert.deepEqual(ranked.map(({ item }) => item.title), ['Beach bar']);
  assert.match(ranked[0].assessment.reason, /hours unconfirmed/);
  assert.ok(assessRecommendation(surf, daytime).eligible);
  assert.ok(assessRecommendation(surf, { ...fridayNight, window: 'browse' }).eligible);
});

test('daylight uses coordinates and seasons, not the device timezone', () => {
  assert.ok(solarElevation(new Date('2026-09-04T04:00:00Z'), 9.81, 126.16)! > 60);
  assert.ok(solarElevation(fridayNight.now, 9.81, 126.16)! < 0);
  assert.ok(solarElevation(new Date('2026-06-21T23:00:00Z'), 69.65, 18.96)! > 0);
  assert.ok(solarElevation(new Date('2026-12-21T11:00:00Z'), 69.65, 18.96)! < 0);
  assert.equal(destinationHour(fridayNight.now, 126.16, 'Asia/Manila'), 23);
  assert.equal(destinationHour(fridayNight.now, 126.16), 23);
  assert.equal(assessRecommendation(surf, { ...fridayNight, timeZone: 'America/New_York' }).eligible, false);
});

test('sunset margin and missing coordinates withhold water recommendations', () => {
  assert.equal(assessRecommendation(surf, { ...daytime, now: new Date('2026-09-04T09:20:00Z') }).eligible, false);
  assert.equal(assessRecommendation({ ...surf, latitude: NaN }, daytime).eligible, false);
});

test('primary venue identity and actual activity win over incidental surf geography', () => {
  assert.equal(requiresDaylight(bar), false);
  assert.equal(requiresDaylight({ ...surf, categories: ['restaurant', 'surf-camp'] }), false);
  assert.equal(requiresDaylight(activity({ title: 'Surf film screening' })), false);
  assert.equal(requiresDaylight(activity({ title: 'Surf lesson' })), true);
  assert.equal(assessRecommendation(activity({ title: 'Surf film screening' }), fridayNight).eligible, true);
  assert.equal(assessRecommendation(activity({ title: 'Night surf' }), fridayNight).eligible, false);
});

test('a cafe is not the fallback at 1am, and historic proof is not current attendance', () => {
  const now = new Date('2026-09-04T17:00:00Z');
  assert.equal(assessRecommendation({ ...surf, categories: ['cafe'] }, { ...fridayNight, now }).eligible, false);
  const old = assessRecommendation({ ...bar, lastVerifiedAt: '2026-09-01T12:00:00Z' }, fridayNight);
  assert.doesNotMatch(old.reason, /updated|live|people|open now/i);
  const fresh = assessRecommendation({ ...bar, lastVerifiedAt: '2026-09-04T14:00:00Z' }, fridayNight);
  assert.match(fresh.reason, /updated within 6h/);
  assert.doesNotMatch(fresh.reason, /people|open now/i);
});

test('now has a 30 minute horizon; later plans use their own daylight', () => {
  const future = activity({ title: 'Surf lesson', startsAt: '2026-09-04T03:30:00Z' });
  assert.equal(assessRecommendation(future, daytime).eligible, false);
  assert.equal(assessRecommendation(future, { ...daytime, window: 'next2h' }).eligible, true);
  const nightSurf = activity({ title: 'Surf lesson', startsAt: '2026-09-04T15:30:00Z' });
  assert.equal(assessRecommendation(nightSurf, { ...fridayNight, window: 'next2h' }).eligible, false);
});

test('expired, invalid, reversed and nearly closed windows cannot win', () => {
  for (const extra of [
    { endsAt: fridayNight.now.toISOString() },
    { startsAt: 'invalid' },
    { endsAt: 'invalid' },
    { startsAt: '2026-09-04T16:00:00Z', endsAt: '2026-09-04T15:30:00Z' },
    { endsAt: '2026-09-04T15:05:00Z' },
    { startsAt: '2026-09-04T12:00:00Z' },
  ]) assert.equal(assessRecommendation(activity(extra), fridayNight).eligible, false, JSON.stringify(extra));
  assert.equal(assessRecommendation(activity({ startsAt: '2026-09-04T12:00:00Z', endsAt: '2026-09-04T18:00:00Z' }), fridayNight).eligible, true);
});

test('tonight rolls over at 4am and accounts for DST at the endpoint', () => {
  assert.equal(tonightWindow(new Date('2026-11-01T05:00:00Z'), 'America/New_York').endUtc.toISOString(), '2026-11-01T09:00:00.000Z');
  assert.equal(tonightWindow(new Date('2026-03-08T06:00:00Z'), 'America/New_York').endUtc.toISOString(), '2026-03-08T08:00:00.000Z');
  assert.equal(getSiargaoNightGuide(new Date('2026-09-04T17:00:00Z')).weekday, 'Friday');
  assert.equal(getSiargaoNightGuide(new Date('2026-09-04T20:00:00Z')).weekday, 'Saturday');
});

test('PeeBear map and World Pulse agree, and tomorrow stays browseable', () => {
  function tonight(title: string, startsAt: string | null): TonightActivity {
    return { id: title, title, startsAt, type: 'meetup', endsAt: null, place: { venueId: null, label: 'Surf school', lat: 9.81, lng: 126.16, approx: true }, distanceKm: 1, goingCount: 4, capacity: null, reward: null, viewer: { identified: false, rsvped: false }, visibility: 'public', href: '/map' };
  }
  const source = [tonight('Surf lesson', null), tonight('Trivia', '2026-09-04T15:20:00Z'), tonight('Morning surf', '2026-09-05T00:00:00Z')];
  const live: LivePlan[] = source.map((item) => ({
    id: item.id, sourceId: item.id, type: 'meetup', title: item.title, summary: null, startsAt: item.startsAt, endsAt: null,
    place: { ...item.place, venueSlug: null }, distanceKm: 1, people: null, value: null,
    status: { key: 'OPEN', label: 'Open', forming: false }, action: { kind: 'JOIN', label: 'Join', href: '/map' },
    share: { title: item.title, text: item.title, href: '/map' }, trust: { label: 'Reported', sourceLabel: null },
    viewer: { identified: false, state: 'NONE', isNextMove: false }, visibility: 'public',
  }));
  assert.deepEqual(rankTonightActivities(source, fridayNight).map(({ item }) => item.id), ['Trivia']);
  assert.deepEqual(filterWorldPulsePlans(live, 'NOW', fridayNight.now).map((item) => item.id), ['Trivia']);
  for (const random of [() => 0, () => 0.99]) {
    assert.equal(getWorldPulseDecision(live, 'SURPRISE', random, fridayNight)?.winner.id, 'Trivia');
  }
  assert.equal(getWorldPulseDecision(live, 'SURF', () => 0, fridayNight), null);
  assert.equal(filterWorldPulsePlans(live, 'ALL', fridayNight.now).some((item) => item.id === 'Morning surf'), true);
});
