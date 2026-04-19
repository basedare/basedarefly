import type { VenueDetail } from '@/lib/venue-types';

type CampaignTier = 'SIP_MENTION' | 'SIP_SHILL' | 'CHALLENGE' | 'APEX';

type LaunchPrefillInput = {
  venueSlug: string;
  venueName: string;
  title: string;
  payout: number;
  creatorTag?: string | null;
  objective?: string | null;
  tier?: CampaignTier | null;
};

function inferCampaignTierByPayout(payout: number): CampaignTier {
  if (payout >= 1000) return 'APEX';
  if (payout >= 250) return 'CHALLENGE';
  if (payout >= 100) return 'SIP_SHILL';
  return 'SIP_MENTION';
}

export function buildVenueActivationComposerHref(input: LaunchPrefillInput) {
  const params = new URLSearchParams({
    venue: input.venueSlug,
    compose: '1',
    tier: input.tier ?? inferCampaignTierByPayout(input.payout),
    payout: String(Math.max(1, Math.round(input.payout))),
    title: input.title,
    objective:
      input.objective?.trim() ||
      `Launch a creator activation at ${input.venueName}. Capture the venue, the movement, and why this place feels worth showing up for right now.`,
  });

  if (input.creatorTag) {
    params.set('creator', input.creatorTag);
  }

  return `/brands/portal?${params.toString()}`;
}

export function buildRepeatActivationComposerHref(input: {
  venue: Pick<VenueDetail, 'slug' | 'name' | 'featuredPaidActivation' | 'topCreators'>;
}) {
  const activation = input.venue.featuredPaidActivation;
  if (!activation) {
    return null;
  }

  const preferredCreatorTag =
    activation.streamerHandle ||
    input.venue.topCreators[0]?.creatorTag ||
    null;
  const sponsorLabel = activation.brandName || activation.campaignTitle || input.venue.name;

  return buildVenueActivationComposerHref({
    venueSlug: input.venue.slug,
    venueName: input.venue.name,
    title: activation.title,
    payout: activation.bounty,
    creatorTag: preferredCreatorTag,
    objective: `Re-run the ${sponsorLabel} activation at ${input.venue.name}. Use the same venue energy and proven brief, but push for a cleaner repeatable result.`,
  });
}

export function buildActivationReplayComposerHref(input: {
  venue: Pick<VenueDetail, 'slug' | 'name' | 'topCreators'>;
  activation: VenueDetail['activeDares'][number];
}) {
  const activation = input.activation;
  const preferredCreatorTag =
    activation.streamerHandle ||
    input.venue.topCreators[0]?.creatorTag ||
    null;
  const sponsorLabel = activation.brandName || activation.campaignTitle || input.venue.name;

  return buildVenueActivationComposerHref({
    venueSlug: input.venue.slug,
    venueName: input.venue.name,
    title: activation.title,
    payout: activation.bounty,
    creatorTag: preferredCreatorTag,
    objective: `Re-run the ${sponsorLabel} brief at ${input.venue.name}. Keep the same core challenge, but tighten the capture and route the strongest available creator into it.`,
  });
}

export function buildVenueCreatorRouteComposerHref(input: {
  venue: Pick<VenueDetail, 'slug' | 'name' | 'featuredPaidActivation'>;
  creatorTag: string;
}) {
  const featuredActivation = input.venue.featuredPaidActivation;
  const sponsorLabel =
    featuredActivation?.brandName ||
    featuredActivation?.campaignTitle ||
    input.venue.name;

  return buildVenueActivationComposerHref({
    venueSlug: input.venue.slug,
    venueName: input.venue.name,
    title:
      featuredActivation?.title ||
      `${input.venue.name} featured activation`,
    payout: featuredActivation?.bounty ?? 120,
    tier: featuredActivation ? null : 'SIP_SHILL',
    creatorTag: input.creatorTag,
    objective: featuredActivation
      ? `Route ${input.creatorTag} into the proven ${sponsorLabel} brief at ${input.venue.name}. Keep the activation sharp, venue-first, and easy to verify.`
      : `Launch a venue-first activation at ${input.venue.name} and route ${input.creatorTag} into it as the lead creator. Capture the place, the movement, and why this venue is worth showing up for right now.`,
  });
}
