export const DARE_STATUS_PENDING_ACCEPTANCE = 'PENDING_ACCEPTANCE';
export const DARE_STATUS_DECLINED = 'DECLINED';

export function getPostFundingDareStatus({
  isAwaitingClaim,
  targetWalletAddress,
}: {
  isAwaitingClaim: boolean;
  targetWalletAddress?: string | null;
}): string {
  if (isAwaitingClaim) {
    return 'AWAITING_CLAIM';
  }

  if (targetWalletAddress) {
    return DARE_STATUS_PENDING_ACCEPTANCE;
  }

  return 'PENDING';
}
