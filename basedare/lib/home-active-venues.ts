import { buildVenueMissionActivationHref } from '@/lib/mission-routing';

export type ActiveVenueTone = 'gold' | 'cyan' | 'emerald' | 'purple';

export type ActiveVenueCard = {
  slug: string;
  name: string;
  area: string;
  tone: ActiveVenueTone;
  statusLabel: string;
  missionTitle: string;
  guestMission: string;
  perkLabel: string;
  checkInsToday: number;
  proofCount: number;
  activityLabel: string;
  primaryHref: string;
  missionHref: string;
};

export const ACTIVE_VENUE_FALLBACKS: ActiveVenueCard[] = [
  {
    slug: 'hideaway',
    name: 'Hideaway',
    area: 'General Luna',
    tone: 'gold',
    statusLabel: 'Pilot-ready',
    missionTitle: 'First Spark night route',
    guestMission: 'Check in tonight and unlock the crew receipt.',
    perkLabel: 'Entry/status perk',
    checkInsToday: 5,
    proofCount: 2,
    activityLabel: 'Venue memory online',
    primaryHref: '/map?place=hideaway&source=active-venues',
    missionHref: buildVenueMissionActivationHref({
      source: 'active-venues',
      venueSlug: 'hideaway',
      venueName: 'Hideaway',
      city: 'General Luna',
      goal: 'repeat_visits',
      missionTitle: 'First Spark night route',
      guestMission: 'Check in tonight and unlock the crew receipt.',
      perkLabel: 'Entry/status perk',
    }),
  },
  {
    slug: 'siargao-beach-club',
    name: 'Siargao Beach Club',
    area: 'General Luna',
    tone: 'cyan',
    statusLabel: 'Live venue',
    missionTitle: 'Creator plus guest check-in',
    guestMission: 'First 25 check-ins unlock tonight\'s venue perk.',
    perkLabel: 'Happy-hour unlock',
    checkInsToday: 3,
    proofCount: 5,
    activityLabel: 'QR rail ready',
    primaryHref: '/map?place=siargao-beach-club&source=active-venues',
    missionHref: buildVenueMissionActivationHref({
      source: 'active-venues',
      venueSlug: 'siargao-beach-club',
      venueName: 'Siargao Beach Club',
      city: 'General Luna',
      goal: 'foot_traffic',
      missionTitle: 'Creator plus guest check-in',
      guestMission: 'First 25 check-ins unlock tonight\'s venue perk.',
      perkLabel: 'Happy-hour unlock',
    }),
  },
  {
    slug: 'cloud-9-boardwalk',
    name: 'Cloud 9 Boardwalk',
    area: 'Catangnan',
    tone: 'emerald',
    statusLabel: 'First mark',
    missionTitle: 'Surf proof loop',
    guestMission: 'Scan the hidden QR and vote for the best surf proof.',
    perkLabel: 'Local status stamp',
    checkInsToday: 1,
    proofCount: 1,
    activityLabel: 'Proof seed live',
    primaryHref: '/map?place=cloud-9-boardwalk&source=active-venues',
    missionHref: buildVenueMissionActivationHref({
      source: 'active-venues',
      venueSlug: 'cloud-9-boardwalk',
      venueName: 'Cloud 9 Boardwalk',
      city: 'Catangnan',
      goal: 'ugc',
      missionTitle: 'Surf proof loop',
      guestMission: 'Scan the hidden QR and vote for the best surf proof.',
      perkLabel: 'Local status stamp',
    }),
  },
  {
    slug: 'the-cat-and-gun',
    name: 'The Cat & Gun',
    area: 'Catangnan',
    tone: 'purple',
    statusLabel: 'Crowd mission',
    missionTitle: 'Food and match-night proof',
    guestMission: 'Vote for the best order and share a receipt card.',
    perkLabel: 'Secret menu signal',
    checkInsToday: 2,
    proofCount: 1,
    activityLabel: 'Guest loop ready',
    primaryHref: '/map?place=the-cat-and-gun&source=active-venues',
    missionHref: buildVenueMissionActivationHref({
      source: 'active-venues',
      venueSlug: 'the-cat-and-gun',
      venueName: 'The Cat & Gun',
      city: 'Catangnan',
      goal: 'ugc',
      missionTitle: 'Food and match-night proof',
      guestMission: 'Vote for the best order and share a receipt card.',
      perkLabel: 'Secret menu signal',
    }),
  },
];

export function cloneActiveVenueFallbacks() {
  return ACTIVE_VENUE_FALLBACKS.map((venue) => ({ ...venue }));
}
