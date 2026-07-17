export type ApprovedAttemptCandidate = {
  id: string;
  dareId: string;
  submissionKey: string | null;
  structuredAnswersJson: unknown | null;
  structuredAnswersHash: string | null;
  proofPolicySnapshotJson: unknown | null;
  proofPolicySnapshotHash: string | null;
};

export function preferredApprovedAttemptId(input: {
  currentAttemptId: string | null;
  requestedAttemptId: string | null;
}): string | null {
  return input.currentAttemptId ?? input.requestedAttemptId;
}

export function assertAuthoritativeAttemptCandidate(input: {
  candidate: ApprovedAttemptCandidate;
  dareId: string;
  expectedSubmissionKey: string | null;
  structured: boolean;
}): string {
  const { candidate } = input;
  if (candidate.dareId !== input.dareId) {
    throw new Error('Approved proof attempt does not belong to this Dare.');
  }
  if (input.expectedSubmissionKey && candidate.submissionKey !== input.expectedSubmissionKey) {
    throw new Error('Approved proof attempt does not match the server-pinned proof media.');
  }
  if (
    input.structured &&
    (!input.expectedSubmissionKey ||
      !candidate.structuredAnswersJson ||
      !candidate.structuredAnswersHash ||
      !candidate.proofPolicySnapshotJson ||
      !candidate.proofPolicySnapshotHash)
  ) {
    throw new Error('Approved proof attempt has no complete structured Place Memory snapshot.');
  }
  return candidate.id;
}
