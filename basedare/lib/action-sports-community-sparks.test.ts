import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTION_SPORTS_COMMUNITY_SPARKS,
  COMMUNITY_SPARK_DISCLAIMER,
  getActionSportsCommunitySpark,
  isActionSportsCommunitySparkKey,
} from './action-sports-community-sparks.ts';

test('Community Sparks are bounded, safety-led free play rather than payout promises', () => {
  assert.match(COMMUNITY_SPARK_DISCLAIMER, /no cash payout/i);
  assert.match(COMMUNITY_SPARK_DISCLAIMER, /not an official competition/i);

  for (const spark of ACTION_SPORTS_COMMUNITY_SPARKS) {
    assert.ok(spark.instructions.length >= 40);
    assert.ok(spark.safety.length >= 40);
    assert.ok(spark.discoveryRadiusKm > 0);
    assert.ok(spark.discoveryRadiusKm <= 0.5);
  }
});

test('Wakepark has a dedicated self-directed action-sports Spark', () => {
  assert.equal(isActionSportsCommunitySparkKey('WAKEPARK_PROGRESSION_LAP'), true);
  assert.equal(isActionSportsCommunitySparkKey('WAKEPARK_CASH_PRIZE'), false);
  const wakepark = getActionSportsCommunitySpark('WAKEPARK_PROGRESSION_LAP');
  assert.equal(wakepark.venueSlug, 'siargao-wakepark');
  assert.match(`${wakepark.instructions} ${wakepark.safety}`, /operator/i);
});
