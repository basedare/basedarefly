const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

function generateShortId(length = 8) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  let result = '';
  for (let i = 0; i < length; i += 1) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function main() {
  const venue = await prisma.venue.findFirst({
    where: {
      OR: [
        { slug: 'hideaway' },
        { name: { contains: 'Hideaway', mode: 'insensitive' } },
      ],
    },
    select: {
      id: true,
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      city: true,
      country: true,
    },
  });

  if (!venue) throw new Error('Hideaway venue not found');

  const wallet = '0x2d4478cee539598b1035ae6ea25b0a2b5e39bff6';

  const brand = await prisma.brand.upsert({
    where: { walletAddress: wallet },
    update: {},
    create: {
      walletAddress: wallet,
      name: 'Acceptance Test Brand',
    },
    select: { id: true, name: true, walletAddress: true },
  });

  const title = 'Acceptance PLACE ' + Date.now();

  const campaign = await prisma.campaign.create({
    data: {
      brandId: brand.id,
      type: 'PLACE',
      tier: 'SIP_SHILL',
      title,
      description: 'Acceptance test campaign',
      budgetUsdc: 128,
      creatorCountTarget: 1,
      payoutPerCreator: 100,
      venueId: venue.id,
      targetingCriteria: '{}',
      verificationCriteria: JSON.stringify({ hashtagsRequired: ['#basedare'], minDurationSeconds: 15 }),
      windowHours: 24,
      strikeWindowMinutes: 0,
      precisionMultiplier: 1,
      rakePercent: 28,
      status: 'LIVE',
      fundedAt: new Date(),
      liveAt: new Date(),
      slots: { create: [{ status: 'OPEN' }] },
    },
    include: { slots: true },
  });

  const dare = await prisma.dare.create({
    data: {
      title,
      missionMode: 'IRL',
      tag: 'brand-campaign',
      bounty: 100,
      streamerHandle: null,
      status: 'PENDING',
      streamId: 'campaign:' + campaign.id,
      txHash: null,
      isSimulated: true,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      shortId: generateShortId(),
      stakerAddress: wallet,
      venueId: venue.id,
      isNearbyDare: true,
      latitude: venue.latitude,
      longitude: venue.longitude,
      geohash: null,
      locationLabel: venue.name,
      discoveryRadiusKm: 0.5,
    },
  });

  const linkedCampaign = await prisma.campaign.update({
    where: { id: campaign.id },
    data: { linkedDareId: dare.id },
    include: {
      brand: { select: { name: true } },
      venue: { select: { slug: true, name: true } },
      linkedDare: { select: { id: true, shortId: true, status: true, venueId: true, title: true } },
      slots: { select: { id: true, status: true } },
    },
  });

  const venueDetail = await prisma.venue.findUnique({
    where: { id: venue.id },
    select: {
      slug: true,
      name: true,
      dares: {
        where: {
          NOT: {
            OR: [
              { status: { in: ['EXPIRED', 'FAILED', 'VERIFIED'] } },
              { expiresAt: { lt: new Date() } },
            ],
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 6,
        select: {
          id: true,
          title: true,
          bounty: true,
          status: true,
          linkedCampaign: {
            select: {
              title: true,
              brand: { select: { name: true } },
            },
          },
        },
      },
    },
  });

  console.log(JSON.stringify({ brand, venue, linkedCampaign, dare, venueDetail }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
