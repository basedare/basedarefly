export const DARE_IMAGE_UPLOAD_WINDOW_MS = 5 * 60 * 1000;

type DareImageUploadMessageParams = {
  walletAddress: string;
  issuedAt: string;
};

export function buildDareImageUploadMessage({
  walletAddress,
  issuedAt,
}: DareImageUploadMessageParams): string {
  return [
    'BaseDare Dare Image Upload',
    '',
    'Authorize uploading a custom cover image for a dare you are creating.',
    '',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function isDareImageUploadFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  return Math.abs(now - parsed) <= DARE_IMAGE_UPLOAD_WINDOW_MS;
}
