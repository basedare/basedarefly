import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getViewerWallet } from '@/lib/meetups-server';
import { listCrossedPathsAtVenue } from '@/lib/crossed-paths';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * Who the signed-in viewer verifiably crossed paths with at this venue.
 * Cookie-session read: signed-out viewers get an empty list, never an error,
 * so the map panel stays silent instead of nagging.
 */
export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const viewer = await getViewerWallet();
    if (!viewer) {
      return NextResponse.json({ success: true, data: { count: 0, people: [] } });
    }

    const venue = await prisma.venue.findUnique({ where: { slug }, select: { id: true } });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const people = await listCrossedPathsAtVenue(viewer, venue.id, 12);
    return NextResponse.json({ success: true, data: { count: people.length, people } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CROSSED_PATHS] GET failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load crossed paths' }, { status: 500 });
  }
}
