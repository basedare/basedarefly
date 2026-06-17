import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { bindScoutToVenue, getScoutVenues } from '@/lib/scout-venues';
import { resolveVenueRole } from '@/lib/venue-role';

const SignUpVenueSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Invalid wallet address'),
  venueSlug: z.string().trim().min(1).max(160),
});

// POST /api/scouts/venues — a scout signs up a venue (binds discovery + active rake).
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const parsed = SignUpVenueSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const venue = await prisma.venue.findUnique({
      where: { slug: parsed.data.venueSlug },
      select: { id: true },
    });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    // Anti-squat gate: a scout can only self-claim a venue they have proof-of-
    // presence at (a CONFIRMED QR+GPS check-in → resolveVenueRole !== visitor).
    // QR is venue-bound, rotating, and replay-blocked, so this can't be faked
    // remotely — you must have physically sourced the venue. (The activation-paid
    // path binds server-side via the deal itself and does not use this route.)
    const role = await resolveVenueRole(parsed.data.walletAddress, venue.id);
    if (role.role === 'visitor') {
      return NextResponse.json(
        { success: false, error: 'Check in at this venue (QR + GPS) before claiming it as a scout.' },
        { status: 403 }
      );
    }

    const result = await bindScoutToVenue({
      scoutWalletAddress: parsed.data.walletAddress,
      venueId: venue.id,
    });

    return NextResponse.json({ success: result.bound || result.alreadyDiscovered, data: result }, {
      status: result.bound || result.isYours ? 200 : 409,
    });
  } catch (error) {
    console.error('[SCOUT_VENUES] Sign-up failed:', error);
    return NextResponse.json({ success: false, error: 'Failed to sign up venue' }, { status: 500 });
  }
}

// GET /api/scouts/venues?wallet=0x... — venues a scout holds, with rake rolled up.
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
