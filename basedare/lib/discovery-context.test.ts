import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULT_DISCOVERY, readDiscovery, discoveryHref } from './discovery-context.ts';
import { getWorldPulseMapViewHref, getWorldPulseViewHref } from './world-pulse.ts';
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

test('creator entry and alert links retain a shareable browsing city without rewriting a chosen mission', () => {
  const sydney = { ...DEFAULT_DISCOVERY, lat: -33.8688, lng: 151.2093, label: 'Sydney', timeZone: 'Australia/Sydney' };
  for (const href of ['/earn?source=home-intro', '/earn?alerts=1#mission-alerts']) {
    const url = new URL(discoveryHref(href, sydney), 'https://basedare.test');
    const restored = readDiscovery(url.searchParams);
    assert.equal(restored.label, 'Sydney');
    assert.equal(restored.lat, sydney.lat);
    assert.equal(restored.lng, sydney.lng);
    assert.equal(restored.timeZone, sydney.timeZone);
    assert.equal(url.hash, href.includes('#') ? '#mission-alerts' : '');
    assert.equal(url.searchParams.get(href.includes('alerts') ? 'alerts' : 'source'), href.includes('alerts') ? '1' : 'home-intro');
  }
  assert.equal(discoveryHref('/earn/cafe-mission?source=invite#submit-work', sydney), '/earn/cafe-mission?source=invite#submit-work');
  assert.equal(discoveryHref('/earn?city=bali&alerts=1#mission-alerts', sydney), '/earn?city=bali&alerts=1#mission-alerts');
  assert.equal(new URL(discoveryHref('/earn', sydney, false), 'https://basedare.test').searchParams.has('lat'), false);
});

test('Now canonicalization and sharing retain the destination after privacy rounding and view changes', () => {
  const href = getWorldPulseViewHref({
    center: { latitude: -33.8688, longitude: 151.2093 },
    areaLabel: 'Sydney', timeZone: 'Australia/Sydney', mode: 'TONIGHT', radiusKm: 12,
    participation: 'meet', selectedPlanId: 'meetup:photo-walk', needsPeople: true,
  });
  const query = new URL(href, 'https://basedare.test').searchParams;
  assert.equal(query.get('lat'), '-33.869');
  assert.equal(query.get('lng'), '151.209');
  assert.equal(query.get('plan'), 'meetup:photo-walk');
  assert.equal(query.get('needs'), '1');
  const restored = readDiscovery(query);
  for (const target of [href, discoveryHref('/board', restored), getWorldPulseMapViewHref({ latitude: restored.lat, longitude: restored.lng }, restored.mode, { areaLabel: restored.label, timeZone: restored.timeZone })]) {
    const area = readDiscovery(new URL(target, 'https://basedare.test').searchParams);
    assert.equal(area.label, 'Sydney');
    assert.equal(area.timeZone, 'Australia/Sydney');
    assert.equal(area.mode, 'TONIGHT');
  }
  const invalidZone = new URL(getWorldPulseViewHref({ center: { latitude: 40.71, longitude: -74 }, mode: 'NOW', radiusKm: 12, timeZone: 'invalid/zone' }), 'https://basedare.test');
  assert.equal(invalidZone.searchParams.has('timeZone'), false);
});
