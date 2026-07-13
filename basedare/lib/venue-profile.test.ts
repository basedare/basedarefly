import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { buildVenueProfile } from './venue-profile.ts';

test('a boardwalk bar is not mislabeled as surf or lodging', () => {
  const profile = buildVenueProfile({
    name: 'Hideaway',
    description: 'Boardwalk bar energy right by the island hopping dock in General Luna.',
    categories: ['nightlife', 'boardwalk', 'dock', 'bar', 'dinner', 'late-night'],
    city: 'General Luna',
    country: 'Philippines',
  });
  const keys = profile.legends.map((legend) => legend.key);

  assert.equal(keys.includes('bar'), true);
  assert.equal(keys.includes('nightlife'), true);
  assert.equal(keys.includes('surf'), false);
  assert.equal(keys.includes('hotel'), false);
});

test('a real surf place still receives the surf legend', () => {
  const profile = buildVenueProfile({
    name: 'Cloud 9 Boardwalk',
    description: 'Iconic surf-side walkway in Siargao.',
    categories: ['surf', 'boardwalk', 'beach', 'wave-check'],
  });

  assert.equal(profile.legends.some((legend) => legend.key === 'surf'), true);
});
