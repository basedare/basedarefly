const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const w = '0xd5764683c464caa1b23e97a2d63b1e46dd59ebfd';
  const existingBrand = await prisma.brand.findUnique({ where: { walletAddress: w } });
  if (!existingBrand) {
      await prisma.brand.create({ data: { walletAddress: w, name: 'BaseDare Test Brand HQ', verified: true } });
  }
  
  console.log('Test wallet upgraded to BRAND status and Brand record created.');
}

main().catch(console.error).finally(() => prisma.$disconnect());
