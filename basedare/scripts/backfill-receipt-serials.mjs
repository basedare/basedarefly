// Backfill PlaceTag.serialNumber for APPROVED proofs that predate the column.
//
//   node --env-file=.env scripts/backfill-receipt-serials.mjs
//
// Ordering: submittedAt ASC, id ASC — the historical set gets chronological
// serials. Idempotent: only rows with serialNumber IS NULL are touched, and
// re-runs continue from the current max (stragglers approved by old code
// between backfill and deploy get end-of-sequence serials, matching the
// issuance-order rule new approvals follow). Ends with invariant checks.
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const RECEIPT_SERIAL_LOCK_KEY = 913824001;

async function main() {
  const assigned = await prisma.$transaction(
    async (tx) => {
      // ::text cast because the function returns pg `void`, which $queryRaw
      // cannot deserialize.
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(${RECEIPT_SERIAL_LOCK_KEY})::text`;

      const max = (await tx.placeTag.aggregate({ _max: { serialNumber: true } }))._max.serialNumber ?? 0;
      const rows = await tx.placeTag.findMany({
        where: { status: 'APPROVED', serialNumber: null },
        orderBy: [{ submittedAt: 'asc' }, { id: 'asc' }],
        select: { id: true },
      });

      let serial = max;
      for (const row of rows) {
        serial += 1;
        await tx.placeTag.update({ where: { id: row.id }, data: { serialNumber: serial } });
      }

      return { count: rows.length, from: max + 1, to: serial };
    },
    { timeout: 120_000 }
  );

  if (assigned.count === 0) {
    console.log('Backfill: nothing to do — every APPROVED proof already has a serial.');
  } else {
    console.log(`Backfill: assigned ${assigned.count} serials (#${assigned.from}..#${assigned.to}).`);
  }

  // Invariant checks — all four must hold or the fix is not done.
  const approved = await prisma.placeTag.count({ where: { status: 'APPROVED' } });
  const withSerial = await prisma.placeTag.count({ where: { status: 'APPROVED', serialNumber: { not: null } } });
  const nonApprovedWithSerial = await prisma.placeTag.count({
    where: { status: { not: 'APPROVED' }, serialNumber: { not: null } },
  });
  const [gapCheck] = await prisma.$queryRaw`
    SELECT COUNT(*)::int AS holders,
           COALESCE(MIN("serialNumber"), 0)::int AS min,
           COALESCE(MAX("serialNumber"), 0)::int AS max,
           COUNT(DISTINCT "serialNumber")::int AS distinct
    FROM "PlaceTag" WHERE "serialNumber" IS NOT NULL
  `;
  const ties = await prisma.$queryRaw`
    SELECT "submittedAt", COUNT(*)::int AS n, COUNT(DISTINCT "serialNumber")::int AS distinct
    FROM "PlaceTag" WHERE status = 'APPROVED'
    GROUP BY "submittedAt" HAVING COUNT(*) > 1
  `;
  const tieCollisions = ties.filter((t) => t.n !== t.distinct);

  console.log('--- invariants ---');
  console.log(`approved=${approved} withSerial=${withSerial} missing=${approved - withSerial}`);
  console.log(`serial holders=${gapCheck.holders} distinct=${gapCheck.distinct} range=${gapCheck.min}..${gapCheck.max}`);
  console.log(`submittedAt ties sharing a timestamp: ${ties.length} group(s), collisions: ${tieCollisions.length}`);

  // A serial on a non-approved row is a hard failure on the initial backfill
  // (fresh sequence — nothing could have issued one legitimately, so it means
  // an assignment bug). On later re-runs it is only a warning: a serial is an
  // immutable issued fact and intentionally survives a later reject/flag.
  const isInitialBackfill = assigned.count > 0 && assigned.from === 1;
  if (nonApprovedWithSerial > 0) {
    console.log(
      `${isInitialBackfill ? 'FAILURE' : 'WARNING'}: ${nonApprovedWithSerial} non-approved row(s) hold a serial` +
        (isInitialBackfill ? '' : ' (expected if a serialed receipt was later rejected/flagged)')
    );
  }

  const ok =
    approved === withSerial &&
    gapCheck.holders === gapCheck.distinct &&
    (gapCheck.holders === 0 || (gapCheck.min === 1 && gapCheck.max === gapCheck.holders)) &&
    tieCollisions.length === 0 &&
    (nonApprovedWithSerial === 0 || !isInitialBackfill);
  console.log(ok ? 'ALL INVARIANTS PASS' : 'INVARIANT FAILURE — inspect before deploying');
  process.exitCode = ok ? 0 : 1;
}

main()
  .catch((error) => {
    console.error('Backfill failed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
