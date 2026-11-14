import type { Campaign } from '../app/brands/portal/activation-packages';
const transaction = (value?: string | null) => /^0x[0-9a-fA-F]{64}$/.test(value ?? '');
export function hasRecordedBuyerFunding(campaign: Campaign) {
  const dare = campaign.linkedDare;
  return dare?.isSimulated === false && transaction(dare.txHash) && /^\d+$/.test(dare.onChainDareId ?? '') && BigInt(dare.onChainDareId!) > BigInt(0) && (dare.bounty ?? 0) > 0;
}
export function hasRecordedBuyerPayment(campaign: Campaign) {
  return campaign.linkedDare?.isSimulated === false && campaign.linkedDare.status === 'VERIFIED' && transaction(campaign.linkedDare.verifyTxHash);
}
export function getBuyerCampaignState(campaign: Campaign, now = Date.now()) {
  const dare = campaign.linkedDare;
  if (campaign.type === 'CREATOR' || campaign.truth?.creatorRoutingDormant) return { label: 'Routing paused', detail: 'Previous responses remain available. New creator routing is paused.', tone: 'neutral' };
  if (campaign.status === 'CANCELLED' || dare?.status === 'REFUNDED') return { label: 'Closed', detail: 'Open the brief for its cancellation or refund record.', tone: 'neutral' };
  if (dare?.status === 'FAILED') return { label: 'Review closed', detail: 'See the evidence and review notes before deciding what to request next.', tone: 'amber' };
  if (dare?.isSimulated) return { label: 'Test record', detail: 'This simulated mission does not establish real funding or payment.', tone: 'neutral' };
  if (hasRecordedBuyerPayment(campaign)) return { label: 'Payment recorded', detail: 'A settlement transaction is recorded on the linked brief.', tone: 'mint' };
  if (dare?.status === 'VERIFIED') return { label: 'Evidence approved', detail: 'Approval is recorded. Payment confirmation is not available here.', tone: 'neutral' };
  if (dare?.status === 'PENDING_PAYOUT') return { label: 'Payment pending', detail: 'Evidence is approved; settlement still needs confirmation.', tone: 'amber' };
  if (dare?.status === 'PENDING_REVIEW') return { label: 'Evidence in review', detail: 'BaseDare is reviewing the submission. Open the evidence to see what was delivered.', tone: 'amber' };
  if (dare?.expiresAt && Date.parse(dare.expiresAt) <= now) return { label: 'Expired', detail: 'The participation window has ended. Check the brief for next steps.', tone: 'neutral' };
  if (!dare || !hasRecordedBuyerFunding(campaign)) return { label: 'Funding unconfirmed', detail: 'The displayed budget is planned. Funding needs a recorded transaction before work starts.', tone: 'amber' };
  if (dare.claimRequestStatus === 'PENDING') return { label: 'Contributor request', detail: 'A contributor has asked to take part. BaseDare still needs to review the request.', tone: 'amber' };
  if (dare.claimedBy || dare.targetWalletAddress) return { label: 'Waiting for evidence', detail: 'A contributor is attached. Their submission will appear here when it arrives.', tone: 'neutral' };
  return { label: 'Finding a contributor', detail: 'Recorded funding is attached. No contributor is assigned yet.', tone: 'neutral' };
}
export function buyerWorkspaceMetrics(campaigns: Campaign[]) {
  return { total: campaigns.length, inReview: campaigns.filter(c => c.linkedDare?.status === 'PENDING_REVIEW' && c.linkedDare.isSimulated !== true).length,
    payments: campaigns.filter(hasRecordedBuyerPayment).length,
    funding: campaigns.filter(hasRecordedBuyerFunding).reduce((sum, c) => sum + (c.linkedDare?.bounty ?? 0), 0) };
}
