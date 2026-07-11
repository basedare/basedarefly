import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidTimeZone,
  parseUtcOffsetMinutes,
  tonightWindow,
  isMeetupTonight,
  isDareTonight,
  roundCoord3,
  normalizeActivityTitle,
  shapeMeetup,
  shapeDare,
  dedupeActivities,
  computeTotals,
  GRACE_STARTED_MS,
  type TonightActivity,
} from './tonight.ts';

const MANILA = 'Asia/Manila';

// --- timezone + window boundaries ---------------------------------------------

test('isValidTimeZone accepts IANA zones and rejects junk', () => {
  assert.equal(isValidTimeZone('Asia/Manila'), true);
  assert.equal(isValidTimeZone('UTC'), true);
  assert.equal(isValidTimeZone('Not/AZone'), false);
});

test('offset parsing: Manila +480, UTC 0, New York negative', () => {
  const now = new Date('2026-07-12T12:00:00.000Z');
  assert.equal(parseUtcOffsetMinutes(now, MANILA), 480);
  assert.equal(parseUtcOffsetMinutes(now, 'UTC'), 0);
  assert.equal(parseUtcOffsetMinutes(now, 'America/New_York'), -240);
});

test('window: Manila evening ends at next local 04:00', () => {
  // 20:00 local (12:00Z) → ends 04:00 local next day = 20:00Z same day
  const w = tonightWindow(new Date('2026-07-12T12:00:00.000Z'), MANILA);
  assert.equal(w.endUtc.toISOString(), '2026-07-12T20:00:00.000Z');
  assert.equal(w.tz, MANILA);
});

test('window boundary: 03:59 local ends today 04:00; 04:00 local rolls to tomorrow', () => {
  // 03:59 local Manila = 19:59Z previous day → end 04:00 local = 20:00Z
  const before = tonightWindow(new Date('2026-07-11T19:59:00.000Z'), MANILA);
  assert.equal(before.endUtc.toISOString(), '2026-07-11T20:00:00.000Z');
  // exactly 04:00 local → end is 04:00 local TOMORROW
  const at = tonightWindow(new Date('2026-07-11T20:00:00.000Z'), MANILA);
  assert.equal(at.endUtc.toISOString(), '2026-07-12T20:00:00.000Z');
});

test('window is destination-relative, not viewer-relative', () => {
  const now = new Date('2026-07-12T12:00:00.000Z');
  const manila = tonightWindow(now, MANILA);
  const ny = tonightWindow(now, 'America/New_York');
  assert.notEqual(manila.endUtc.toISOString(), ny.endUtc.toISOString());
});

// --- status + time filtering ----------------------------------------------------

const NOW = new Date('2026-07-12T12:00:00.000Z');
const WIN = tonightWindow(NOW, MANILA);

test('meetup filtering: active + inside window in; beyond window out', () => {
  assert.equal(isMeetupTonight({ status: 'active', startTime: new Date('2026-07-12T14:00:00.000Z') }, WIN, NOW.getTime()), true);
  assert.equal(isMeetupTonight({ status: 'active', startTime: new Date('2026-07-12T21:00:00.000Z') }, WIN, NOW.getTime()), false);
});

test('meetup filtering: exactly at window end is included (<=)', () => {
  assert.equal(isMeetupTonight({ status: 'active', startTime: WIN.endUtc }, WIN, NOW.getTime()), true);
});

test('meetup filtering: started within grace in; long-started out', () => {
  const recentlyStarted = new Date(NOW.getTime() - GRACE_STARTED_MS + 60_000);
  const longStarted = new Date(NOW.getTime() - GRACE_STARTED_MS - 60_000);
  assert.equal(isMeetupTonight({ status: 'active', startTime: recentlyStarted }, WIN, NOW.getTime()), true);
  assert.equal(isMeetupTonight({ status: 'active', startTime: longStarted }, WIN, NOW.getTime()), false);
});

test('meetup filtering: cancelled never shows regardless of time', () => {
  assert.equal(isMeetupTonight({ status: 'cancelled', startTime: new Date('2026-07-12T14:00:00.000Z') }, WIN, NOW.getTime()), false);
});

test('dare filtering: live PENDING with coords in; expired/settled/coordless out', () => {
  const base = { status: 'PENDING', latitude: 9.8, longitude: 126.1, expiresAt: null };
  assert.equal(isDareTonight(base, NOW.getTime()), true);
  assert.equal(isDareTonight({ ...base, expiresAt: new Date(NOW.getTime() - 1000) }, NOW.getTime()), false);
  assert.equal(isDareTonight({ ...base, expiresAt: new Date(NOW.getTime() + 1000) }, NOW.getTime()), true);
  assert.equal(isDareTonight({ ...base, status: 'VERIFIED' }, NOW.getTime()), false);
  assert.equal(isDareTonight({ ...base, status: 'PENDING_REVIEW' }, NOW.getTime()), false);
  assert.equal(isDareTonight({ ...base, latitude: null }, NOW.getTime()), false);
});

// --- location privacy -------------------------------------------------------------

test('coordinates are rounded to 3dp (~110m), never finer', () => {
  assert.equal(roundCoord3(9.8123456), 9.812);
  assert.equal(roundCoord3(126.1698765), 126.17);
});

