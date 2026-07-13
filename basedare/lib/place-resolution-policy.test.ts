import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { selectNearbyPlaceMatch } from './place-resolution-policy.ts';

const origin = { latitude: 9.78134, longitude: 126.15625 };

test('prefers the canonical exact-slug place over a suffixed duplicate', () => {
  const canonical = {
    id: 'canonical',
    slug: 'hideaway',
    name: 'Hideaway',
    ...origin,
  };
  const duplicate = {
    id: 'duplicate',
    slug: 'hideaway-2',
    name: 'Hideaway',
    ...origin,
  };

  assert.equal(
    selectNearbyPlaceMatch({
      ...origin,
      requestedName: 'Hideaway',
      candidates: [duplicate, canonical],
      radiusMeters: 30,
    })?.id,
    'canonical'
  );
});

test('uses the closest place when no requested name is available', () => {
  const result = selectNearbyPlaceMatch({
    ...origin,
    candidates: [
      { id: 'far', slug: 'far', name: 'Far', latitude: 9.78155, longitude: 126.15625 },
      { id: 'near', slug: 'near', name: 'Near', latitude: 9.78136, longitude: 126.15625 },
    ],
    radiusMeters: 30,
  });

  assert.equal(result?.id, 'near');
});

test('does not merge distinct places outside the matching radius', () => {
  const result = selectNearbyPlaceMatch({
    ...origin,
    requestedName: 'Different place',
    candidates: [
      {
        id: 'outside',
        slug: 'different-place',
        name: 'Different place',
        latitude: 9.782,
        longitude: 126.15625,
      },
    ],
    radiusMeters: 30,
  });

  assert.equal(result, null);
});
