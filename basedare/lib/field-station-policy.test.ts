import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  appendFieldStationContextToHref,
  aggregateFieldStationReceiptCounts,
  computeFieldStationTimeToAction,
  fieldStationAttentionToMapIntent,
  formatFieldStationSerial,
  normalizeDensityRadiusKm,
  normalizeFieldStationAttention,
  normalizeFieldStationFallback,
  normalizeMinimumDensity,
  mapIntentToFieldStationAttention,
  resolveFieldStationAttention,
} from './field-station-policy.ts';

test('specific station promises fall back below the density gate', () => {
  assert.deepEqual(
    resolveFieldStationAttention({
      requested: 'TONIGHT',
      fallback: 'NEARBY',
      densityCount: 2,
      minimumDensity: 3,
    }),
    {
      requestedAttention: 'TONIGHT',
      resolvedAttention: 'NEARBY',
      densityCount: 2,
      minimumDensity: 3,
      fallbackApplied: true,
      fallbackReason: 'BELOW_MINIMUM_DENSITY',
    }
  );
});

test('density boundary is inclusive and neutral entries never need inventory', () => {
  assert.equal(
    resolveFieldStationAttention({
      requested: 'MYSTERY',
      fallback: 'NEARBY',
      densityCount: 3,
      minimumDensity: 3,
    }).fallbackApplied,
    false
  );
  assert.equal(
    resolveFieldStationAttention({
      requested: 'ASK',
      fallback: 'NEARBY',
      densityCount: 0,
      minimumDensity: 3,
      densityAvailable: false,
    }).fallbackApplied,
    false
  );
});

test('unavailable density fails to a neutral entry rather than an empty promise', () => {
  const result = resolveFieldStationAttention({
    requested: 'REWARD',
    fallback: 'NEARBY',
    densityCount: 0,
    minimumDensity: 1,
    densityAvailable: false,
  });
  assert.equal(result.resolvedAttention, 'NEARBY');
  assert.equal(result.fallbackReason, 'DENSITY_UNAVAILABLE');
});

test('station context preserves the local target while adding answer-first state', () => {
  const href = appendFieldStationContextToHref({
    targetHref: '/map?place=cat-and-gun',
    stationCode: 'catangnan-01',
    stationSerial: 'FS-00042',
    stationLabel: 'Cat & Gun',
    city: 'General Luna',
    latitude: 9.800001,
    longitude: 126.160002,
    requestedAttention: 'TONIGHT',
    resolvedAttention: 'NEARBY',
    fallbackApplied: true,
  });
  const url = new URL(href, 'https://basedare.local');
  assert.equal(url.pathname, '/map');
  assert.equal(url.searchParams.get('place'), 'cat-and-gun');
  assert.equal(url.searchParams.get('station'), 'catangnan-01');
  assert.equal(url.searchParams.get('attention'), 'nearby');
  assert.equal(url.searchParams.get('requestedAttention'), 'tonight');
});

test('station policy normalizes modes, map intent, thresholds and serials', () => {
  assert.equal(normalizeFieldStationAttention(' mystery '), 'MYSTERY');
  assert.equal(fieldStationAttentionToMapIntent('social'), 'meet');
  assert.equal(mapIntentToFieldStationAttention('meet'), 'SOCIAL');
  assert.equal(fieldStationAttentionToMapIntent('nearby'), null);
  assert.equal(normalizeMinimumDensity(undefined), 3);
  assert.equal(normalizeDensityRadiusKm(2.34), 2.3);
  assert.equal(formatFieldStationSerial(42), 'FS-00042');
  assert.throws(() => normalizeMinimumDensity(0));
  assert.throws(() => normalizeDensityRadiusKm(100));
  assert.equal(normalizeFieldStationFallback(undefined), 'NEARBY');
  assert.throws(() => normalizeFieldStationFallback('TONIGHT'));
});

test('host and destination receipts remain separate views of the same journey', () => {
  const receipts = aggregateFieldStationReceiptCounts([
    { eventType: 'STATION_SCAN', stationCode: 'cafe-01', contentCode: 'tonight-a', destinationVenueId: null },
    { eventType: 'STATION_TARGET_OPENED', stationCode: 'cafe-01', contentCode: 'tonight-a', destinationVenueId: 'venue-night' },
    { eventType: 'STATION_VERIFIED_ARRIVAL', stationCode: 'cafe-01', contentCode: 'tonight-a', destinationVenueId: 'venue-night' },
  ]);
  assert.equal(receipts.stationHosts['cafe-01'].STATION_SCAN, 1);
  assert.equal(receipts.stationHosts['cafe-01'].STATION_VERIFIED_ARRIVAL, 1);
  assert.equal(receipts.destinations['venue-night'].STATION_SCAN, undefined);
  assert.equal(receipts.destinations['venue-night'].STATION_VERIFIED_ARRIVAL, 1);
  assert.equal(receipts.creatives['tonight-a'].STATION_TARGET_OPENED, 1);
});

test('time to action measures verified outcomes from the originating station scan', () => {
  const start = new Date('2026-07-15T10:00:00.000Z');
  const events = [
    { eventType: 'STATION_SCAN', stationCode: 'host-01', journeyId: 'a', occurredAt: start },
    { eventType: 'STATION_VERIFIED_ARRIVAL', stationCode: 'host-01', journeyId: 'a', occurredAt: new Date(start.getTime() + 30 * 60_000) },
    { eventType: 'STATION_SCAN', stationCode: 'host-01', journeyId: 'b', occurredAt: start },
    { eventType: 'PATH_VERIFIED_COMPLETION', stationCode: 'host-01', journeyId: 'b', occurredAt: new Date(start.getTime() + 90 * 60_000) },
  ];
  assert.deepEqual(computeFieldStationTimeToAction(events), {
    'host-01': { verifiedActions: 2, medianMinutes: 60 },
  });
});
