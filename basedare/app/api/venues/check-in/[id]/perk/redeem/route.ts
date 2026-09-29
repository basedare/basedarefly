import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { recordFounderEventSafe } from '@/lib/founder-events';
import { prisma } from '@/lib/prisma';
import { redeemVenuePerk, PerkRedemptionError } from '@/lib/venue-perk-redemption';

type PerkSession = { token?: string; walletAddress?: string | null; user?: { walletAddress?: string | null } | null };

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const internal = isInternalApiAuthorized(request);
    const session = await getServerSession(authOptions) as PerkSession | null;
    if (!session && !internal) return NextResponse.json({ success: false, error: 'Sign in required to redeem venue perks' }, { status: 401 });
    const token = session?.token?.trim();
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!internal && token && bearer !== token) return NextResponse.json({ success: false, error: 'Invalid session token' }, { status: 401 });
    const wallet = (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
    const { id } = await params;
    const result = await redeemVenuePerk(prisma, id, { internal, wallet });
    if (result.redeemedNow) await recordFounderEventSafe({
      eventType: 'venue_check_in', source: 'venue-perk-redeem', subjectType: 'VenueCheckIn', subjectId: id,
      dedupeKey: `venue-perk-redeemed-${id}`, title: result.venue.name, status: 'REDEEMED', actor: internal ? 'internal' : wallet,
      href: `/venues/${result.venue.slug}/console`, venueId: result.venue.id, venueSlug: result.venue.slug,
      metadata: { perkTitle: result.perk.title, redemptionCode: result.perk.redemptionCode }, occurredAt: new Date(result.perk.redeemedAt!),
    });
    return NextResponse.json({ success: true, data: { perk: result.perk, redeemedNow: result.redeemedNow } });
  } catch (error) {
    if (error instanceof PerkRedemptionError) return NextResponse.json({ success: false, error: error.message }, { status: error.status });
    console.error('[VENUE_PERK_REDEEM] Failed:', error instanceof Error ? error.message : 'Unknown error');
    return NextResponse.json({ success: false, error: 'Failed to redeem venue perk' }, { status: 500 });
  }
}
