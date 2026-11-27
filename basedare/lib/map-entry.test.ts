import test from "node:test";
import assert from "node:assert/strict";
import { approximateMapArea, buildMapDareCreateHref, mapCoordinates, mapEntry, mapViewportArea, readMapDarePrefill, resolveDareCreateCoordinates } from "./map-entry";
import {
  DEFAULT_DISCOVERY,
  discoveryHref,
  readDiscovery,
} from "./discovery-context";

const london = { lat: 51.5074, lng: -0.1278, label: "London, GB" };
const sydney = { lat: -33.8688, lng: 151.2093, label: "Sydney, AU" };

test('a dropped pin opens the existing paid dare form with the exact chosen coordinates, not device GPS', () => {
  const target = { latitude: 9.808516731, longitude: 126.156793241, name: 'Dropped pin', placeSource: 'MAP_DROP' };
  const href = buildMapDareCreateHref(target);
  assert.ok(href);
  const url = new URL(href, 'https://basedare.test');
  assert.equal(url.pathname, '/create');
  assert.equal(url.searchParams.get('sparkType'), 'paid');
  assert.equal(url.searchParams.has('venueId'), false);
  // A discovery-area or current GPS mismatch must never replace the selected target.
  url.searchParams.set('lat', String(london.lat));
  url.searchParams.set('lng', String(london.lng));
  const pin = readMapDarePrefill(url.searchParams);
  assert.deepEqual(pin, { state: 'selected', lat: target.latitude, lng: target.longitude, label: 'Dropped pin', venueId: null });
  assert.deepEqual(resolveDareCreateCoordinates(pin, sydney), { lat: target.latitude, lng: target.longitude });
  assert.deepEqual(resolveDareCreateCoordinates(pin, null), { lat: target.latitude, lng: target.longitude });
});

test('named canonical venues retain their id; unresolved places stay coordinate-only; private spots never receive a public-post link', () => {
  const target = { latitude: 9.77, longitude: 126.15, name: 'Café & surf' };
  const url = new URL(buildMapDareCreateHref({ ...target, resolvedVenueId: 'venue-123' })!, 'https://basedare.test');
  assert.deepEqual(readMapDarePrefill(url.searchParams), { state: 'selected', lat: 9.77, lng: 126.15, label: 'Café & surf', venueId: 'venue-123' });
  const unresolved = new URL(buildMapDareCreateHref({ ...target, resolvedVenueId: 'curated:example' })!, 'https://basedare.test');
  assert.equal(unresolved.searchParams.has('venueId'), false);
  assert.equal(buildMapDareCreateHref({ ...target, placeSource: 'PRIVATE_SAVE_SPOT' }), null);
  assert.equal(buildMapDareCreateHref({ ...target, placeSource: 'PRIVATE_SAVED_SPOT' }), null);
  assert.equal(buildMapDareCreateHref({ ...target, latitude: Infinity }), null);
});

