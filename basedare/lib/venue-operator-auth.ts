import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { prisma } from '@/lib/prisma';

/** QR display is an operator capability, never a public discovery resource. */
export async function authorizeVenueOperator(request: NextRequest, venueId: string) {
  if (isInternalApiAuthorized(request)) return null;
  const session = await getServerSession(authOptions) as {
    token?: string; walletAddress?: string; user?: { walletAddress?: string };
  } | null;
  const wallet = (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
  if (!/^0x[0-9a-f]{40}$/.test(wallet)) {
    return NextResponse.json({ success: false, error: 'Sign in to manage this venue.' }, { status: 401 });
  }
  if (request.method !== 'GET' && (!session?.token || request.headers.get('authorization') !== `Bearer ${session.token}`)) {
    return NextResponse.json({ success: false, error: 'Refresh your session and try again.' }, { status: 401 });
  }
  const venue = await prisma.venue.findUnique({ where: { id: venueId }, select: { claimedBy: true } });
  if (!venue?.claimedBy || venue.claimedBy.toLowerCase() !== wallet) {
    return NextResponse.json({ success: false, error: 'Only the approved venue operator can display this QR.' }, { status: 403 });
  }
  return null;
}
