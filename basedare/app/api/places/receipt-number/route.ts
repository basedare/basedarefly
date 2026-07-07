import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { withReceiptSerial } from '@/lib/receipt-serial';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * The receipt serial: a stored fact issued once in the approving transaction
 * (PlaceTag.serialNumber, globally unique). Receipt #42 is #42 forever — the
 * number never shifts when older proofs are approved later, and ties on
 * submittedAt can't collide. Legacy approved rows that predate the serial
 * column self-heal here with the next issuance-order serial.
 */
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const tagId = url.searchParams.get('tagId')?.trim();
    if (!tagId || tagId.length > 60) {
      return NextResponse.json({ success: false, error: 'tagId required' }, { status: 400 });
    }

    const tag = await prisma.placeTag.findUnique({
      where: { id: tagId },
      select: { id: true, status: true, serialNumber: true },
    });
    if (!tag || tag.status !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'No approved proof for that id' }, { status: 404 });
    }

    let number = tag.serialNumber;
    if (number == null) {
      // updateMany + serialNumber:null guard makes concurrent heals safe: only
      // one request wins the write, everyone re-reads the issued value. The
      // status guard re-checks APPROVED inside the transaction so a tag
      // rejected between the read above and this write never gets a serial.
      await withReceiptSerial((serial, tx) =>
        tx.placeTag.updateMany({
          where: { id: tag.id, status: 'APPROVED', serialNumber: null },
          data: { serialNumber: serial },
        })
      );
      const healed = await prisma.placeTag.findUnique({
        where: { id: tag.id },
        select: { serialNumber: true },
      });
      number = healed?.serialNumber ?? null;
    }

    if (number == null) {
      return NextResponse.json({ success: false, error: 'Failed to number the receipt' }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { number } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RECEIPT_NUMBER] GET failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to number the receipt' }, { status: 500 });
  }
}
