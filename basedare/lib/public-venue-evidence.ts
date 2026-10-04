import { cache } from 'react';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Known historical fixtures remain in storage for audit, never public proof.
export const publicVenueDareWhere: Prisma.DareWhereInput = {
  AND: [
    { isSimulated: false },
    { NOT: { id: { startsWith: 'seed-' } } },
    { NOT: { title: { in: ['Phase5 test dare', 'Phase5 telegram test dare'] } } },
    { OR: [
      { bounty: { lte: 0 } },
      { AND: [{ txHash: { not: null } }, { txHash: { not: '' } },
        { onChainDareId: { not: null } }, { onChainDareId: { notIn: ['', '0'] } }] },
    ] },
  ],
};

/** PlaceTag has no FK to Dare, so filter linked legacy/test records explicitly. */
export const getPublicVenueTagWhere = cache(async (): Promise<Prisma.PlaceTagWhereInput> => {
  const hidden = await prisma.dare.findMany({
    where: { NOT: publicVenueDareWhere }, select: { id: true },
  });
  return { AND: [
    { source: { not: 'SEEDED_MEMORY' } },
    { OR: [{ proofHash: null }, { NOT: { proofHash: { startsWith: 'seeded:' } } }] },
    { OR: [{ linkedDareId: null }, { linkedDareId: { notIn: hidden.map(row => row.id) } }] },
  ] };
});

