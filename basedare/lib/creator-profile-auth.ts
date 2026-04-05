export const CREATOR_PROFILE_EDIT_WINDOW_MS = 5 * 60 * 1000;

type CreatorProfileEditMessageParams = {
  walletAddress: string;
  tagId: string;
  issuedAt: string;
};

export function buildCreatorProfileEditMessage({
  walletAddress,
  tagId,
  issuedAt,
}: CreatorProfileEditMessageParams): string {
  return [
    'BaseDare Creator Profile Edit',
    '',
    'Authorize a profile update for your verified creator tag.',
    '',
    `Wallet: ${walletAddress.toLowerCase()}`,
    `Tag ID: ${tagId}`,
    `Issued At: ${issuedAt}`,
  ].join('\n');
}

export function isCreatorProfileEditFresh(issuedAt: string, now = Date.now()): boolean {
  const parsed = Date.parse(issuedAt);
  if (!Number.isFinite(parsed)) return false;

  const delta = Math.abs(now - parsed);
  return delta <= CREATOR_PROFILE_EDIT_WINDOW_MS;
}
