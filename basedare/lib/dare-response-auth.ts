export const DARE_RESPONSE_WINDOW_MS = 5 * 60 * 1000;

type DareResponseMessageParams = {
  walletAddress: string;
  dareId: string;
  issuedAt: string;
};

export function buildDareResponseMessage({
  walletAddress,
  dareId,
  issuedAt,
}: DareResponseMessageParams): string {
  return [
    'BaseDare Dare Response',
    '',
    'Authorize accepting or declining this dare from your connected wallet.',
    '',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Dare ID: ${dareId}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function isDareResponseFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= DARE_RESPONSE_WINDOW_MS;
}
