import { buildVenueMissionActivationHref, type MissionActivationGoal } from '@/lib/mission-routing';
import type { VenuePerkLite } from '@/lib/venue-types';

export type VenueGuestMission = {
  missionTitle: string;
  guestMission: string;
  perkLabel: string;
  statusLabel: string;
  proofLabel: string;
  urgencyLabel: string;
  goal: MissionActivationGoal;
  chips: string[];
};

function includesAny(values: string[], keywords: string[]) {
  return values.some((value) => keywords.some((keyword) => value.includes(keyword)));
}

export function buildVenueGuestMission(input: {
  venueName: string;
  categories: string[];
  activePerk?: VenuePerkLite | null;
  liveSession?: { status?: string | null } | null;
  hasActiveDrops?: boolean;
}): VenueGuestMission {
  const normalizedCategories = input.categories.map((category) => category.toLowerCase());
  const hasLiveQr = input.liveSession?.status === 'LIVE';
  const perkLabel = input.activePerk?.title ?? null;

  if (includesAny(normalizedCategories, ['surf', 'beach', 'tour', 'outdoor', 'travel'])) {
    return {
      missionTitle: `${input.venueName} local proof loop`,
      guestMission: 'Scan in, share the local proof, and vote for the best moment.',
      perkLabel: perkLabel ?? 'Local status stamp',
      statusLabel: hasLiveQr ? 'Live QR' : 'Proof loop',
      proofLabel: hasLiveQr ? 'Venue QR plus proof' : 'Photo, clip, or hidden QR',
      urgencyLabel: input.hasActiveDrops ? 'Drop attached' : 'First wave open',
      goal: 'ugc',
      chips: ['local proof', 'guest vote', 'surf signal'],
    };
  }

  if (includesAny(normalizedCategories, ['food', 'cafe', 'coffee', 'restaurant', 'burger'])) {
    return {
      missionTitle: `${input.venueName} receipt challenge`,
      guestMission: 'Vote for the best order and share a receipt card.',
      perkLabel: perkLabel ?? 'Secret menu signal',
      statusLabel: hasLiveQr ? 'Live receipt' : 'Food proof',
      proofLabel: hasLiveQr ? 'Check-in plus receipt' : 'Receipt, photo, or tag',
      urgencyLabel: input.hasActiveDrops ? 'Funded meal loop' : 'Open table',
      goal: 'ugc',
      chips: ['receipt card', 'best order', 'secret menu'],
    };
  }

  if (includesAny(normalizedCategories, ['night', 'bar', 'club', 'music'])) {
    return {
      missionTitle: `${input.venueName} night check-in`,
      guestMission: 'Check in tonight, bring a crew, and collect the venue receipt.',
      perkLabel: perkLabel ?? 'Entry/status perk',
      statusLabel: hasLiveQr ? 'Live check-in' : 'Tonight-ready',
      proofLabel: hasLiveQr ? 'Scan venue QR' : 'QR or staff check-in',
      urgencyLabel: input.hasActiveDrops ? 'Money live' : 'Best tonight',
      goal: hasLiveQr ? 'foot_traffic' : 'repeat_visits',
      chips: ['crew receipt', 'night energy', 'repeat visit'],
    };
  }

  return {
    missionTitle: `${input.venueName} guest mission`,
    guestMission: 'Check in, bring a friend, and collect the venue receipt.',
    perkLabel: perkLabel ?? 'Crowd unlock',
    statusLabel: hasLiveQr ? 'Live check-in' : 'Guest loop',
    proofLabel: hasLiveQr ? 'Scan venue QR' : 'QR, GPS, or approved proof',
    urgencyLabel: input.hasActiveDrops ? 'Live drop attached' : 'First guest loop',
    goal: input.hasActiveDrops || hasLiveQr ? 'foot_traffic' : 'repeat_visits',
    chips: ['bring a friend', 'venue receipt', 'crowd unlock'],
  };
}

export function buildVenueGuestMissionActivationHref(input: {
  source: string;
  venueName: string;
  venueSlug: string;
  city?: string | null;
  mission: VenueGuestMission;
}) {
  return buildVenueMissionActivationHref({
    source: input.source,
    venueName: input.venueName,
    venueSlug: input.venueSlug,
    city: input.city,
    goal: input.mission.goal,
    missionTitle: input.mission.missionTitle,
    guestMission: input.mission.guestMission,
    perkLabel: input.mission.perkLabel,
  });
}
