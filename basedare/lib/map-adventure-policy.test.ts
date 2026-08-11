import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getAdventurePlaceSprite,
  shouldRenderAdventureActivityMarker,
  shouldRenderLocalSignalMarker,
  SURF_SIGNAL_PATTERN,
} from './map-adventure-policy.ts';

test('bar identity wins over nearby boardwalk, dock, and beach categories', () => {
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['nightlife', 'boardwalk', 'dock', 'bar'],
    }),
    'beer'
  );
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['nightlife', 'music', 'beach-club', 'bar'],
    }),
    'beer'
  );
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['bar', 'lounge', 'sunset', 'cocktails', 'catangnan'],
    }),
    'beer'
  );
});

test('named premium drink venues use the wine glass while ordinary bars keep beer', () => {
  for (const venue of [
    { venueSlug: 'greenroom-wine-bar-siargao', venueName: 'Greenroom Wine Bar & Bistro Siargao' },
    { venueSlug: 'mr-turtle-siargao', venueName: 'Mr. Turtle Siargao' },
    { venueSlug: 'last-chance-siargao', venueName: 'Last Chance' },
  ]) {
    assert.equal(
      getAdventurePlaceSprite({
        challengeLiveCount: 0,
        categories: ['bar', 'cocktail', 'nightlife'],
        ...venue,
      }),
      'wine',
    );
  }

  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['wine-bar', 'bar', 'nightlife'],
      venueName: 'Another Wine Bar',
    }),
    'beer',
  );
});

test('surfboards are reserved for actual surf signals', () => {
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['surf', 'wave-check', 'beach'],
    }),
    'surf'
  );
  assert.equal(SURF_SIGNAL_PATTERN.test('Hideaway boardwalk bar beside the dock'), false);
  assert.equal(SURF_SIGNAL_PATTERN.test('Green Waves Cafe'), false);
  assert.equal(SURF_SIGNAL_PATTERN.test('surf-camp restaurant'), false);
  assert.equal(SURF_SIGNAL_PATTERN.test('Cloud 9 morning wave check'), true);
});

test('primary venue identity prevents restaurant and cafe surf false positives', () => {
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['restaurant', 'surf-camp', 'pizza', 'social'],
    }),
    'cafe'
  );
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['cafe', 'breakfast', 'surf', 'work-friendly'],
    }),
    'cafe'
  );
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['surf', 'resort', 'restaurant'],
    }),
    'surf'
  );
});

test('activity supply resolves into three restrained map families', () => {
  assert.equal(
    getAdventurePlaceSprite({ challengeLiveCount: 0, categories: ['fitness', 'gym', 'weights'] }),
    'fitness'
  );
  assert.equal(
    getAdventurePlaceSprite({ challengeLiveCount: 0, categories: ['surf-rental', 'surf-shop'] }),
    'rental'
  );
  assert.equal(
    getAdventurePlaceSprite({ challengeLiveCount: 0, categories: ['surf-school', 'surf-lessons'] }),
    'rental'
  );
  assert.equal(
    getAdventurePlaceSprite({ challengeLiveCount: 0, categories: ['wellness', 'pilates', 'massage'] }),
    'wellness'
  );
});

test('beaches, attractions, and outdoor activities use the palm marker', () => {
  assert.equal(
    getAdventurePlaceSprite({ challengeLiveCount: 0, categories: ['beach', 'island'] }),
    'palm'
  );
  assert.equal(
    getAdventurePlaceSprite({ challengeLiveCount: 0, categories: ['nature', 'tour', 'activity'] }),
    'palm'
  );
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['skate-road', 'longboard', 'sunset', 'outdoor'],
    }),
    'palm'
  );
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['activity', 'wakepark', 'wakeboard', 'hydrofoil'],
    }),
    'palm'
  );
});

test('a beach bar keeps its nightlife identity beside beach activities', () => {
  assert.equal(
    getAdventurePlaceSprite({
      challengeLiveCount: 0,
      categories: ['beach-bar', 'bar', 'paddleboard', 'swimming'],
    }),
    'beer'
  );
});

test('a live funded challenge remains the strongest marker state', () => {
  assert.equal(
    getAdventurePlaceSprite({ challengeLiveCount: 1, categories: ['nightlife', 'bar'] }),
    'flag'
  );
});

test('venue-backed dares reuse the venue flag instead of stacking a focal flag', () => {
  const renderedVenueIds = new Set(['venue-kanaway', 'venue-marco', 'venue-malinao']);

  for (const venueId of renderedVenueIds) {
    assert.equal(
      shouldRenderAdventureActivityMarker({
        activityType: 'dare',
        venueId,
        renderedVenueIds,
      }),
      false,
    );
  }
});

test('standalone dares and meetups keep their dedicated activity marker', () => {
  const renderedVenueIds = new Set(['venue-kanaway']);

  assert.equal(
    shouldRenderAdventureActivityMarker({
      activityType: 'dare',
      venueId: null,
      renderedVenueIds,
    }),
    true,
  );
  assert.equal(
    shouldRenderAdventureActivityMarker({
      activityType: 'meetup',
      venueId: 'venue-kanaway',
      renderedVenueIds,
    }),
    true,
  );
});

test('place-bound local posts decorate one canonical marker instead of stacking', () => {
  const renderedVenueSlugs = new Set(['happiness-beach-bar-siargao']);
  assert.equal(
    shouldRenderLocalSignalMarker({
      venueSlug: 'happiness-beach-bar-siargao',
      renderedVenueSlugs,
    }),
    false,
  );
  assert.equal(
    shouldRenderLocalSignalMarker({ venueSlug: '', renderedVenueSlugs }),
    true,
  );
});
