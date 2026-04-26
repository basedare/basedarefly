import type { VenueDetail } from '@/lib/venue-types';

type CampaignTier = 'SIP_MENTION' | 'SIP_SHILL' | 'CHALLENGE' | 'APEX';

type LaunchPrefillInput = {
  venueId?: string;
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

function buildVenueCreateHref(
  input: LaunchPrefillInput & {
    mode: 'venue-challenge' | 'venue-activation';
    source?: 'venue' | 'brand-portal' | 'map' | 'venue-console';
  }
) {
  const missionText = input.objective?.trim() || input.title;
  const params = new URLSearchParams({
    mode: input.mode,
    source: input.source ?? 'venue',
    venue: input.venueSlug,
    venueName: input.venueName,
    title: missionText,
    amount: String(Math.max(5, Math.round(input.payout))),
  });

  if (input.venueId) {
    params.set('venueId', input.venueId);
  }

  if (input.creatorTag) {
    params.set('streamer', input.creatorTag);
  }

  if (input.objective?.trim()) {
    params.set('objective', input.objective.trim());
  }

  return `/create?${params.toString()}`;
}

export function buildVenueChallengeCreateHref(input: {
  venueId?: string;
  venueSlug: string;
  venueName: string;
  title?: string;
  payout?: number;
  creatorTag?: string | null;
  objective?: string | null;
  source?: 'venue' | 'brand-portal' | 'map' | 'venue-console';
}) {
  return buildVenueCreateHref({
    venueId: input.venueId,
    venueSlug: input.venueSlug,
    venueName: input.venueName,
    title: input.title ?? `Create a challenge at ${input.venueName}`,
    payout: input.payout ?? 60,
    creatorTag: input.creatorTag,
    objective:
      input.objective ??
      `Fund a creator challenge at ${input.venueName}. Capture why this place is alive right now and submit proof from the venue.`,
    mode: 'venue-challenge',
    source: input.source,
  });
}

export function buildVenueActivationCreateHref(input: {
  venueId?: string;
  venueSlug: string;
  venueName: string;
  title?: string;
  payout?: number;
  creatorTag?: string | null;
  objective?: string | null;
  source?: 'venue' | 'brand-portal' | 'map' | 'venue-console';
}) {
  return buildVenueCreateHref({
    venueId: input.venueId,
    venueSlug: input.venueSlug,
    venueName: input.venueName,
    title: input.title ?? `Launch a paid activation at ${input.venueName}`,
    payout: input.payout ?? 120,
    creatorTag: input.creatorTag,
    objective:
      input.objective ??
      `Launch a paid venue activation at ${input.venueName}. Route creator proof into the venue memory layer and make the result repeatable.`,
    mode: 'venue-activation',
    source: input.source,
  });
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

export function buildRepeatActivationCreateHref(input: {
  venue: Pick<VenueDetail, 'id' | 'slug' | 'name' | 'featuredPaidActivation' | 'topCreators'>;
  source?: 'venue' | 'brand-portal' | 'map' | 'venue-console';
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

  return buildVenueActivationCreateHref({
    venueId: input.venue.id,
    venueSlug: input.venue.slug,
    venueName: input.venue.name,
    title: activation.title,
    payout: activation.bounty,
    creatorTag: preferredCreatorTag,
    objective: `Re-run the ${sponsorLabel} activation at ${input.venue.name}. Use the same venue energy and proven brief, but push for a cleaner repeatable result.`,
    source: input.source,
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

export function buildActivationReplayCreateHref(input: {
  venue: Pick<VenueDetail, 'id' | 'slug' | 'name' | 'topCreators'>;
  activation: VenueDetail['activeDares'][number];
  source?: 'venue' | 'brand-portal' | 'map' | 'venue-console';
}) {
  const activation = input.activation;
  const preferredCreatorTag =
    activation.streamerHandle ||
    input.venue.topCreators[0]?.creatorTag ||
    null;
  const sponsorLabel = activation.brandName || activation.campaignTitle || input.venue.name;

  return buildVenueActivationCreateHref({
    venueId: input.venue.id,
    venueSlug: input.venue.slug,
    venueName: input.venue.name,
    title: activation.title,
    payout: activation.bounty,
    creatorTag: preferredCreatorTag,
    objective: `Re-run the ${sponsorLabel} brief at ${input.venue.name}. Keep the same core challenge, but tighten the capture and route the strongest available creator into it.`,
    source: input.source,
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
