import assert from 'node:assert/strict';
import { test } from 'node:test';

import {
  assertAuthoritativeAttemptCandidate,
  preferredApprovedAttemptId,
  type ApprovedAttemptCandidate,
} from './approved-attempt.ts';

function candidate(overrides: Partial<ApprovedAttemptCandidate> = {}): ApprovedAttemptCandidate {
  return {
    id: 'attempt-1',
    dareId: 'dare-1',
    submissionKey: 'dare-1:cid-1',
    structuredAnswersJson: { version: 1 },
    structuredAnswersHash: 'answers-hash',
    proofPolicySnapshotJson: { version: 1 },
    proofPolicySnapshotHash: 'policy-hash',
    ...overrides,
  };
}

test('an existing accepted pointer wins over a later requested attempt', () => {
  assert.equal(
    preferredApprovedAttemptId({ currentAttemptId: 'accepted', requestedAttemptId: 'later' }),
    'accepted',
  );
});

test('direct, admin, appeal, and retry finalization accept only the pinned media attempt', () => {
  for (const source of ['direct', 'admin', 'appeal', 'retry']) {
    assert.equal(
      assertAuthoritativeAttemptCandidate({
        candidate: candidate({ id: `${source}-attempt` }),
        dareId: 'dare-1',
        expectedSubmissionKey: 'dare-1:cid-1',
        structured: true,
      }),
      `${source}-attempt`,
    );
  }
});

test('structured finalization rejects cross-dare, stale-media, and partial snapshots', () => {
  assert.throws(() =>
    assertAuthoritativeAttemptCandidate({
      candidate: candidate({ dareId: 'dare-2' }),
      dareId: 'dare-1',
      expectedSubmissionKey: 'dare-1:cid-1',
      structured: true,
    }),
  );
  assert.throws(() =>
    assertAuthoritativeAttemptCandidate({
      candidate: candidate({ submissionKey: 'dare-1:old-cid' }),
      dareId: 'dare-1',
      expectedSubmissionKey: 'dare-1:cid-1',
      structured: true,
    }),
  );
  assert.throws(() =>
    assertAuthoritativeAttemptCandidate({
      candidate: candidate({ proofPolicySnapshotHash: null }),
      dareId: 'dare-1',
      expectedSubmissionKey: 'dare-1:cid-1',
      structured: true,
    }),
  );
});

test('legacy unstructured attempts may remain keyless', () => {
  assert.equal(
    assertAuthoritativeAttemptCandidate({
      candidate: candidate({ submissionKey: null, structuredAnswersJson: null, structuredAnswersHash: null }),
      dareId: 'dare-1',
      expectedSubmissionKey: null,
      structured: false,
    }),
    'attempt-1',
  );
});
