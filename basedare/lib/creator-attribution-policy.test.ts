import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isPerformanceEligibleAttributionEvent,
  isUnexpired,
  normalizeAttributionCode,
  normalizeEmail,
  normalizeTargetHref,
  normalizeTargetType,
  verifiedCompletionEventType,
} from './creator-attribution-policy.ts';

test('creator and content codes normalize predictably', () => {
  assert.equal(normalizeAttributionCode('@Maya_Surf', 'creator'), 'maya_surf');
  assert.throws(() => normalizeAttributionCode('../maya', 'creator'));
  assert.throws(() => normalizeAttributionCode('two words', 'creator'));
});

test('tracked links are local public BaseDare paths only', () => {
  assert.equal(normalizeTargetHref('/dare/abc?from=map#proof'), '/dare/abc?from=map#proof');
  assert.throws(() => normalizeTargetHref('https://evil.example/dare/abc'));
  assert.throws(() => normalizeTargetHref('//evil.example/dare/abc'));
  assert.throws(() => normalizeTargetHref('/api/admin/debug'));
});

test('target types fail closed', () => {
  assert.equal(normalizeTargetType('dare'), 'DARE');
  assert.equal(normalizeTargetType('meetup'), 'MEETUP');
  assert.throws(() => normalizeTargetType('PAYOUT'));
});

test('email normalization is narrow and deterministic', () => {
  assert.equal(normalizeEmail('  MAYA@Example.COM '), 'maya@example.com');
  assert.throws(() => normalizeEmail('maya at example dot com'));
});

test('expiry boundary is strict', () => {
  const now = new Date('2026-07-14T00:00:00.000Z');
  assert.equal(isUnexpired(new Date('2026-07-14T00:00:00.001Z'), now), true);
  assert.equal(isUnexpired(now, now), false);
  assert.equal(isUnexpired(new Date('invalid'), now), false);
});

test('only a locked creator path is performance-eligible', () => {
  assert.equal(verifiedCompletionEventType(true), 'PATH_VERIFIED_COMPLETION');
  assert.equal(verifiedCompletionEventType(false), 'DIRECT_VERIFIED_COMPLETION');
  assert.equal(isPerformanceEligibleAttributionEvent('PATH_VERIFIED_COMPLETION'), true);
  assert.equal(isPerformanceEligibleAttributionEvent('CREATOR_MISSION_PARTICIPATION'), false);
  assert.equal(isPerformanceEligibleAttributionEvent('TOUCH_RECORDED'), false);
});
