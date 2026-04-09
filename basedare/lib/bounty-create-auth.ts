export const BOUNTY_CREATE_WINDOW_MS = 5 * 60 * 1000;

type BountyCreateMessageParams = {
  walletAddress: string;
  issuedAt: string;
};

export function buildBountyCreateMessage({
  walletAddress,
  issuedAt,
}: BountyCreateMessageParams): string {
  return [
    'BaseDare Bounty Creation',
    '',
    'Authorize creating and funding a dare from your connected wallet.',
    '',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function isBountyCreateFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= BOUNTY_CREATE_WINDOW_MS;
}
