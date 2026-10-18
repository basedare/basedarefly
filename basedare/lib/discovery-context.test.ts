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

test('Next 2h survives canonical shared URLs, legacy storage and map pulse links', () => {
  for (const query of ['mode=next2h', 'mode=NEXT_2H', 'when=next2h', 'pulse=next2h']) {
    assert.equal(readDiscovery(new URLSearchParams(query)).mode, 'NEXT_2H');
  }
  const url = new URL(discoveryHref('/board', { ...DEFAULT_DISCOVERY, mode: 'NEXT_2H', participation: 'meet', radiusKm: 12 }), 'https://basedare.test');
  assert.equal(url.searchParams.get('mode'), 'next2h');
  assert.equal(readDiscovery(url.searchParams).mode, 'NEXT_2H');
  assert.equal(readDiscovery(url.searchParams).participation, 'meet');
  assert.equal(readDiscovery(url.searchParams).radiusKm, 12);
  assert.equal(readDiscovery(new URLSearchParams('radiusKm=100')).radiusKm, 25);
});

test('known destination timezones survive navigation and session restoration, but never follow a different city', () => {
  const sydney = { ...DEFAULT_DISCOVERY, lat: -33.8688, lng: 151.2093, label: 'Sydney', timeZone: 'Australia/Sydney' };
  const url = new URL(discoveryHref('/adventures', sydney), 'https://basedare.test');
  assert.equal(readDiscovery(url.searchParams).timeZone, 'Australia/Sydney');
  assert.equal(readDiscovery(new URLSearchParams(), sydney).timeZone, 'Australia/Sydney');
  const other = new URL(discoveryHref('/map?lat=40.71&lng=-74&areaLabel=New+York', sydney), 'https://basedare.test');
  assert.equal(other.searchParams.has('timeZone'), false);
  assert.equal(readDiscovery(other.searchParams, sydney).timeZone, undefined);
  assert.equal(readDiscovery(new URLSearchParams('lat=40.71&lng=-74&timeZone=invalid/zone'), sydney).timeZone, undefined);
});
