import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyInternalApiKey } from '@/lib/api-auth';
import {
  createVenueSessionKey,
  getActiveVenueSessionByVenueId,
  getVenueById,
  getVenueQrPayloadByVenueId,
} from '@/lib/venues';
import { prisma } from '@/lib/prisma';

const VenueConsoleActionSchema = z.object({
  action: z.enum(['start', 'pause', 'resume', 'refresh']).default('refresh'),
  label: z.string().trim().max(80).optional(),
  campaignLabel: z.string().trim().max(120).optional(),
  rotationSeconds: z.number().int().min(15).max(180).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authError = verifyInternalApiKey(request);
  if (authError) return authError;

  try {
    const { id } = await params;
    const venue = await getVenueById(id);
    if (!venue) {
      return NextResponse.json(
        { success: false, error: 'Venue not found' },
        { status: 404 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const parsed = VenueConsoleActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request body' },
        { status: 400 }
      );
    }

    const now = new Date();
    let session = await getActiveVenueSessionByVenueId(venue.id);

    if (!session) {
      session = await prisma.venueQrSession.create({
        data: {
          venueId: venue.id,
          sessionKey: createVenueSessionKey(),
          scope: 'VENUE_CHECKIN',
          status: 'LIVE',
          label: parsed.data.label ?? `${venue.name} console`,
          campaignLabel: parsed.data.campaignLabel ?? 'Venue check-in live',
          rotationSeconds: parsed.data.rotationSeconds ?? venue.qrRotationSeconds,
          startedAt: now,
          lastRotatedAt: now,
        },
      });
    } else {
      const nextStatus =
        parsed.data.action === 'pause'
          ? 'PAUSED'
          : 'LIVE';

      session = await prisma.venueQrSession.update({
        where: { id: session.id },
        data: {
          status: nextStatus,
          label: parsed.data.label ?? session.label,
          campaignLabel: parsed.data.campaignLabel ?? session.campaignLabel,
          rotationSeconds: parsed.data.rotationSeconds ?? session.rotationSeconds,
          pausedAt: parsed.data.action === 'pause' ? now : null,
          lastRotatedAt:
            parsed.data.action === 'refresh' ||
            parsed.data.action === 'resume' ||
            parsed.data.action === 'start'
              ? now
              : session.lastRotatedAt,
          startedAt:
            parsed.data.action === 'start'
              ? now
              : session.startedAt,
        },
      });
    }

    const qr = await getVenueQrPayloadByVenueId(venue.id);

    return NextResponse.json({
      success: true,
      data: {
        venueId: venue.id,
        session: {
          id: session.id,
          status: session.status,
          label: session.label,
          campaignLabel: session.campaignLabel,
          rotationSeconds: session.rotationSeconds,
          startedAt: session.startedAt.toISOString(),
          pausedAt: session.pausedAt?.toISOString() ?? null,
          lastRotatedAt: session.lastRotatedAt.toISOString(),
          lastCheckInAt: session.lastCheckInAt?.toISOString() ?? null,
        },
        qr,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_CONSOLE_SESSION] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Unable to update venue console session right now' },
      { status: 500 }
    );
  }
}
