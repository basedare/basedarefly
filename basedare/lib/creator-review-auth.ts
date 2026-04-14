export const CREATOR_REVIEW_WINDOW_MS = 5 * 60 * 1000;

type CreatorReviewMessageParams = {
  walletAddress: string;
  dareId: string;
  issuedAt: string;
};

export function buildCreatorReviewMessage({
  walletAddress,
  dareId,
  issuedAt,
}: CreatorReviewMessageParams): string {
  return [
    'BaseDare Creator Review',
    '',
    'Authorize submitting a completion review for this dare.',
    '',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Dare ID: ${dareId}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function isCreatorReviewFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= CREATOR_REVIEW_WINDOW_MS;
}
