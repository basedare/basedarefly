import { NextRequest, NextResponse } from 'next/server';

import {
  assertPublicReceiptContentHash,
  assertPrivacySafePublicValue,
  readPublicReceiptPayload,
} from '@/lib/place-memory/read-model';
import { domainHash } from '@/lib/place-memory/contracts';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ serial: string }> },
) {
  try {
    const { serial } = await params;
    const serialNumber = Number(serial);
    if (!Number.isSafeInteger(serialNumber) || serialNumber < 1) {
      return NextResponse.json({ success: false, error: 'Invalid receipt serial.' }, { status: 400 });
    }
    const receipt = await prisma.placeReceipt.findUnique({
      where: { serialNumber },
      select: {
        serialNumber: true,
        contentHash: true,
        outcome: true,
        issuedAt: true,
        settlementTxHash: true,
        publicPayloadVersion: true,
        publicPayloadJson: true,
      },
    });
    if (!receipt) {
      return NextResponse.json({ success: false, error: 'Place Receipt not found.' }, { status: 404 });
    }
    const payload = readPublicReceiptPayload(receipt.publicPayloadJson);
    assertPublicReceiptContentHash(
      domainHash('basedare:place-receipt:v1', payload),
      receipt.contentHash,
    );
    const data = {
      serialNumber: receipt.serialNumber,
      outcome: receipt.outcome,
      issuedAt: receipt.issuedAt.toISOString(),
      contentHash: receipt.contentHash,
      settlementTxHash: receipt.settlementTxHash,
      publicPayloadVersion: receipt.publicPayloadVersion,
      payload,
    };
    assertPrivacySafePublicValue(data);
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('[PLACE_RECEIPT] Public read failed:', error);
    if (error instanceof Error && error.message === 'Place Receipt content hash mismatch.') {
      return NextResponse.json(
        { success: false, error: 'Receipt integrity check failed.' },
        { status: 503 },
      );
    }
    return NextResponse.json({ success: false, error: 'Unable to load receipt.' }, { status: 500 });
  }
}
