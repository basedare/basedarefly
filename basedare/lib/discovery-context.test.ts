import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DISCOVERY, readDiscovery, discoveryHref } from './discovery-context.ts';
test('discovery preserves explicit destinations and never carries context to external or financial URLs', () => {
  const area = { ...DEFAULT_DISCOVERY, lat: -33.9, lng: 151.2 };
  assert.match(discoveryHref('/community', area), /lat=-33.9/);
  assert.match(discoveryHref('/map?lat=1&lng=2#place', area), /lat=1&lng=2/);
  assert.equal(discoveryHref('/create?venue=abc', area), '/create?venue=abc');
  assert.equal(discoveryHref('https://example.com', area), 'https://example.com');
});
test('invalid coordinates and radius do not override a valid area; filter and time survive navigation', () => {
  const area = readDiscovery(new URLSearchParams('lat=-33.9&lng=151.2&radiusKm=12&participation=meet&mode=tonight'));
  assert.equal(area.mode, 'TONIGHT');
  assert.equal(area.participation, 'meet');
  assert.equal(readDiscovery(new URLSearchParams('lat=999&lng=no&radiusKm=-1'),area).lat, -33.9);
});

test('homepage discovery time does not overwrite its community/business mode', () => {
  const href = discoveryHref('/?mode=control', { ...DEFAULT_DISCOVERY, mode: 'TONIGHT' });
  const params = new URL(href, 'https://basedare.invalid').searchParams;
  assert.equal(params.get('mode'), 'control');
  assert.equal(params.get('when'), 'tonight');
  assert.equal(readDiscovery(params).mode, 'TONIGHT');
});
