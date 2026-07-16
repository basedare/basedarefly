import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  selectFieldStationInventory,
  type FieldStationInventoryCandidate,
} from './inventory-policy.ts';

function candidate(
  id: string,
  overrides: Partial<FieldStationInventoryCandidate> = {}
): FieldStationInventoryCandidate {
  return {
    id,
    source: 'NIGHT_GUIDE',
    attention: 'TONIGHT',
    title: id,
    placeLabel: id,
    venueId: id,
    venueSlug: id,
    href: `/venues/${id}`,
    targetType: 'VENUE',
    targetId: id,
    distanceKm: 1,
    startsAt: null,
    endsAt: null,
    lastVerifiedAt: '2026-07-15T00:00:00.000Z',
    trustLabel: 'Usual weekly rhythm',
    freshnessLabel: 'Checked recently',
    disclaimer: 'Confirm with the venue.',
    qualityScore: 60,
    ...overrides,
  };
}

test('quality gate returns no weak partial promise below the minimum', () => {
  const result = selectFieldStationInventory([candidate('one'), candidate('two')], 3);
  assert.equal(result.qualifyingCount, 2);
  assert.equal(result.isLowDensity, true);
  assert.deepEqual(result.items, []);
  assert.equal(result.fallbackReason, 'BELOW_MINIMUM_QUALITY_DENSITY');
});

test('selection is ranked and capped to exactly three useful answers', () => {
  const result = selectFieldStationInventory([
    candidate('four', { qualityScore: 65 }),
    candidate('two', { qualityScore: 90 }),
    candidate('one', { qualityScore: 95 }),
    candidate('three', { qualityScore: 80 }),
  ], 3);
  assert.equal(result.qualifyingCount, 4);
  assert.deepEqual(result.items.map((item) => item.id), ['one', 'two', 'three']);
});

test('confirmed activity replaces the weekly guide for the same venue', () => {
  const result = selectFieldStationInventory([
    candidate('guide', { venueId: 'venue-a', qualityScore: 60 }),
    candidate('confirmed', {
      source: 'MEETUP',
      venueId: 'venue-a',
      qualityScore: 95,
      trustLabel: 'Confirmed public activity',
    }),
    candidate('venue-b'),
    candidate('venue-c'),
  ], 3);
  assert.equal(result.qualifyingCount, 3);
  assert.equal(result.items[0].id, 'confirmed');
  assert.equal(result.items.some((item) => item.id === 'guide'), false);
});

test('venue-less activities dedupe only by source and id', () => {
  const result = selectFieldStationInventory([
    candidate('a', { source: 'MEETUP', venueId: null }),
    candidate('b', { source: 'MEETUP', venueId: null }),
    candidate('c', { source: 'LOCAL_SIGNAL', venueId: null }),
  ], 3);
  assert.equal(result.qualifyingCount, 3);
});
