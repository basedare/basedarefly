import 'server-only';

import { createWalletNotification } from '@/lib/notifications';

export async function notifyVenueClaimSubmitted(input: {
  wallet: string | null | undefined;
  venueSlug: string;
  venueName: string;
}) {
  if (!input.wallet) return;

  await createWalletNotification({
    wallet: input.wallet,
    type: 'VENUE_CLAIM_SUBMITTED',
    title: 'Venue Claim Submitted',
    message: `Your claim for "${input.venueName}" is pending moderator review.`,
    link: `/venues/${input.venueSlug}`,
    pushTopic: 'venues',
  });
}

export async function notifyVenueClaimApproved(input: {
  wallet: string | null | undefined;
  venueSlug: string;
  venueName: string;
}) {
  if (!input.wallet) return;

  await createWalletNotification({
    wallet: input.wallet,
    type: 'VENUE_CLAIM_APPROVED',
    title: 'Venue Claim Approved',
    message: `"${input.venueName}" is now unlocked for your venue console.`,
    link: `/venues/${input.venueSlug}/console`,
    pushTopic: 'venues',
  });
}

export async function notifyVenueClaimRejected(input: {
  wallet: string | null | undefined;
  venueSlug: string;
  venueName: string;
  reason?: string | null;
}) {
  if (!input.wallet) return;

  const reasonTail = input.reason ? ` Reason: ${input.reason}` : '';

  await createWalletNotification({
    wallet: input.wallet,
    type: 'VENUE_CLAIM_REJECTED',
    title: 'Venue Claim Rejected',
    message: `Your claim for "${input.venueName}" was rejected.${reasonTail}`,
    link: `/venues/${input.venueSlug}`,
    pushTopic: 'venues',
  });
}
