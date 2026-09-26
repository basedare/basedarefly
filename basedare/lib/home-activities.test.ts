import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { LivePlan } from './live-plans';
import { SIARGAO_ACTIVITY_AREA, suggestionsForArea, visibleHomePlans, visibleHomePosts, readSavedActivity, homePlanTime } from './home-activities';
import { eventPosterError, eventPosterMatchesBytes } from './event-poster';
import { inferVenueEventDraft } from './venue-events';

const now = new Date('2026-09-25T12:00:00Z'); // 20:00 in Siargao.
function plan(patch: Partial<LivePlan> = {}): LivePlan {
  return { id: 'event:1', sourceId: '1', type: 'venue_event', title: 'Music night', summary: null,
    startsAt: '2026-09-25T13:00:00Z', endsAt: '2026-09-25T16:00:00Z',
    place: { venueId: 'venue', venueSlug: 'venue', label: 'Venue', lat: 9.79, lng: 126.15, approx: true },
    distanceKm: 1, people: null, value: null, status: { key: 'PUBLISHED', label: 'Published', forming: false },
    action: { kind: 'GOING', label: 'See event', href: '/events/music' },
    share: { href: '/events/music', title: 'Music', text: 'Music' }, trust: { label: 'Source checked', sourceLabel: null },
    viewer: { identified: false, state: 'NONE', isNextMove: false }, visibility: 'public', ...patch };
}

test('quiet inventory has at least three authored ideas at every hour without daytime trips at night', () => {
  for (let hour = 0; hour < 24; hour++) {
    const date = new Date(Date.UTC(2026, 8, 25, hour));
    const ideas = suggestionsForArea(SIARGAO_ACTIVITY_AREA, date);
    assert.ok(ideas.length >= 3);
    assert.equal(new Set(ideas.map((s) => s.id)).size, ideas.length);
  }
  assert.ok(!suggestionsForArea(SIARGAO_ACTIVITY_AREA, now).some((s) => s.daylight));
  assert.ok(!suggestionsForArea(SIARGAO_ACTIVITY_AREA, new Date('2026-09-25T17:00:00Z')).some((s) => s.evening));
  assert.notEqual(suggestionsForArea(SIARGAO_ACTIVITY_AREA, now)[0].id, suggestionsForArea(SIARGAO_ACTIVITY_AREA, now, 1)[0].id);
});
test('feed expires stale records, deduplicates and preserves upcoming sourced events', () => {
  const current = plan();
  assert.equal(visibleHomePlans([current, current, plan({ id: 'old', endsAt: now.toISOString() }), plan({ id: 'cancelled', status: { key: 'CANCELLED', label: '', forming: false } }), plan({ id: 'bad', startsAt: 'invalid' })], SIARGAO_ACTIVITY_AREA, now, 'ALL').length, 1);
  assert.equal(visibleHomePlans([current], SIARGAO_ACTIVITY_AREA, now, 'EARN').length, 0);
  assert.equal(visibleHomePlans([current], SIARGAO_ACTIVITY_AREA, now, 'MEET').length, 1);
  assert.doesNotMatch(homePlanTime(current, now, 'Asia/Manila'), /now|Started/);
  assert.match(homePlanTime(current, now, 'Asia/Manila'), /9:00/);
});
test('local posts without expiry cannot stay around indefinitely or leak between areas', () => {
  const post = { id: 'x', title: 'Hang', notes: '', venueName: 'Venue', venueSlug: 'venue', city: 'Siargao', startsAt: '2026-09-25T13:00:00Z', endsAt: null, updatedAt: now.toISOString(), distanceKm: 2, sourceAttribution: 'Venue schedule', postType: 'hang' };
  assert.equal(visibleHomePosts([post], now).length, 1);
  assert.equal(visibleHomePosts([{ ...post, startsAt: '2026-09-24T13:00:00Z' }, { ...post, distanceKm: 100 }, { ...post, distanceKm: null }], now).length, 0);
});
test('personal progress survives refresh only within its own bounded lifetime', () => {
  const saved = { id: 'postcard', startedAt: now.getTime() - 1000 };
  assert.deepEqual(readSavedActivity(saved, now.getTime()), saved);
  assert.equal(readSavedActivity(saved, now.getTime() + 86400000), null);
  assert.equal(readSavedActivity({ ...saved, id: 'invented' }, now.getTime()), null);
  assert.equal(readSavedActivity({ ...saved, completedAt: now.getTime() + 1 }, now.getTime()), null);
});
test('poster intake rejects wrong types and false MIME declarations; ambiguous dates remain mentions', () => {
  assert.ok(eventPosterError({ size: 100, type: 'image/svg+xml' }));
  assert.ok(eventPosterError({ size: 5 * 1024 * 1024, type: 'image/jpeg' }));
  assert.equal(eventPosterMatchesBytes('image/jpeg', new Uint8Array([255, 216, 255])), true);
  assert.equal(eventPosterMatchesBytes('image/png', new Uint8Array([60, 115, 118, 103])), false);
  const draft = inferVenueEventDraft('THE SECOND STRUM\nMr Turtle\n9/25 3PM');
  assert.equal(draft.dateMention, '9/25');
  assert.equal(draft.timeMention, '3PM');
});
