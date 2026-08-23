import assert from 'node:assert/strict';
import test from 'node:test';

import {
  ACTION_SPORTS_COMMUNITY_SPARKS,
  ACTION_SPORTS_COMMUNITY_SPARK_VERSION,
  COMMUNITY_SPARK_DISCLAIMER,
  getActionSportsCommunitySpark,
  getActionSportsCommunitySparkByStreamId,
  getActionSportsCommunitySparkStreamId,
  isActionSportsCommunitySparkKey,
} from './action-sports-community-sparks.ts';

test('Community Sparks are short, bounded challenges rather than manuals', () => {
  assert.match(COMMUNITY_SPARK_DISCLAIMER, /no cash reward/i);
  assert.match(COMMUNITY_SPARK_DISCLAIMER, /not an official competition/i);

  const titles = new Set<string>();
  for (const spark of ACTION_SPORTS_COMMUNITY_SPARKS) {
    assert.ok(spark.title.length <= 36);
    assert.ok(spark.instructions.length <= 85);
    assert.ok(spark.hook.length <= 90);
    assert.ok(spark.capturePrompt.length <= 60);
    assert.ok(spark.socialPrompt.length <= 60);
    assert.ok(spark.safety.length >= 40);
    assert.ok(spark.estimatedMinutes >= 5);
    assert.ok(spark.estimatedMinutes <= 30);
    assert.ok(spark.crew.length >= 10);
    assert.ok(spark.discoveryRadiusKm > 0);
    assert.ok(spark.discoveryRadiusKm <= 0.5);
    titles.add(spark.title);
  }
  assert.equal(titles.size, ACTION_SPORTS_COMMUNITY_SPARKS.length);
});

test('Wakepark has a dedicated self-directed action-sports Spark', () => {
  assert.equal(isActionSportsCommunitySparkKey('WAKEPARK_PROGRESSION_LAP'), true);
  assert.equal(isActionSportsCommunitySparkKey('WAKEPARK_CASH_PRIZE'), false);
  const wakepark = getActionSportsCommunitySpark('WAKEPARK_PROGRESSION_LAP');
  assert.equal(wakepark.venueSlug, 'siargao-wakepark');
  assert.match(`${wakepark.instructions} ${wakepark.safety}`, /operator/i);
});

test('fitness Sparks sound like invitations, not training-program labels', () => {
  assert.equal(
    getActionSportsCommunitySpark('SURFIT_MOBILITY_RESET').title,
    'Make a three-move combo',
  );
  assert.equal(
    getActionSportsCommunitySpark('PRIMEFIT_MOBILITY_RESET').title,
    'You pick two. They pick one.',
  );
});

test('current Spark stream IDs resolve to their play-first brief', () => {
  const streamId = getActionSportsCommunitySparkStreamId('SURF_PREP_SIGNAL_KANAWAY');
  assert.equal(streamId, `community-spark:surf_prep_signal_kanaway:v${ACTION_SPORTS_COMMUNITY_SPARK_VERSION}`);

  const resolved = getActionSportsCommunitySparkByStreamId(streamId);
  assert.equal(resolved?.title, 'Board, boat or beach?');
  assert.equal(resolved?.isCurrentVersion, true);
  assert.match(resolved?.instructions ?? '', /confirm/i);
  assert.match(`${resolved?.instructions} ${resolved?.safety}`, /boat|rental/i);
});

test('legacy Spark stream IDs remain distinguishable from the current brief version', () => {
  const resolved = getActionSportsCommunitySparkByStreamId(
    'community-spark:wakepark_progression_lap:v1',
  );
  assert.equal(resolved?.version, 1);
  assert.equal(resolved?.isCurrentVersion, false);
});
