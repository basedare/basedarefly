import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import {
  getVenueRoomSnapshot,
  postVenueRoomMessage,
} from '@/lib/venue-room';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const RoomQuerySchema = z.object({
  walletAddress: z.string().optional(),
  lat: z.coerce.number().min(-90).max(90).optional(),
  lng: z.coerce.number().min(-180).max(180).optional(),
  limit: z.coerce.number().min(1).max(40).default(20),
});

const RoomPostSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid walletAddress is required'),
  body: z.string().min(1, 'Message is required').max(280, 'Message is too long'),
  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),
  showInWhoHere: z.boolean().default(false),
});

function getRoomAuthResource(slug: string) {
  return `venue:${slug}:room`;
}

async function getAuthorizedRoomWallet(
  request: NextRequest,
  slug: string,
  walletAddress: string | null | undefined,
  action: 'venue-room:read' | 'venue-room:post'
) {
  if (!walletAddress || !isAddress(walletAddress)) return null;

  return getAuthorizedWalletForRequest(request, {
    walletAddress,
    action,
    resource: getRoomAuthResource(slug),
  });
}

function queryValue(searchParams: URLSearchParams, key: string) {
  return searchParams.has(key) ? searchParams.get(key) ?? undefined : undefined;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = RoomQuerySchema.safeParse({
      walletAddress: queryValue(searchParams, 'walletAddress'),
      lat: queryValue(searchParams, 'lat'),
      lng: queryValue(searchParams, 'lng'),
      limit: queryValue(searchParams, 'limit'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Invalid room query',
        },
        { status: 400 }
      );
    }

    const authorizedWallet = await getAuthorizedRoomWallet(
      request,
      slug,
      parsed.data.walletAddress,
      'venue-room:read'
    );
    const snapshot = await getVenueRoomSnapshot({
      slug,
      walletAddress: authorizedWallet,
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      limit: parsed.data.limit,
    });

    if (!snapshot) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_ROOM] Snapshot failed:', message);
    return NextResponse.json(
      { success: false, error: 'Unable to load venue room right now' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const parsed = RoomPostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid room message' },
        { status: 400 }
      );
    }

    const walletAddress = await getAuthorizedWalletForRequest(request, {
      walletAddress: parsed.data.walletAddress,
      action: 'venue-room:post',
      resource: getRoomAuthResource(slug),
    });

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet authorization required to post in this room' },
        { status: 401 }
      );
    }

    const snapshot = await postVenueRoomMessage({
      slug,
      walletAddress,
      body: parsed.data.body,
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      showInWhoHere: parsed.data.showInWhoHere,
    });

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const locked = error instanceof Error && error.name === 'ROOM_LOCKED';
    console.error('[VENUE_ROOM] Post failed:', message);
    return NextResponse.json(
      { success: false, error: locked ? message : 'Unable to post in this venue room right now' },
      { status: locked ? 403 : 500 }
    );
  }
}
