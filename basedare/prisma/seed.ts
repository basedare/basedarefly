import { PrismaClient } from '@prisma/client';
import { encodeGeohash } from '../lib/geo';

const prisma = new PrismaClient();

async function main() {
  const pilotVenueLat = 9.7848;
  const pilotVenueLng = 126.1632;
  const pilotVenueGeohash = encodeGeohash(pilotVenueLat, pilotVenueLng, 6);
  const now = new Date();
  const dayStart = new Date(now);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const pilotVenue = await prisma.venue.upsert({
    where: { slug: 'siargao-beach-club' },
    update: {
      name: 'Siargao Beach Club',
      description: 'A seeded nightlife pilot venue for BaseDare venue-memory and QR-console testing in General Luna.',
      address: 'Tourism Road, Purok 3',
      city: 'General Luna',
      country: 'Philippines',
      latitude: pilotVenueLat,
      longitude: pilotVenueLng,
      geohash: pilotVenueGeohash,
      timezone: 'Asia/Manila',
      categories: ['nightlife', 'music', 'pilot'],
      status: 'ACTIVE',
      isPartner: true,
      partnerTier: 'PILOT',
      placeSource: 'seed',
      externalPlaceId: 'siargao-beach-club',
      qrMode: 'ROTATING',
      qrRotationSeconds: 45,
      checkInRadiusMeters: 120,
      metadataJson: {
        district: 'Purok 3',
        pilot: true,
        vibe: 'late-night creator playground',
        locationConfidence: 'approximate-seed',
      },
    },
    create: {
      slug: 'siargao-beach-club',
      name: 'Siargao Beach Club',
      description: 'A seeded nightlife pilot venue for BaseDare venue-memory and QR-console testing in General Luna.',
      address: 'Tourism Road, Purok 3',
      city: 'General Luna',
      country: 'Philippines',
      latitude: pilotVenueLat,
      longitude: pilotVenueLng,
      geohash: pilotVenueGeohash,
      timezone: 'Asia/Manila',
      categories: ['nightlife', 'music', 'pilot'],
      status: 'ACTIVE',
      isPartner: true,
      partnerTier: 'PILOT',
      placeSource: 'seed',
      externalPlaceId: 'siargao-beach-club',
      qrMode: 'ROTATING',
      qrRotationSeconds: 45,
      checkInRadiusMeters: 120,
      metadataJson: {
        district: 'Purok 3',
        pilot: true,
        vibe: 'late-night creator playground',
        locationConfidence: 'approximate-seed',
      },
    },
  });

  const pilotSession = await prisma.venueQrSession.upsert({
    where: { sessionKey: 'siargao-beach-club-live' },
    update: {
      venueId: pilotVenue.id,
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
      venueId: pilotVenue.id,
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

  await prisma.venueMemory.upsert({
    where: {
      venueId_bucketType_bucketStartAt: {
        venueId: pilotVenue.id,
        bucketType: 'DAY',
        bucketStartAt: dayStart,
      },
    },
    update: {
      bucketEndAt: dayEnd,
      checkInCount: 12,
      uniqueVisitorCount: 8,
      dareCount: 3,
      completedDareCount: 1,
      proofCount: 4,
      perkRedemptionCount: 0,
      topCreatorTag: '@basedarebear',
      metadataJson: {
        seeded: true,
        mood: 'warm island afterparty energy',
      },
    },
    create: {
      venueId: pilotVenue.id,
      bucketType: 'DAY',
      bucketStartAt: dayStart,
      bucketEndAt: dayEnd,
      checkInCount: 12,
      uniqueVisitorCount: 8,
      dareCount: 3,
      completedDareCount: 1,
      proofCount: 4,
      perkRedemptionCount: 0,
      topCreatorTag: '@basedarebear',
      metadataJson: {
        seeded: true,
        mood: 'warm island afterparty energy',
      },
    },
  });

  // Create users
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

  // Create dares individually to handle duplicates gracefully
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
      latitude: pilotVenueLat,
      longitude: pilotVenueLng,
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
        scannedAt: new Date(now.getTime() - 1000 * 60 * 18),
      },
    ],
  });

  console.log('✅ Seed data created successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
