import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  getAdventurePlaceSprite,
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
