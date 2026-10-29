import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adventureArea } from './adventure-discovery';
import { adventureHref } from './adventure-progress';
import { SIARGAO_ACTIVITY_AREA, matchingAdventureSuggestions } from './home-activities';
import { isActivityTrayRoute, suppressInstallPrompt } from './mobile-surface-policy';

const sydney = { lat: -33.8688, lng: 151.2093, label: 'Sydney', timeZone: 'Australia/Sydney' };

test('direct Adventures entry restores the chosen city instead of reverting to Siargao', () => {
  assert.deepEqual(adventureArea(new URLSearchParams(), sydney), sydney);
  for (const input of ['lat=&lng=', 'lat=999&lng=2', 'lat=0&lng=bad', 'areaLabel=Wrong']) {
    assert.deepEqual(adventureArea(new URLSearchParams(input), sydney), sydney);
  }
});

test('adventure, resume and Passport links retain the selected city and timezone', () => {
  for (const id of [undefined, 'postcard', 'passport']) {
    const url = new URL(adventureHref(id, undefined, sydney), 'https://basedare.test');
    assert.deepEqual(adventureArea(url.searchParams, SIARGAO_ACTIVITY_AREA), sydney);
  }
});

test('an explicit invitation destination wins over the browsing city without inheriting its timezone', () => {
  const query = new URLSearchParams('lat=40.71&lng=-74&areaLabel=New+York');
  const linked = adventureArea(query, sydney);
  assert.equal(linked.label, 'New York');
  assert.equal(linked.timeZone, undefined);
  assert.equal(linked.lng, -74);
  query.set('timeZone', 'America/New_York');
  assert.equal(adventureArea(query, sydney).timeZone, 'America/New_York');
  query.set('timeZone', 'invented/zone');
  assert.equal(adventureArea(query, sydney).timeZone, undefined);
});

test('labels cannot override the destination without coordinates and same-city links retain the known label', () => {
  assert.equal(adventureArea(new URLSearchParams('areaLabel=Elsewhere'), sydney).label, 'Sydney');
  assert.equal(adventureArea(new URLSearchParams('lat=-33.8688&lng=151.2093'), sydney).label, 'Sydney');
  const area = adventureArea(new URLSearchParams('lat=0&lng=0&areaLabel=\u0000' + 'x'.repeat(200)), sydney);
  assert.equal(area.lat, 0);
  assert.equal(area.label.length, 100);
  assert.ok(!area.label.includes('\u0000'));
});

test('quieter discovery still filters by destination daylight before optional preferences', () => {
  const query = new URL(adventureHref(undefined, undefined, sydney), 'https://basedare.test').searchParams;
  const area = adventureArea(query, SIARGAO_ACTIVITY_AREA);
  const night = new Date('2026-10-18T13:00:00Z'); // Midnight in Sydney.
  const day = new Date('2026-10-18T01:00:00Z');
  const preferences = { minutes: 30 as const, mood: 'explore' as const };
  assert.ok(!matchingAdventureSuggestions(area, night, preferences).some((item) => item.daylight));
  assert.ok(matchingAdventureSuggestions(area, day, preferences).some((item) => item.daylight));
});

test('every route that may render a participation tray suppresses optional installation', () => {
  for (const path of ['/map', '/board', '/now', '/community', '/dashboard', '/earn', '/earn/mission']) {
    assert.ok(isActivityTrayRoute(path), path);
    assert.ok(suppressInstallPrompt(path), path);
  }
});

test('focused adventure and creation flows stay clear while installation remains available elsewhere', () => {
  for (const path of ['/moments', '/moments/example', '/adventures', '/adventures/postcard', '/adventures/passport', '/create', '/start', '/claim-tag', '/community/rally/new']) {
    assert.ok(suppressInstallPrompt(path), path);
  }
  for (const path of ['/', '/faq', '/about']) assert.equal(suppressInstallPrompt(path), false, path);
});
