import { PrismaClient } from '@prisma/client';
import { encodeGeohash } from '../lib/geo';

const prisma = new PrismaClient();

const now = new Date();
const dayStart = new Date(now);
dayStart.setHours(0, 0, 0, 0);
const dayEnd = new Date(dayStart);
dayEnd.setDate(dayEnd.getDate() + 1);

type SeededTagInput = {
  walletAddress: string;
  creatorTag: string;
  caption: string;
  vibeTags: string[];
  proofMediaUrl: string;
  proofType: 'IMAGE' | 'VIDEO';
  minutesAgo: number;
  heatContribution?: number;
};

type SeededPlaceInput = {
  slug: string;
  name: string;
  description: string;
  address: string;
  city: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  categories: string[];
  isPartner?: boolean;
  partnerTier?: string | null;
  featuredLabel?: string;
  seededTags: SeededTagInput[];
};

const SEEDED_CREATORS = [
  { walletAddress: '0x1111111111111111111111111111111111111111', creatorTag: '@basedarebear' },
  { walletAddress: '0x2222222222222222222222222222222222222222', creatorTag: '@nightsignal' },
  { walletAddress: '0x3333333333333333333333333333333333333333', creatorTag: '@chaoscam' },
  { walletAddress: '0x4444444444444444444444444444444444444444', creatorTag: '@hiddenfreq' },
  { walletAddress: '0x5555555555555555555555555555555555555555', creatorTag: '@gridspray' },
];

