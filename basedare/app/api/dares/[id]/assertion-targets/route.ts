import { NextRequest, NextResponse } from 'next/server';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const dare = await prisma.dare.findUnique({
      where: { id },
      select: {
        id: true,
        venueId: true,
        assertionTargets: {
          orderBy: [{ position: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            kind: true,
            subjectKey: true,
            valueSchemaVersion: true,
            required: true,
            position: true,
            displayConfigJson: true,
          },
        },
      },
    });
    if (!dare) {
      return NextResponse.json({ success: false, error: 'Dare not found.' }, { status: 404 });
    }
    if (dare.assertionTargets.length > 0 && !dare.venueId) {
      console.error('[PLACE_MEMORY_TARGETS] Structured Dare has no canonical venue:', id);
      return NextResponse.json(
        { success: false, error: 'This mission is not configured safely yet.' },
        { status: 503 },
      );
    }
    return NextResponse.json({
      success: true,
      data: { dareId: dare.id, structured: dare.assertionTargets.length > 0, targets: dare.assertionTargets },
    });
  } catch (error) {
    console.error('[PLACE_MEMORY_TARGETS] Public read failed:', error);
    return NextResponse.json(
      { success: false, error: 'Unable to load mission questions.' },
      { status: 500 },
    );
  }
}
