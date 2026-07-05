import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * The receipt serial: this proof's position in the global sequence of
 * APPROVED proofs (count of approved proofs submitted at-or-before it).
 * Deterministic and replayable — receipt #42 is #42 forever. Public read of
 * a count; no auth surface.
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
      select: { id: true, status: true, submittedAt: true },
    });
    if (!tag || tag.status !== 'APPROVED') {
      return NextResponse.json({ success: false, error: 'No approved proof for that id' }, { status: 404 });
    }

    const number = await prisma.placeTag.count({
      where: { status: 'APPROVED', submittedAt: { lte: tag.submittedAt } },
    });

    return NextResponse.json({ success: true, data: { number } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[RECEIPT_NUMBER] GET failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to number the receipt' }, { status: 500 });
  }
}