test('malformed explicit pin handoffs fail closed instead of using a cached GPS location; ordinary create links retain GPS behavior', () => {
  for (const query of [
    'mode=map-pin&source=map&pinLat=9.8',
    'mode=map-pin&source=map&pinLat=&pinLng=126.1',
    'mode=map-pin&source=map&pinLat=90&pinLng=126.1',
    'mode=map-pin&source=map&pinLat=9.8&pinLng=181',
    'mode=map-pin&source=map&pinLat=9.8&pinLng=126.1&venueId=curated%3Aexample',
    'mode=map-pin&source=other&pinLat=9.8&pinLng=126.1',
  ]) {
    const pin = readMapDarePrefill(new URLSearchParams(query));
    assert.deepEqual(pin, { state: 'invalid' });
    assert.equal(resolveDareCreateCoordinates(pin, sydney), null);
  }
  const ordinary = readMapDarePrefill(new URLSearchParams('lat=9.8&lng=126.1&source=markets'));
  assert.deepEqual(ordinary, { state: 'none' });
  assert.deepEqual(resolveDareCreateCoordinates(ordinary, sydney), sydney);
});
test("explicit map destinations and zoom beat saved and approximate cities", () => {
  const entry = mapEntry(
    new URLSearchParams("lat=51.5074&lng=-0.1278&areaLabel=London&zoom=11"),
    new URLSearchParams("lat=-33.8688&lng=151.2093"),
    sydney
  );
  assert.deepEqual(entry, {
    ...london,
    label: "London",
    source: "link",
    zoom: 11,
  });
  assert.equal(
    mapEntry(new URLSearchParams("lat=9.7905&lng=126.158"), null, london)
      .source,
    "link"
  );
});
test("a real saved destination wins, but an automatically saved Siargao default does not override the visitor city", () => {
  const automatic = new URLSearchParams(
    `lat=${DEFAULT_DISCOVERY.lat}&lng=${DEFAULT_DISCOVERY.lng}&selected=0`
  );
  assert.equal(
    mapEntry(new URLSearchParams(), automatic, london).label,
    london.label
  );
  automatic.set("selected", "1");
  assert.equal(
    mapEntry(new URLSearchParams(), automatic, london).source,
    "saved"
  );
  assert.equal(
    mapEntry(
      new URLSearchParams(),
      new URLSearchParams("lat=-33.8688&lng=151.2093&areaLabel=Sydney"),
      london
    ).label,
    "Sydney"
  );
});
test("map inputs reject missing, blank and unrenderable coordinates while accepting equator and western cities", () => {
  for (const [lat, lng] of [
    [null, null],
    ["", ""],
    ["NaN", "0"],
    ["90", "0"],
    ["0", "181"],
  ])
    assert.equal(mapCoordinates(lat, lng), null);
  assert.deepEqual(mapCoordinates("0", "0"), { lat: 0, lng: 0 });
  assert.equal(
    mapEntry(new URLSearchParams("lat=&lng="), null, london).source,
    "approximate"
  );
  assert.equal(mapEntry(new URLSearchParams(), null, null).source, "demo");
});
test("IP hints require a city, are rounded, and never include a physical-presence claim", () => {
  const values = new Map([
    ["x-vercel-ip-latitude", "-33.86881"],
    ["x-vercel-ip-longitude", "151.20931"],
    ["x-vercel-ip-city", "S%C3%A3o%20Paulo"],
    ["x-vercel-ip-country", "BR"],
  ]);
  const area = approximateMapArea({ get: (key) => values.get(key) ?? null });
  assert.deepEqual(area, { lat: -33.87, lng: 151.21, label: "São Paulo, BR" });
  values.delete("x-vercel-ip-city");
  assert.equal(
    approximateMapArea({ get: (key) => values.get(key) ?? null }),
    null
  );
});
test("default navigation leaves location undecided; chosen city labels round-trip without relabelling explicit destinations", () => {
  const automatic = new URL(
    discoveryHref("/map", DEFAULT_DISCOVERY, false),
    "https://basedare.test"
  );
  assert.equal(automatic.searchParams.has("lat"), false);
  const url = new URL(
    discoveryHref("/board", { ...DEFAULT_DISCOVERY, ...sydney }),
    "https://basedare.test"
  );
  assert.equal(readDiscovery(url.searchParams).label, "Sydney, AU");
  const explicit = new URL(
    discoveryHref("/map?lat=51.5074&lng=-0.1278", {
      ...DEFAULT_DISCOVERY,
      ...sydney,
    }),
    "https://basedare.test"
  );
  assert.equal(explicit.searchParams.has("areaLabel"), false);
  assert.equal(
    readDiscovery(new URLSearchParams("lat=&lng="), {
      ...DEFAULT_DISCOVERY,
      ...sydney,
    }).label,
    sydney.label
  );
});

test('explicit and restored map areas preserve their own timezone for adventure handoffs', () => {
  const query = new URLSearchParams('lat=-33.8688&lng=151.2093&areaLabel=Sydney&timeZone=Australia%2FSydney');
  assert.equal(mapEntry(query, null, null).timeZone, 'Australia/Sydney');
  query.set('selected', '1');
  assert.equal(mapEntry(new URLSearchParams(), query, null).timeZone, 'Australia/Sydney');
  const invalid = new URLSearchParams(query); invalid.set('timeZone', 'invented/zone');
  assert.equal(mapEntry(invalid, null, null).timeZone, undefined);
});

test('small camera changes keep the browsing timezone, while distant pans discard the old city context', () => {
  const browse = { ...sydney, timeZone: 'Australia/Sydney' };
  assert.equal(mapViewportArea(-33.86879, 151.20931, browse).timeZone, 'Australia/Sydney');
  assert.equal(mapViewportArea(-33.86879, 151.20931, browse).label, 'Sydney, AU');
  assert.deepEqual(mapViewportArea(51.5074, -0.1278, browse), { lat: 51.507, lng: -0.128, label: 'Selected map area', timeZone: undefined });
});
