import assert from 'node:assert/strict';
import test from 'node:test';

import { getDareLifecycleModel } from './dare-lifecycle.ts';

test('free Community Sparks use the short open, play, receipt journey', () => {
  const lifecycle = getDareLifecycleModel({
    status: 'PENDING',
    isCommunitySpark: true,
    awaitingClaim: true,
  });

  assert.equal(lifecycle.currentStatusLabel, 'Open to play');
  assert.deepEqual(lifecycle.steps.map((step) => step.label), ['Open', 'Play', 'Receipt']);
  assert.doesNotMatch(
    lifecycle.steps.map((step) => `${step.label} ${step.description}`).join(' '),
    /funding|escrow|payout/i,
  );
});

test('a joined Spark moves into play without changing its backend status', () => {
  const lifecycle = getDareLifecycleModel({
    status: 'PENDING',
    isCommunitySpark: true,
    claimedBy: '0x123',
  });

  assert.equal(lifecycle.status, 'PENDING');
  assert.equal(lifecycle.currentStep, 'sparkPlaying');
  assert.equal(lifecycle.currentStatusLabel, 'Playing');
  assert.match(lifecycle.nextActionCopy, /capture the fun part/i);
});

test('Spark review and settlement states are presented as receipt closure', () => {
  const review = getDareLifecycleModel({
    status: 'PENDING_REVIEW',
    isCommunitySpark: true,
    videoUrl: 'https://example.com/moment.mp4',
  });
  const closing = getDareLifecycleModel({
    status: 'PENDING_PAYOUT',
    isCommunitySpark: true,
    videoUrl: 'https://example.com/moment.mp4',
  });
  const complete = getDareLifecycleModel({
    status: 'VERIFIED',
    isCommunitySpark: true,
    videoUrl: 'https://example.com/moment.mp4',
  });

  assert.equal(review.currentStatusLabel, 'Moment sent');
  assert.equal(closing.currentStatusLabel, 'Receipt closing');
  assert.equal(complete.currentStatusLabel, 'Played');
  assert.doesNotMatch(
    [review.nextActionCopy, closing.nextActionCopy, complete.nextActionCopy].join(' '),
    /escrow|payout sent|earn/i,
  );
});

test('paid open dares retain the full funding and payout lifecycle', () => {
  const lifecycle = getDareLifecycleModel({ status: 'PENDING', awaitingClaim: true });
  assert.deepEqual(
    lifecycle.steps.map((step) => step.key),
    ['funding', 'liveOpen', 'claimed', 'proofSubmitted', 'payoutQueued', 'completed'],
  );
  assert.match(lifecycle.steps.map((step) => step.label).join(' '), /Payout queued/);
});
