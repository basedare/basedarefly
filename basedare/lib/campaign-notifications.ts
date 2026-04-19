import 'server-only';

import { createWalletNotification } from '@/lib/notifications';

export async function notifyCampaignSlotAssigned(input: {
  creatorWallet: string | null | undefined;
  campaignId: string;
  campaignTitle: string;
  venueName?: string | null;
  autoAccepted: boolean;
}) {
  if (!input.creatorWallet) return;

  const venueTail = input.venueName ? ` at ${input.venueName}` : '';

  await createWalletNotification({
    wallet: input.creatorWallet,
    type: 'CAMPAIGN_SLOT_ASSIGNED',
    title: input.autoAccepted ? 'Campaign Slot Routed' : 'Campaign Slot Claimed',
    message: input.autoAccepted
      ? `You were routed into "${input.campaignTitle}"${venueTail}. Open the campaign and prep your proof window.`
      : `A scout claimed you for "${input.campaignTitle}"${venueTail}. Brand veto window is now open.`,
    link: `/dashboard?campaign=${input.campaignId}`,
    pushTopic: 'campaigns',
  });
}

export async function notifyCampaignProofSubmitted(input: {
  brandWallet: string | null | undefined;
  campaignId: string;
  campaignTitle: string;
  creatorHandle?: string | null;
}) {
  if (!input.brandWallet) return;

  await createWalletNotification({
    wallet: input.brandWallet,
    type: 'CAMPAIGN_PROOF_SUBMITTED',
    title: 'Campaign Proof Submitted',
    message: `${input.creatorHandle || 'A creator'} submitted proof for "${input.campaignTitle}". Review the slot when ready.`,
    link: `/brands/portal?campaign=${input.campaignId}`,
    pushTopic: 'campaigns',
  });
}

export async function notifyCampaignSlotClaimedForBrand(input: {
  brandWallet: string | null | undefined;
  campaignId: string;
  campaignTitle: string;
  creatorHandle?: string | null;
  autoAccepted: boolean;
}) {
  if (!input.brandWallet) return;

  await createWalletNotification({
    wallet: input.brandWallet,
    type: 'CAMPAIGN_SLOT_CLAIMED',
    title: input.autoAccepted ? 'Creator Routed Into Campaign' : 'Creator Claim Needs Review',
    message: input.autoAccepted
      ? `${input.creatorHandle || 'A creator'} was routed into "${input.campaignTitle}".`
      : `${input.creatorHandle || 'A creator'} was claimed for "${input.campaignTitle}". Review during the veto window if needed.`,
    link: `/brands/portal?campaign=${input.campaignId}`,
    pushTopic: 'campaigns',
  });
}

export async function notifyCampaignVerificationOutcome(input: {
  creatorWallet: string | null | undefined;
  campaignId: string;
  campaignTitle: string;
  outcome: 'VERIFIED' | 'FORFEITED' | 'SUBMITTED';
  confidence: number;
}) {
  if (!input.creatorWallet) return;

  const rounded = Math.round(input.confidence);
  const title =
    input.outcome === 'VERIFIED'
      ? 'Campaign Proof Verified'
      : input.outcome === 'FORFEITED'
        ? 'Campaign Proof Failed'
        : 'Campaign Proof Needs Review';

  const message =
    input.outcome === 'VERIFIED'
      ? `"${input.campaignTitle}" cleared review at ${rounded}% confidence. Settlement is lining up now.`
      : input.outcome === 'FORFEITED'
        ? `"${input.campaignTitle}" failed review at ${rounded}% confidence. Check the campaign slot for details.`
        : `"${input.campaignTitle}" landed in manual review at ${rounded}% confidence. Hold tight while it gets checked.`;

  await createWalletNotification({
    wallet: input.creatorWallet,
    type: `CAMPAIGN_PROOF_${input.outcome}`,
    title,
    message,
    link: `/dashboard?campaign=${input.campaignId}`,
    pushTopic: 'campaigns',
  });
}

export async function notifyCampaignVerificationOutcomeForBrand(input: {
  brandWallet: string | null | undefined;
  campaignId: string;
  campaignTitle: string;
  creatorHandle?: string | null;
  outcome: 'VERIFIED' | 'FORFEITED' | 'SUBMITTED';
  confidence: number;
}) {
  if (!input.brandWallet) return;

  const rounded = Math.round(input.confidence);
  const title =
    input.outcome === 'VERIFIED'
      ? 'Campaign Slot Verified'
      : input.outcome === 'FORFEITED'
        ? 'Campaign Slot Failed'
        : 'Campaign Slot Needs Review';

  const message =
    input.outcome === 'VERIFIED'
      ? `${input.creatorHandle || 'A creator'} cleared "${input.campaignTitle}" at ${rounded}% confidence.`
      : input.outcome === 'FORFEITED'
        ? `${input.creatorHandle || 'A creator'} failed "${input.campaignTitle}" at ${rounded}% confidence.`
        : `${input.creatorHandle || 'A creator'} is waiting on manual review for "${input.campaignTitle}" at ${rounded}% confidence.`;

  await createWalletNotification({
    wallet: input.brandWallet,
    type: `CAMPAIGN_BRAND_${input.outcome}`,
    title,
    message,
    link: `/brands/portal?campaign=${input.campaignId}`,
    pushTopic: 'campaigns',
  });
}

export async function notifyCampaignSlotVetoed(input: {
  creatorWallet: string | null | undefined;
  campaignId: string;
  campaignTitle: string;
  reason?: string | null;
}) {
  if (!input.creatorWallet) return;

  const reasonTail = input.reason ? ` Reason: ${input.reason}` : '';

  await createWalletNotification({
    wallet: input.creatorWallet,
    type: 'CAMPAIGN_SLOT_VETOED',
    title: 'Campaign Slot Vetoed',
    message: `Your slot on "${input.campaignTitle}" was vetoed by the brand.${reasonTail}`,
    link: `/dashboard?campaign=${input.campaignId}`,
    pushTopic: 'campaigns',
  });
}
