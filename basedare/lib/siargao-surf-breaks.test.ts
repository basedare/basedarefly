import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import {
  SIARGAO_CANONICAL_SURF_BREAK_VENUE_SLUGS,
  SIARGAO_SURF_BREAK_POINTS,
} from './siargao-surf-breaks.ts';

test('surf echoes use explicit offshore break coordinates', () => {
  assert.deepEqual(
    SIARGAO_SURF_BREAK_POINTS.map((point) => point.id),
    ['cloud-9', 'tuason', 'bumee-bomi', 'rock-island', 'stimpys', 'cemetery']
  );

  SIARGAO_SURF_BREAK_POINTS.forEach((point) => {
    assert.ok(Number.isFinite(point.latitude));
    assert.ok(Number.isFinite(point.longitude));
    assert.ok(point.longitude > 126.15, `${point.label} should remain on Siargao's east-side reef`);
  });
});

test('only actual surf-break venues replace their standard place marker', () => {
  assert.equal(SIARGAO_CANONICAL_SURF_BREAK_VENUE_SLUGS.has('cloud-9-boardwalk'), false);
  assert.equal(SIARGAO_CANONICAL_SURF_BREAK_VENUE_SLUGS.has('tuason-point'), true);
  assert.equal(SIARGAO_CANONICAL_SURF_BREAK_VENUE_SLUGS.has('rock-island-surf-break'), true);
  assert.equal(SIARGAO_CANONICAL_SURF_BREAK_VENUE_SLUGS.has('kanaway-surf-school'), false);
});
