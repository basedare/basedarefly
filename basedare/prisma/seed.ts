import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
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
      title: 'Eat a Ghost Pepper',
      bounty: 50000.0,
      streamerHandle: 'xQc',
      status: 'PENDING' as const,
      creatorId: baseGod.id,
    },
    {
      title: '24 Hour Silent Stream',
      bounty: 25000.0,
      streamerHandle: 'Speed',
      status: 'VERIFIED' as const,
      creatorId: baseGod.id,
    },
    {
      title: 'Call Your Ex Live',
      bounty: 100000.0,
      streamerHandle: 'xQc',
      status: 'PENDING' as const,
      creatorId: speed.id,
    },
    {
      title: 'Dance in Public',
      bounty: 15000.0,
      streamerHandle: 'Speed',
      status: 'VERIFIED' as const,
      creatorId: xqc.id,
    },
    {
      title: 'Read Fan Mail Aloud',
      bounty: 30000.0,
      streamerHandle: 'BaseGod',
      status: 'PENDING' as const,
      creatorId: xqc.id,
    },
  ];

  for (const dare of dareData) {
    try {
      await prisma.dare.create({ data: dare });
    } catch (error: any) {
      // Skip if already exists
      if (!error.message?.includes('Unique constraint')) {
        console.warn(`Failed to create dare: ${dare.title}`, error.message);
      }
    }
  }

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

