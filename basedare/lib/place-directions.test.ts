import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  buildGoogleMapsDirectionsUrl,
  resolvePlaceNavigationSummary,
} from './place-directions.ts';

test('builds an interoperable Google Maps directions URL from validated coordinates', () => {
  const href = buildGoogleMapsDirectionsUrl({
    latitude: 9.7810522,
    longitude: 126.1570569,
  });

  assert.ok(href);
  const url = new URL(href);
  assert.equal(url.origin, 'https://www.google.com');
  assert.equal(url.pathname, '/maps/dir/');
  assert.equal(url.searchParams.get('api'), '1');
  assert.equal(url.searchParams.get('destination'), '9.7810522,126.1570569');
});

test('adds a trusted Google Place ID without replacing the coordinate destination', () => {
  const href = buildGoogleMapsDirectionsUrl({
    latitude: 9.7810522,
    longitude: 126.1570569,
    googlePlaceId: 'ChIJ-example',
  });

  assert.ok(href);
  const url = new URL(href);
  assert.equal(url.searchParams.get('destination'), '9.7810522,126.1570569');
  assert.equal(url.searchParams.get('destination_place_id'), 'ChIJ-example');
});

test('rejects invalid coordinates instead of producing a misleading route', () => {
  assert.equal(buildGoogleMapsDirectionsUrl({ latitude: 91, longitude: 126 }), null);
  assert.equal(buildGoogleMapsDirectionsUrl({ latitude: Number.NaN, longitude: 126 }), null);
});

test('directions fail closed for private, sensitive, and deliberately approximate places', () => {
  assert.deepEqual(
    resolvePlaceNavigationSummary({
      latitude: 9.78,
      longitude: 126.15,
      placeSource: 'PRIVATE_SAVED_SPOT',
    }),
    { eligible: false, reason: 'PRIVATE_PLACE' }
  );
  assert.deepEqual(
    resolvePlaceNavigationSummary({
      latitude: 9.78,
      longitude: 126.15,
      metadataJson: { navigationSensitive: true },
    }),
    { eligible: false, reason: 'SENSITIVE_PLACE' }
  );
  assert.deepEqual(
    resolvePlaceNavigationSummary({
      latitude: 9.78,
      longitude: 126.15,
      locationConfidence: 'approximate-road-zone',
    }),
    { eligible: false, reason: 'APPROXIMATE_PLACE' }
  );
});
