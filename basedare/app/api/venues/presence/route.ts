import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';
import {
  createVenuePresenceSignal,
  getActiveVenuePresence,
  VENUE_PRESENCE_VISIBILITIES,
} from '@/lib/venue-presence';

const PresenceQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().min(0.5).max(25).default(8),
  limit: z.coerce.number().min(1).max(50).default(30),
});

const PresencePostSchema = z.object({
  venueId: z.string().min(1),
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid walletAddress is required'),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  durationMinutes: z.number().min(30).max(120).default(60),
  visibility: z.enum(VENUE_PRESENCE_VISIBILITIES).default('NEARBY'),
  tag: z.string().trim().max(40).optional(),
});

function getPresenceAuthResource(venueId: string) {
  return `venue:${venueId}:presence`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = PresenceQuerySchema.safeParse({
      lat: searchParams.get('lat'),
      lng: searchParams.get('lng'),
      radiusKm: searchParams.get('radiusKm'),
      limit: searchParams.get('limit'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid query parameters',
          details: parsed.error.issues.map((issue) => ({
            field: issue.path.join('.'),
            message: issue.message,
          })),
        },
        { status: 400 }
      );
    }

    const signals = await getActiveVenuePresence({
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      radiusKm: parsed.data.radiusKm,
      limit: parsed.data.limit,
    });

    return NextResponse.json({
      success: true,
      data: {
        signals,
        count: signals.length,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_PRESENCE] Query failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch venue presence' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = PresencePostSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: parsed.error.issues[0]?.message ?? 'Invalid request body',
        },
        { status: 400 }
      );
    }

    const walletAddress = await getAuthorizedWalletForRequest(request, {
      walletAddress: parsed.data.walletAddress,
      action: 'venue-presence',
      resource: getPresenceAuthResource(parsed.data.venueId),
    });

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet authorization required to signal presence' },
        { status: 401 }
      );
    }

    const signal = await createVenuePresenceSignal({
      venueId: parsed.data.venueId,
      walletAddress,
      latitude: parsed.data.lat,
      longitude: parsed.data.lng,
      durationMinutes: parsed.data.durationMinutes,
      visibility: parsed.data.visibility,
      tag: parsed.data.tag,
    });

    return NextResponse.json({
      success: true,
      data: signal,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    const status = error instanceof Error && error.name === 'OUT_OF_RANGE' ? 403 : 500;
    console.error('[VENUE_PRESENCE] Signal failed:', message);
    return NextResponse.json(
      {
        success: false,
        error: status === 403 ? message : 'Unable to signal presence right now',
      },
      { status }
    );
  }
}
