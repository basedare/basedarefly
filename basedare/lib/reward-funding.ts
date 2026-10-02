/** Recorded escrow evidence, not a fresh on-chain solvency check. */
export function hasRecordedRewardFunding(dare: {
  isSimulated: boolean;
  txHash?: string | null;
  onChainDareId?: string | null;
}): boolean {
  return (
    !dare.isSimulated &&
    /^0x[0-9a-f]{64}$/i.test(dare.txHash ?? "") &&
    /^[1-9][0-9]*$/.test(dare.onChainDareId ?? "")
  );
}
