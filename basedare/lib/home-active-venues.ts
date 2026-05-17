import { buildVenueGuestMission } from '@/lib/venue-guest-missions';

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

type ActiveVenueFallbackSeed = Omit<ActiveVenueCard, 'guestMission' | 'missionHref' | 'perkLabel'> & {
  categories: string[];
  goalOverride?: ReturnType<typeof buildVenueGuestMission>['goal'];
  guestMissionOverride?: string;
  hasActiveDrops?: boolean;
  isLive?: boolean;
  perkLabel?: string;
};

const ACTIVE_VENUE_FALLBACK_SEEDS: ActiveVenueFallbackSeed[] = [
  {
    slug: 'hideaway',
    name: 'Hideaway',
    area: 'General Luna',
    tone: 'gold',
    statusLabel: 'Pilot-ready',
    missionTitle: 'First Spark night route',
    categories: ['nightlife', 'bar'],
    checkInsToday: 5,
    proofCount: 2,
    activityLabel: 'Venue memory online',
    primaryHref: '/map?place=hideaway&source=active-venues',
    goalOverride: 'repeat_visits',
  },
  {
    slug: 'siargao-beach-club',
    name: 'Siargao Beach Club',
    area: 'General Luna',
    tone: 'cyan',
    statusLabel: 'Live venue',
    missionTitle: 'Creator plus guest check-in',
    categories: ['beach', 'tourism'],
    guestMissionOverride: 'First 25 check-ins unlock tonight\'s venue perk.',
    perkLabel: 'Happy-hour unlock',
    checkInsToday: 3,
    proofCount: 5,
    activityLabel: 'QR rail ready',
    primaryHref: '/map?place=siargao-beach-club&source=active-venues',
    goalOverride: 'foot_traffic',
    isLive: true,
  },
  {
    slug: 'cloud-9-boardwalk',
    name: 'Cloud 9 Boardwalk',
    area: 'Catangnan',
    tone: 'emerald',
    statusLabel: 'First mark',
    missionTitle: 'Surf proof loop',
    categories: ['surf', 'beach'],
    checkInsToday: 1,
    proofCount: 1,
    activityLabel: 'Proof seed live',
    primaryHref: '/map?place=cloud-9-boardwalk&source=active-venues',
    goalOverride: 'ugc',
  },
  {
    slug: 'the-cat-and-gun',
    name: 'The Cat & Gun',
    area: 'Catangnan',
    tone: 'purple',
    statusLabel: 'Crowd mission',
    missionTitle: 'Food and match-night proof',
    categories: ['food', 'bar'],
    checkInsToday: 2,
    proofCount: 1,
    activityLabel: 'Guest loop ready',
    primaryHref: '/map?place=the-cat-and-gun&source=active-venues',
    goalOverride: 'ugc',
  },
];

export const ACTIVE_VENUE_FALLBACKS: ActiveVenueCard[] = ACTIVE_VENUE_FALLBACK_SEEDS.map((venue) => {
  const mission = buildVenueGuestMission({
    venueName: venue.name,
    categories: venue.categories,
    activePerk: venue.perkLabel
      ? {
          enabled: true,
          title: venue.perkLabel,
          description: null,
          staffInstructions: null,
          expiresInHours: 24,
          updatedAt: null,
        }
      : null,
    liveSession: venue.isLive ? { status: 'LIVE' } : null,
    hasActiveDrops: venue.hasActiveDrops,
  });
  const guestMission = venue.guestMissionOverride ?? mission.guestMission;
  const perkLabel = venue.perkLabel ?? mission.perkLabel;

  return {
    slug: venue.slug,
    name: venue.name,
    area: venue.area,
    tone: venue.tone,
    statusLabel: venue.statusLabel,
    missionTitle: venue.missionTitle,
    guestMission,
    perkLabel,
    checkInsToday: venue.checkInsToday,
    proofCount: venue.proofCount,
    activityLabel: venue.activityLabel,
    primaryHref: venue.primaryHref,
    missionHref: `/venues/${encodeURIComponent(venue.slug)}/guest-mission`,
  };
});

export function cloneActiveVenueFallbacks() {
  return ACTIVE_VENUE_FALLBACKS.map((venue) => ({ ...venue }));
}