test('shapeMeetup emits ONLY the public contract keys (no creator/contact leak)', () => {
  const shaped = shapeMeetup(
    {
      id: 'm1',
      title: 'Sunset swim',
      placeLabel: 'Cloud 9 boardwalk',
      venueId: 'v1',
      approxLat: 9.8123456,
      approxLng: 126.1698765,
      startTime: new Date('2026-07-12T14:00:00.000Z'),
    },
    { goingCount: 6, viewerIdentified: true, viewerRsvped: true, distanceKm: 1.2 },
  );
  assert.deepEqual(Object.keys(shaped).sort(), [
    'capacity', 'distanceKm', 'endsAt', 'goingCount', 'href', 'id', 'place',
    'reward', 'startsAt', 'title', 'type', 'viewer', 'visibility',
  ]);
  assert.deepEqual(Object.keys(shaped.place).sort(), ['approx', 'label', 'lat', 'lng', 'venueId']);
  assert.equal(shaped.place.lat, 9.812);
  assert.equal(shaped.place.lng, 126.17);
  assert.equal(shaped.place.approx, true);
  assert.equal(shaped.goingCount, 6);
  assert.equal(shaped.viewer.rsvped, true);
});

test('shapeDare emits ONLY the public contract keys (no staker/claim leak) + reward', () => {
  const shaped = shapeDare(
    {
      id: 'd1',
      shortId: 'abc123',
      title: 'Sunset signal',
      bounty: 8,
      latitude: 9.8000004,
      longitude: 126.1590009,
      venueId: null,
      locationLabel: 'Reef wall',
      expiresAt: new Date('2026-07-12T16:00:00.000Z'),
    },
    { viewerIdentified: false, distanceKm: null },
  );
  assert.deepEqual(Object.keys(shaped).sort(), [
    'capacity', 'distanceKm', 'endsAt', 'goingCount', 'href', 'id', 'place',
    'reward', 'startsAt', 'title', 'type', 'viewer', 'visibility',
  ]);
  assert.deepEqual(shaped.reward, { amountUsdc: 8 });
  assert.equal(shaped.goingCount, null);
  assert.equal(shaped.startsAt, null);
  assert.equal(shaped.endsAt, '2026-07-12T16:00:00.000Z');
  assert.equal(shaped.href, '/dare/abc123');
});

test('zero-bounty dare has reward null (community spark), not reward 0', () => {
  const shaped = shapeDare(
    { id: 'd2', shortId: null, title: 'Spark', bounty: 0, latitude: 9.8, longitude: 126.1, venueId: null, locationLabel: null, expiresAt: null },
    { viewerIdentified: false, distanceKm: null },
  );
  assert.equal(shaped.reward, null);
  assert.equal(shaped.href, '/dare/d2');
});

// --- deduplication ----------------------------------------------------------------

function act(overrides: Partial<TonightActivity> & { id: string; type: 'dare' | 'meetup' }): TonightActivity {
  return {
    title: 'Sunset swim',
    startsAt: null,
    endsAt: null,
    place: { venueId: 'v1', label: 'x', lat: 9.8, lng: 126.1, approx: true },
    distanceKm: null,
    goingCount: overrides.type === 'meetup' ? 3 : null,
    capacity: null,
    reward: overrides.type === 'dare' ? { amountUsdc: 5 } : null,
    viewer: { identified: false, rsvped: false },
    visibility: 'public',
    href: '/x',
    ...overrides,
  } as TonightActivity;
}

test('dedupe: dare + meetup at same venue with same normalized title → dare wins', () => {
  const out = dedupeActivities([
    act({ id: 'd1', type: 'dare', title: 'Sunset Swim!' }),
    act({ id: 'm1', type: 'meetup', title: 'sunset swim' }),
  ]);
  assert.equal(out.length, 1);
  assert.equal(out[0].type, 'dare');
});

test('dedupe: different venues never merge; null venueId never merges', () => {
  const differentVenue = dedupeActivities([
    act({ id: 'd1', type: 'dare' }),
    act({ id: 'm1', type: 'meetup', place: { venueId: 'v2', label: 'x', lat: 9.8, lng: 126.1, approx: true } }),
  ]);
  assert.equal(differentVenue.length, 2);
  const nullVenue = dedupeActivities([
    act({ id: 'd1', type: 'dare', place: { venueId: null, label: 'x', lat: 9.8, lng: 126.1, approx: true } }),
    act({ id: 'm1', type: 'meetup', place: { venueId: null, label: 'x', lat: 9.8, lng: 126.1, approx: true } }),
  ]);
  assert.equal(nullVenue.length, 2);
});

test('dedupe: different titles at the same venue never merge', () => {
  const out = dedupeActivities([
    act({ id: 'd1', type: 'dare', title: 'Sunset swim' }),
    act({ id: 'm1', type: 'meetup', title: 'Beach fire' }),
  ]);
  assert.equal(out.length, 2);
});

test('dedupe: exact same record twice collapses to one', () => {
  const a = act({ id: 'm1', type: 'meetup' });
  assert.equal(dedupeActivities([a, a]).length, 1);
});

test('normalizeActivityTitle collapses punctuation/case', () => {
  assert.equal(normalizeActivityTitle('  Sunset — SWIM!! '), 'sunset swim');
});

// --- honest totals ------------------------------------------------------------------

test('totals: empty list returns honest zeros', () => {
  assert.deepEqual(computeTotals([]), { activities: 0, dares: 0, meetups: 0, going: 0 });
});

test('totals: going sums meetup RSVPs; dares contribute no fake going', () => {
  const totals = computeTotals([
    act({ id: 'd1', type: 'dare' }),
    act({ id: 'm1', type: 'meetup', goingCount: 6 }),
    act({ id: 'm2', type: 'meetup', goingCount: 0, place: { venueId: 'v3', label: 'x', lat: 9.8, lng: 126.1, approx: true } }),
  ]);
  assert.deepEqual(totals, { activities: 3, dares: 1, meetups: 2, going: 6 });
});
