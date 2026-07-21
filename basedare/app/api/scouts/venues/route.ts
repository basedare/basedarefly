import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { getScoutVenues } from '@/lib/scout-venues';

// Public self-signup is deliberately paused. Venue sourcing can only be attached
// to an explicitly approved acquisition agreement; it never creates automatic
// commission from a managed Sprint invoice (docs/FINANCIAL_CANON.md).
export async function POST() {
  return NextResponse.json(
    {
      success: false,
      error: 'Public venue scouting is not active. Apply as a Local Partner for authorized introductions or field support.',
    },
    { status: 410 },
  );
}

// GET /api/scouts/venues?wallet=0x... — historical sourcing attribution only.
export async function GET(request: NextRequest) {
  try {
    const wallet = request.nextUrl.searchParams.get('wallet');
    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({ success: false, error: 'Valid wallet query param required' }, { status: 400 });
    }

    const scout = await prisma.scout.findUnique({
      where: { walletAddress: wallet.toLowerCase() },
      select: { id: true },
    });
    if (!scout) {
      return NextResponse.json({ success: true, data: { venues: [] } });
    }

    const venues = await getScoutVenues(scout.id);
    return NextResponse.json({ success: true, data: { venues } });
  } catch (error) {
    console.error('[SCOUT_VENUES] List failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to load scout venues' }, { status: 500 });
  }
}
