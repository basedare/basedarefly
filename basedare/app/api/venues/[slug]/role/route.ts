import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { resolveVenueRole, VENUE_ROLE_CONFIG } from '@/lib/venue-role';

/**
 * GET /api/venues/[slug]/role?wallet=0x...
 *
 * Read-only host-eligibility check (claim-by-presence). Derives the wallet's
 * venue role from signals it already has (check-ins + Signal Points + approved
 * marks + claim status) via resolveVenueRole. Powers the venue-page host panel.
 * No wallet / invalid wallet → visitor (fails closed).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const venue = await prisma.venue.findUnique({ where: { slug }, select: { id: true } });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const wallet = request.nextUrl.searchParams.get('wallet');
    if (!wallet || !isAddress(wallet)) {
      return NextResponse.json({
        success: true,
        data: { role: 'visitor', canHost: false, canManageVenue: false, provisional: false, venueHasOwner: false },
      });
    }

    const result = await resolveVenueRole(wallet, venue.id);
    const canHost = result.role === 'provisional_host' || result.role === 'verified_owner';

    return NextResponse.json({
      success: true,
      data: {
        role: result.role,
        isOwner: result.isOwner,
        venueHasOwner: result.venueHasOwner,
        canHost,
        canManageVenue: result.role === 'verified_owner',
        provisional: result.role === 'provisional_host',
        onSiteNow: result.signals.onSiteNow,
        reputationGatePassed: result.signals.reputationGatePassed,
        signals: result.signals,
        onSiteWindowMinutes: Math.round(VENUE_ROLE_CONFIG.onSiteWindowMs / 60000),
      },
    });
  } catch (error) {
    console.error('[VENUE_ROLE] Resolve failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to resolve venue role' }, { status: 500 });
  }
}
