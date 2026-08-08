import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatCommunitySparkPlayRadius,
  isCommunitySparkRecord,
  resolveCommunitySparkPlayAccess,
  shouldShowDareInMapViewport,
} from './community-spark-map-policy.ts';

test('Community Sparks remain visible across the viewport outside their Play radius', () => {
  assert.equal(
    shouldShowDareInMapViewport({
      isCommunitySpark: true,
      distanceFromViewportCenterKm: 8,
      viewportRadiusKm: 20,
      discoveryRadiusKm: 0.4,
    }),
    true,
  );
});

test('Community Sparks outside the viewport remain hidden', () => {
  assert.equal(
    shouldShowDareInMapViewport({
      isCommunitySpark: true,
      distanceFromViewportCenterKm: 20.01,
      viewportRadiusKm: 20,
      discoveryRadiusKm: 0.4,
    }),
    false,
  );
});

test('paid nearby dares keep their existing discovery-radius behavior', () => {
  assert.equal(
    shouldShowDareInMapViewport({
      isCommunitySpark: false,
      distanceFromViewportCenterKm: 2,
      viewportRadiusKm: 20,
      discoveryRadiusKm: 0.4,
    }),
    false,
  );
  assert.equal(
    shouldShowDareInMapViewport({
      isCommunitySpark: false,
      distanceFromViewportCenterKm: 0.4,
      viewportRadiusKm: 20,
      discoveryRadiusKm: 0.4,
    }),
    true,
  );
});

test('Play unlocks inside and exactly on the configured boundary', () => {
  assert.deepEqual(
    resolveCommunitySparkPlayAccess({
      distanceFromPlayerKm: 0.2,
      playRadiusKm: 0.4,
    }),
    { isPlayableHere: true, playRadiusKm: 0.4, reason: 'READY' },
  );
  assert.equal(
    resolveCommunitySparkPlayAccess({
      distanceFromPlayerKm: 0.4,
      playRadiusKm: 0.4,
    }).isPlayableHere,
    true,
  );
});

test('Play stays locked outside the configured boundary', () => {
  assert.deepEqual(
    resolveCommunitySparkPlayAccess({
      distanceFromPlayerKm: 0.401,
      playRadiusKm: 0.4,
    }),
    { isPlayableHere: false, playRadiusKm: 0.4, reason: 'OUTSIDE_RADIUS' },
  );
});

test('Play asks for location without hiding the Spark', () => {
  assert.deepEqual(
    resolveCommunitySparkPlayAccess({
      distanceFromPlayerKm: null,
      playRadiusKm: 0.35,
    }),
    { isPlayableHere: null, playRadiusKm: 0.35, reason: 'LOCATION_REQUIRED' },
  );
});

test('invalid play configuration fails closed', () => {
  assert.deepEqual(
    resolveCommunitySparkPlayAccess({
      distanceFromPlayerKm: 0,
      playRadiusKm: 0,
    }),
    { isPlayableHere: false, playRadiusKm: null, reason: 'INVALID_PLAY_RADIUS' },
  );
  assert.equal(
    resolveCommunitySparkPlayAccess({
      distanceFromPlayerKm: Number.NaN,
      playRadiusKm: 0.4,
    }).reason,
    'INVALID_LOCATION',
  );
});

test('Community Spark identity and play-radius labels stay explicit', () => {
  assert.equal(isCommunitySparkRecord({ bounty: 0, missionTag: 'community' }), true);
  assert.equal(isCommunitySparkRecord({ bounty: 0, missionTag: 'fitness' }), false);
  assert.equal(formatCommunitySparkPlayRadius(0.25), '250m');
  assert.equal(formatCommunitySparkPlayRadius(1.25), '1.3km');
});
