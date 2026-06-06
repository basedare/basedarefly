import 'server-only';

export type VaultContributionInput = {
  walletAddress: string;
  venueId: string;
  type: 'review';
  sourceId?: string | null;
};

export async function onVaultContribution(input: VaultContributionInput) {
  // SIGNAL POINTS SEAM (Claude wires later): award/reconcile Signal Points for proof-gated vault contributions here.
  void input;
  return null;
}