const SEEDED_PLACES: SeededPlaceInput[] = [
  {
    slug: 'sydney-opera-house',
    name: 'Sydney Opera House',
    description: 'Harbour-side icon for first-spark dares, city flexes, and public place memory.',
    address: 'Bennelong Point',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8568,
    longitude: 151.2153,
    timezone: 'Australia/Sydney',
    categories: ['iconic', 'harbour', 'tourism'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Harbour wind going crazy. Left the first spark on the steps.',
        vibeTags: ['iconic', 'harbour', 'sunset'],
        proofMediaUrl: '/assets/Peebear.png',
        proofType: 'IMAGE',
        minutesAgo: 55,
      },
    ],
  },
  {
    slug: 'chinese-laundry',
    name: 'Chinese Laundry',
    description: 'Late-night underground node where the grid should feel loud.',
    address: 'Slip Inn, 111 Sussex St',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8708,
    longitude: 151.2036,
    timezone: 'Australia/Sydney',
    categories: ['nightlife', 'club', 'music'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[1],
        caption: 'Basement heat. Place was already pulsing when we walked in.',
        vibeTags: ['nightlife', 'sweaty', 'bass'],
        proofMediaUrl: '/assets/machine-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 18,
      },
      {
        ...SEEDED_CREATORS[2],
        caption: 'Strobe chaos and no chance of acting normal.',
        vibeTags: ['club', 'chaos', 'late'],
        proofMediaUrl: '/assets/adinross.png',
        proofType: 'IMAGE',
        minutesAgo: 34,
      },
      {
        ...SEEDED_CREATORS[3],
        caption: 'Verified the floor was active long before midnight.',
        vibeTags: ['alive', 'crowd', 'sydney'],
        proofMediaUrl: '/assets/honey-card-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 49,
      },
    ],
  },
  {
    slug: 'bondi-icebergs',
    name: 'Bondi Icebergs',
    description: 'Ocean-facing flex point for creators, tourists, and high-visibility marks.',
    address: '1 Notts Ave, Bondi Beach',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8915,
    longitude: 151.2767,
    timezone: 'Australia/Sydney',
    categories: ['beach', 'tourism', 'iconic'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[3],
        caption: 'Salt, wind, and one clean first shot over the pool edge.',
        vibeTags: ['beach', 'ocean', 'clean'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 92,
      },
      {
        ...SEEDED_CREATORS[4],
        caption: 'Caught the last light before the whole coast went blue.',
        vibeTags: ['bondi', 'sunset', 'coastal'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 138,
      },
    ],
  },
  {
    slug: 'barangaroo-house',
    name: 'Barangaroo House',
    description: 'Harbour-side nightlife stack with city energy and clean discovery potential.',
    address: '35 Barangaroo Ave',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8606,
    longitude: 151.2019,
    timezone: 'Australia/Sydney',
    categories: ['nightlife', 'harbour', 'rooftop'],
    featuredLabel: 'simmering',
    seededTags: [
      {
        ...SEEDED_CREATORS[2],
        caption: 'Clean harbour angle. Left a mark and kept moving.',
        vibeTags: ['harbour', 'rooftop', 'night'],
        proofMediaUrl: '/assets/basedaresolid.png',
        proofType: 'IMAGE',
        minutesAgo: 520,
      },
    ],
  },
  {
    slug: 'the-grounds-of-alexandria',
    name: 'The Grounds of Alexandria',
    description: 'Big social node for daylight dares, creator resets, and softer hidden-gem content.',
    address: '7a/2 Huntley St, Alexandria',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.9107,
    longitude: 151.1945,
    timezone: 'Australia/Sydney',
    categories: ['daylife', 'social', 'food'],
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Too polished not to tag. This place already had weekend energy.',
        vibeTags: ['social', 'daytime', 'crowd'],
        proofMediaUrl: '/assets/KAICENAT.jpeg',
        proofType: 'IMAGE',
        minutesAgo: 870,
      },
      {
        ...SEEDED_CREATORS[4],
        caption: 'Left a quieter mark here. Still counts if the vibe is real.',
        vibeTags: ['soft-chaos', 'brunch', 'alexandria'],
        proofMediaUrl: '/assets/Ishowspeed.jpg',
        proofType: 'IMAGE',
        minutesAgo: 1010,
      },
    ],
  },
  {
    slug: 'hyde-park-archibald-fountain',
    name: 'Hyde Park Fountain',
    description: 'Open city landmark waiting for its first real place-memory moment.',
    address: 'Elizabeth St & Liverpool St',
    city: 'Sydney',
    country: 'Australia',
    latitude: -33.8731,
    longitude: 151.2113,
    timezone: 'Australia/Sydney',
    categories: ['city', 'landmark', 'unmarked'],
    featuredLabel: 'unmarked',
    seededTags: [],
  },
  {
    slug: 'hideaway',
    name: 'Hideaway',
    description: 'Boardwalk bar energy right by the island hopping dock in General Luna.',
    address: 'Boardwalk, General Luna, 8419 Surigao del Norte, Philippines',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.78105,
    longitude: 126.15706,
    timezone: 'Asia/Manila',
    categories: ['nightlife', 'boardwalk', 'dock'],
    featuredLabel: 'hot',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Dockside was loud tonight. This one is definitely alive.',
        vibeTags: ['siargao', 'dock', 'nightlife'],
        proofMediaUrl: '/assets/honey-card-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 12,
      },
      {
        ...SEEDED_CREATORS[1],
        caption: 'Island hopping dock by day, chaos signal by night.',
        vibeTags: ['dock', 'boardwalk', 'pulse'],
        proofMediaUrl: '/assets/basedarenew.png',
        proofType: 'IMAGE',
        minutesAgo: 27,
      },
      {
        ...SEEDED_CREATORS[2],
        caption: 'Caught the boardwalk lights just before it got packed.',
        vibeTags: ['lights', 'siargao', 'alive'],
        proofMediaUrl: '/assets/control-the-stream.png',
        proofType: 'IMAGE',
        minutesAgo: 46,
      },
    ],
  },
  {
    slug: 'siargao-beach-club',
    name: 'Siargao Beach Club',
    description: 'A seeded nightlife pilot venue for BaseDare venue-memory and QR-console testing in General Luna.',
    address: 'Tourism Road, Purok 3',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.7848,
    longitude: 126.1632,
    timezone: 'Asia/Manila',
    categories: ['nightlife', 'music', 'pilot'],
    isPartner: true,
    partnerTier: 'PILOT',
    featuredLabel: 'active',
    seededTags: [
      {
        ...SEEDED_CREATORS[0],
        caption: 'Pilot venue is warm. People are already leaving marks here.',
        vibeTags: ['pilot', 'nightlife', 'creator'],
        proofMediaUrl: '/assets/Peebear.png',
        proofType: 'IMAGE',
        minutesAgo: 88,
      },
      {
        ...SEEDED_CREATORS[3],
        caption: 'Verified the afterparty layer is starting to stick.',
        vibeTags: ['afterparty', 'music', 'siargao'],
        proofMediaUrl: '/assets/machine-loop.mp4',
        proofType: 'VIDEO',
        minutesAgo: 143,
      },
    ],
  },
  {
    slug: 'cloud-9-boardwalk',
    name: 'Cloud 9 Boardwalk',
    description: 'Iconic surf-side walkway and a clean first-mark target for Siargao.',
    address: 'Cloud 9, Catangnan',
    city: 'General Luna',
    country: 'Philippines',
    latitude: 9.8133,
    longitude: 126.1602,
    timezone: 'Asia/Manila',
    categories: ['surf', 'boardwalk', 'iconic'],
    featuredLabel: 'first-spark',
    seededTags: [
      {
        ...SEEDED_CREATORS[4],
        caption: 'Boardwalk was quiet enough to leave one clean spark.',
        vibeTags: ['surf', 'boardwalk', 'sunrise'],
        proofMediaUrl: '/assets/basedaresolid.png',
        proofType: 'IMAGE',
        minutesAgo: 360,
      },
    ],
  },
];

