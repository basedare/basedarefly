import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// App-unique advisory lock key for receipt serial allocation. The lock is
// transaction-scoped (released automatically at commit/rollback) and
// serializes every allocator across all approval paths, so max+1 can never
// hand out the same serial twice — no retry loops needed.
const RECEIPT_SERIAL_LOCK_KEY = 913824001;

/**
 * Allocate the next receipt serial. MUST be called inside the same
 * transaction that creates or flips the PlaceTag to APPROVED — the serial is
 * an issued fact, and issuing it outside the approving transaction would
 * reopen the gap this module exists to close. The @unique constraint on
 * PlaceTag.serialNumber is the schema-level backstop.
 */
export async function nextReceiptSerial(tx: Prisma.TransactionClient): Promise<number> {
  // ::text cast because the function returns pg `void`, which $queryRaw
  // cannot deserialize.
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(${RECEIPT_SERIAL_LOCK_KEY})::text`;
  const max = await tx.placeTag.aggregate({ _max: { serialNumber: true } });
  return (max._max.serialNumber ?? 0) + 1;
}

/**
 * Run an approval write with a freshly allocated serial in one transaction.
 * For code paths that already run inside a transaction (e.g. dare
 * completion), call nextReceiptSerial(tx) directly instead.
 */
export async function withReceiptSerial<T>(
  run: (serial: number, tx: Prisma.TransactionClient) => Promise<T>
): Promise<T> {
  return prisma.$transaction(async (tx) => run(await nextReceiptSerial(tx), tx));
}
