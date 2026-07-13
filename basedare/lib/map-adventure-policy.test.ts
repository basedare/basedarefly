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
  assert.equal(SURF_SIGNAL_PATTERN.test('Cloud 9 morning wave check'), true);
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
});

test('a live funded challenge remains the strongest marker state', () => {
  assert.equal(
    getAdventurePlaceSprite({ challengeLiveCount: 1, categories: ['nightlife', 'bar'] }),
    'flag'
  );
});