function minutesAgoDate(minutesAgo: number) {
  return new Date(now.getTime() - minutesAgo * 60 * 1000);
}

async function upsertSeededPlace(place: SeededPlaceInput) {
  const geohash = encodeGeohash(place.latitude, place.longitude, 6);

  const venue = await prisma.venue.upsert({
    where: { slug: place.slug },
    update: {
      name: place.name,
      description: place.description,
      address: place.address,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      geohash,
      timezone: place.timezone,
      categories: place.categories,
      status: 'ACTIVE',
      isPartner: place.isPartner ?? false,
      partnerTier: place.partnerTier ?? null,
      placeSource: 'seed',
      externalPlaceId: `seed:${place.slug}`,
      metadataJson: {
        seeded: true,
        featuredLabel: place.featuredLabel ?? null,
        vibe: place.description,
        locationConfidence: 'approximate-seed',
      },
    },
    create: {
      slug: place.slug,
      name: place.name,
      description: place.description,
      address: place.address,
      city: place.city,
      country: place.country,
      latitude: place.latitude,
      longitude: place.longitude,
      geohash,
      timezone: place.timezone,
      categories: place.categories,
      status: 'ACTIVE',
      isPartner: place.isPartner ?? false,
      partnerTier: place.partnerTier ?? null,
      placeSource: 'seed',
      externalPlaceId: `seed:${place.slug}`,
      metadataJson: {
        seeded: true,
        featuredLabel: place.featuredLabel ?? null,
        vibe: place.description,
        locationConfidence: 'approximate-seed',
      },
    },
  });

  await prisma.placeTag.deleteMany({
    where: {
      venueId: venue.id,
      source: 'SEEDED_MEMORY',
    },
  });

  if (place.seededTags.length > 0) {
    await prisma.placeTag.createMany({
      data: place.seededTags.map((tag, index) => {
        const submittedAt = minutesAgoDate(tag.minutesAgo);
        return {
          venueId: venue.id,
          walletAddress: tag.walletAddress.toLowerCase(),
          creatorTag: tag.creatorTag,
          status: 'APPROVED',
          caption: tag.caption,
          vibeTags: tag.vibeTags,
          proofMediaUrl: tag.proofMediaUrl,
          proofCid: null,
          proofHash: `seeded:${place.slug}:${index}`,
          proofType: tag.proofType,
          source: 'SEEDED_MEMORY',
          linkedDareId: null,
          hiddenPromptId: null,
          latitude: place.latitude,
          longitude: place.longitude,
          geoDistanceMeters: 18 + index * 11,
          heatContribution: tag.heatContribution ?? 10,
          firstMark: index === 0,
          submittedAt,
          reviewedAt: new Date(submittedAt.getTime() + 5 * 60 * 1000),
          reviewerWallet: 'seed-admin',
          reviewReason: 'Seeded approved memory',
          metadataJson: {
            seeded: true,
            seedPlaceSlug: place.slug,
          },
        };
      }),
    });
  }

  const approvedCount = place.seededTags.length;

  await prisma.venueMemory.upsert({
    where: {
      venueId_bucketType_bucketStartAt: {
        venueId: venue.id,
        bucketType: 'DAY',
        bucketStartAt: dayStart,
      },
    },
    update: {
      bucketEndAt: dayEnd,
      checkInCount: Math.max(approvedCount * 3, 0),
      uniqueVisitorCount: approvedCount,
      dareCount: Math.max(1, Math.min(approvedCount, 3)),
      completedDareCount: Math.max(approvedCount - 1, 0),
      proofCount: approvedCount,
      perkRedemptionCount: 0,
      topCreatorTag: place.seededTags[0]?.creatorTag ?? null,
      metadataJson: {
        seeded: true,
        featuredLabel: place.featuredLabel ?? null,
      },
    },
    create: {
      venueId: venue.id,
      bucketType: 'DAY',
      bucketStartAt: dayStart,
      bucketEndAt: dayEnd,
      checkInCount: Math.max(approvedCount * 3, 0),
      uniqueVisitorCount: approvedCount,
      dareCount: Math.max(1, Math.min(approvedCount, 3)),
      completedDareCount: Math.max(approvedCount - 1, 0),
      proofCount: approvedCount,
      perkRedemptionCount: 0,
      topCreatorTag: place.seededTags[0]?.creatorTag ?? null,
      metadataJson: {
        seeded: true,
        featuredLabel: place.featuredLabel ?? null,
      },
    },
  });

  return venue;
}

