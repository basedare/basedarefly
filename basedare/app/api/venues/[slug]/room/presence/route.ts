import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { setVenueRoomPresence } from '@/lib/venue-room';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RoomPresenceSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid walletAddress is required'),
  visible: z.boolean(),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
});

function getRoomPresenceAuthResource(slug: string) {
  return `venue:${slug}:room`;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = RoomPresenceSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid room visibility' },
        { status: 400 }
      );
    }

    const walletAddress = await getAuthorizedWalletForRequest(request, {
      walletAddress: parsed.data.walletAddress,
      action: 'venue-room:presence',
      resource: getRoomPresenceAuthResource(slug),
    });

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet authorization required to update room visibility' },
        { status: 401 }
      );
    }

    const snapshot = await setVenueRoomPresence({
      slug,
      walletAddress,
      visible: parsed.data.visible,
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
    });

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const locked = error instanceof Error && error.name === 'ROOM_LOCKED';
    console.error('[VENUE_ROOM] Presence failed:', message);
    return NextResponse.json(
      { success: false, error: locked ? message : 'Unable to update room visibility right now' },
      { status: locked ? 403 : 500 }
    );
  }
}
