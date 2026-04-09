export const PROOF_SUBMIT_WINDOW_MS = 5 * 60 * 1000;

type ProofSubmitMessageParams = {
  walletAddress: string;
  dareId: string;
  issuedAt: string;
};

export function buildProofSubmitMessage({
  walletAddress,
  dareId,
  issuedAt,
}: ProofSubmitMessageParams): string {
  return [
    'BaseDare Proof Submission',
    '',
    'Authorize uploading and submitting proof for this dare from your connected wallet.',
    '',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Dare ID: ${dareId}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function isProofSubmitFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= PROOF_SUBMIT_WINDOW_MS;
}
