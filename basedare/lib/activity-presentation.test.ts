import test from 'node:test';
import assert from 'node:assert/strict';
import { activityTimeLabel, browsePlanInventory } from './activity-presentation';
import type { LivePlan } from './live-plans';

const now = new Date('2026-10-14T04:00:00Z');
test('future plans keep their destination time, including starts inside the Now lookahead', () => {
  const plan = { type: 'meetup' as const, startsAt: '2026-10-14T04:20:00Z', endsAt: null };
  assert.match(activityTimeLabel(plan, now, 'Asia/Manila'), /12:20/);
  assert.doesNotMatch(activityTimeLabel(plan, now, 'Asia/Manila'), /live|happening now/i);
});
test('unknown, expired and malformed schedules are not rendered live', () => {
  assert.equal(activityTimeLabel({ type: 'meetup', startsAt: null, endsAt: null }, now), 'Time to be confirmed');
  assert.equal(activityTimeLabel({ type: 'paid_dare', startsAt: null, endsAt: null }, now), 'Available · see brief');
  assert.equal(activityTimeLabel({ type: 'meetup', startsAt: 'bad', endsAt: null }, now), 'Time to be confirmed');
  assert.equal(activityTimeLabel({ type: 'meetup', startsAt: '2026-10-14T03:00:00Z', endsAt: now.toISOString() }, now), 'Ended · see details');
  assert.equal(activityTimeLabel({ type: 'meetup', startsAt: '2026-10-14T03:00:00Z', endsAt: null }, now), 'Started · check details');
  assert.doesNotThrow(() => activityTimeLabel({ type: 'meetup', startsAt: '2026-10-14T04:20:00Z', endsAt: null }, now, 'invalid'));
});

test('Now and List policy combines time, participation and forming filters without showing unfunded rewards', () => {
  function plan(id: string, input: Partial<LivePlan> = {}): LivePlan {
    return { id, sourceId: id, type: 'meetup', title: id, summary: null, startsAt: now.toISOString(), endsAt: '2026-10-14T06:00:00Z',
      place: { venueId: 'venue', venueSlug: 'public-place', label: 'Public place', lat: 9.79, lng: 126.16, approx: true }, distanceKm: 1,
      people: null, value: null, status: { key: 'ACTIVE', label: 'Planned', forming: false },
      action: { kind: 'JOIN', label: 'View plan', href: '/community/meet/' + id }, share: { title: id, text: id, href: '/community/meet/' + id },
      trust: { label: 'Public plan', sourceLabel: null }, viewer: { identified: false, state: 'NONE', isNextMove: false }, visibility: 'public', ...input };
  }
  const inventory = [plan('meet', { status: { key: 'FORMING', label: 'Needs people', forming: true } }), plan('free', { type: 'community_spark' }),
    plan('paid', { type: 'paid_dare', value: { rewardUsdc: 25, indicativePerPersonPhp: null } }), plan('unfunded', { type: 'paid_dare' }),
    plan('later', { startsAt: '2026-10-14T05:00:00Z' })];
  const context = { mode: 'NOW' as const, now, timeZone: 'Asia/Manila' };
  assert.deepEqual(browsePlanInventory(inventory, { ...context, participation: 'play' }).map((item) => item.id), ['free']);
  assert.deepEqual(browsePlanInventory(inventory, { ...context, participation: 'earn' }).map((item) => item.id), ['paid']);
  assert.deepEqual(browsePlanInventory(inventory, { ...context, participation: 'meet', needsPeople: true }).map((item) => item.id), ['meet']);
  assert.deepEqual(browsePlanInventory(inventory, { ...context, mode: 'NEXT_2H', participation: 'meet' }).map((item) => item.id), ['meet', 'later']);
});
