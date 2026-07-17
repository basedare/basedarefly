import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';

/**
 * Allocate the next receipt serial. MUST be called inside the same
 * transaction that issues the approved PlaceTag or canonical PlaceReceipt.
 * The migration initializes this shared PostgreSQL sequence strictly above
 * every historical PlaceTag serial. Structured Dare completions allocate once
 * and mirror that value onto their linked Spark; direct Spark approvals also
 * draw from this same allocator.
 */
export async function nextReceiptSerial(tx: Prisma.TransactionClient): Promise<number> {
  const rows = await tx.$queryRaw<Array<{ serial: bigint | number }>>`
    SELECT nextval('"PlaceReceipt_global_serial_seq"') AS serial
  `;
  const serial = Number(rows[0]?.serial);
  if (!Number.isSafeInteger(serial) || serial <= 0 || serial > 2_147_483_647) {
    throw new Error('Receipt serial sequence returned an invalid value.');
  }
  return serial;
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
