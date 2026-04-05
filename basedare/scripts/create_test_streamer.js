const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const wallet = '0x1111111111111111111111111111111111111111';
  let user = await prisma.user.findUnique({ where: { walletAddress: wallet } });
  if (!user) user = await prisma.user.create({ data: { walletAddress: wallet, baseTag: '@smokeTest' } });
  
  let streamer = await prisma.streamerTag.findUnique({ where: { tag: '@smokeTest' } });
  if (!streamer) {
    streamer = await prisma.streamerTag.create({
      data: { tag: '@smokeTest', walletAddress: wallet, status: 'VERIFIED', followerCount: 1000, verificationMethod: 'MANUAL' }
    });
  } else {
    streamer = await prisma.streamerTag.update({ where: { tag: '@smokeTest' }, data: { status: 'VERIFIED' } });
  }
  console.log('Streamer prepared:', streamer.tag, streamer.id);
}

main().catch(console.error).finally(() => prisma.$disconnect());
