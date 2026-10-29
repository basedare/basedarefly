import test from "node:test";
import assert from "node:assert/strict";
import { approximateMapArea, mapCoordinates, mapEntry, mapViewportArea } from "./map-entry";
import {
  DEFAULT_DISCOVERY,
  discoveryHref,
  readDiscovery,
} from "./discovery-context";

const london = { lat: 51.5074, lng: -0.1278, label: "London, GB" };
const sydney = { lat: -33.8688, lng: 151.2093, label: "Sydney, AU" };
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