async function seedPilotSession(venueId: string) {
  return prisma.venueQrSession.upsert({
    where: { sessionKey: 'siargao-beach-club-live' },
    update: {
      venueId,
      scope: 'VENUE_CHECKIN',
      status: 'LIVE',
      label: 'Siargao pilot venue console',
      campaignLabel: 'Foam Party Check-In',
      rotationSeconds: 45,
      startedAt: now,
      endsAt: null,
      lastRotatedAt: now,
      pausedAt: null,
      metadataJson: {
        seeded: true,
        perksEnabled: false,
      },
    },
    create: {
      venueId,
      scope: 'VENUE_CHECKIN',
      sessionKey: 'siargao-beach-club-live',
      status: 'LIVE',
      label: 'Siargao pilot venue console',
      campaignLabel: 'Foam Party Check-In',
      rotationSeconds: 45,
      startedAt: now,
      lastRotatedAt: now,
      metadataJson: {
        seeded: true,
        perksEnabled: false,
      },
    },
  });
}

async function main() {
  const seededVenueMap = new Map<string, Awaited<ReturnType<typeof upsertSeededPlace>>>();

  for (const place of SEEDED_PLACES) {
    const venue = await upsertSeededPlace(place);
    seededVenueMap.set(place.slug, venue);
  }

  const pilotVenue = seededVenueMap.get('siargao-beach-club');
  if (!pilotVenue) {
    throw new Error('Seeded pilot venue missing');
  }

  const pilotSession = await seedPilotSession(pilotVenue.id);

  const baseGod = await prisma.user.upsert({
    where: { walletAddress: '0xBaseGod0000000000000000000000000000000001' },
    update: {},
    create: {
      walletAddress: '0xBaseGod0000000000000000000000000000000001',
      baseTag: 'BaseGod',
      reputationScore: 1000,
    },
  });

  const xqc = await prisma.user.upsert({
    where: { walletAddress: '0xXqc0000000000000000000000000000000000002' },
    update: {},
    create: {
      walletAddress: '0xXqc0000000000000000000000000000000000002',
      baseTag: 'xQc',
      reputationScore: 750,
    },
  });

  const speed = await prisma.user.upsert({
    where: { walletAddress: '0xSpeed000000000000000000000000000000000003' },
    update: {},
    create: {
      walletAddress: '0xSpeed000000000000000000000000000000000003',
      baseTag: 'Speed',
      reputationScore: 600,
    },
  });

  const pilotVenueGeohash = encodeGeohash(pilotVenue.latitude, pilotVenue.longitude, 6);
  const dareData = [
    {
      shortId: 'seed-ghostp',
      title: 'Eat a Ghost Pepper',
      bounty: 50000.0,
      streamerHandle: 'xQc',
      status: 'PENDING' as const,
      creatorId: baseGod.id,
    },
    {
      shortId: 'seed-silent',
      title: '24 Hour Silent Stream',
      bounty: 25000.0,
      streamerHandle: 'Speed',
      status: 'VERIFIED' as const,
      creatorId: baseGod.id,
    },
    {
      shortId: 'seed-excall',
      title: 'Call Your Ex Live',
      bounty: 100000.0,
      streamerHandle: 'xQc',
      status: 'PENDING' as const,
      creatorId: speed.id,
    },
    {
      shortId: 'seed-dancep',
      title: 'Dance in Public',
      bounty: 15000.0,
      streamerHandle: 'Speed',
      status: 'VERIFIED' as const,
      creatorId: xqc.id,
    },
    {
      shortId: 'seed-fanmail',
      title: 'Read Fan Mail Aloud',
      bounty: 30000.0,
      streamerHandle: 'BaseGod',
      status: 'PENDING' as const,
      creatorId: xqc.id,
    },
    {
      shortId: 'seed-venue1',
      title: 'Freestyle with three strangers at Siargao Beach Club',
      bounty: 150.0,
      streamerHandle: null,
      missionMode: 'IRL' as const,
      status: 'PENDING' as const,
      creatorId: baseGod.id,
      venueId: pilotVenue.id,
      locationLabel: pilotVenue.name,
      latitude: pilotVenue.latitude,
      longitude: pilotVenue.longitude,
      geohash: pilotVenueGeohash,
      isNearbyDare: true,
      discoveryRadiusKm: 2,
      dare_text: 'Freestyle with three strangers at Siargao Beach Club',
    },
  ];

  for (const dare of dareData) {
    await prisma.dare.upsert({
      where: { shortId: dare.shortId },
      update: dare,
      create: dare,
    });
  }

  const seededVenueDare = await prisma.dare.findUnique({
    where: { shortId: 'seed-venue1' },
    select: { id: true },
  });

  await prisma.venueCheckIn.deleteMany({
    where: {
      venueId: pilotVenue.id,
      source: 'SEEDED_PILOT',
    },
  });

  await prisma.venueCheckIn.createMany({
    data: [
      {
        venueId: pilotVenue.id,
        venueSessionId: pilotSession.id,
        walletAddress: baseGod.walletAddress.toLowerCase(),
        tag: '@basedarebear',
        dareId: seededVenueDare?.id,
        status: 'CONFIRMED',
        proofLevel: 'QR_AND_GPS',
        source: 'SEEDED_PILOT',
        geoDistanceMeters: 18,
        scannedAt: now,
      },
      {
        venueId: pilotVenue.id,
        venueSessionId: pilotSession.id,
        walletAddress: xqc.walletAddress.toLowerCase(),
        tag: '@launchcheck177372',
        status: 'CONFIRMED',
        proofLevel: 'QR_ONLY',
        source: 'SEEDED_PILOT',
        geoDistanceMeters: 41,
        scannedAt: new Date(now.getTime() - 18 * 60 * 1000),
      },
    ],
  });

  console.log(`✅ Seeded ${SEEDED_PLACES.length} map places with place-memory states`);
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
