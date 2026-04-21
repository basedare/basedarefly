import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  getVenueReportPipelineSummary,
  recordVenueReportEvent,
  recordVenueReportLead,
} from '@/lib/venue-report-pipeline';

const EventSchema = z.object({
  type: z.literal('event'),
  audience: z.enum(['venue', 'sponsor']).default('venue'),
  eventType: z.enum([
    'OPEN',
    'SHARE',
    'COPY_BRIEF',
    'COPY_LINK',
    'EMAIL_BRIEF',
    'CLAIM_STARTED',
    'ACTIVATION_LAUNCHED',
    'REPEAT_LAUNCHED',
  ]),
  sessionKey: z.string().min(6).max(200).optional().nullable(),
  channel: z.string().max(80).optional().nullable(),
});

const HandoffSchema = z.object({
  type: z.literal('handoff'),
  audience: z.enum(['venue', 'sponsor']).default('venue'),
  sessionKey: z.string().min(6).max(200).optional().nullable(),
  intent: z.enum(['claim', 'activation', 'repeat']).optional().nullable(),
  email: z.string().email(),
  name: z.string().max(120).optional().nullable(),
  organization: z.string().max(160).optional().nullable(),
  notes: z.string().max(4000).optional().nullable(),
});

const PayloadSchema = z.discriminatedUnion('type', [EventSchema, HandoffSchema]);

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!venue) {
    return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
  }

  const pipeline = await getVenueReportPipelineSummary(venue.id);
  return NextResponse.json({ success: true, data: pipeline });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: { id: true, slug: true },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const parsed = PayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid report payload' }, { status: 400 });
    }

    if (parsed.data.type === 'event') {
      await recordVenueReportEvent({
        venueId: venue.id,
        audience: parsed.data.audience,
        eventType: parsed.data.eventType,
        sessionKey: parsed.data.sessionKey,
        channel: parsed.data.channel,
      });
    } else {
      await recordVenueReportLead({
        venueId: venue.id,
        audience: parsed.data.audience,
        sessionKey: parsed.data.sessionKey,
        intent: parsed.data.intent ?? null,
        email: parsed.data.email,
        name: parsed.data.name ?? null,
        organization: parsed.data.organization ?? null,
        notes: parsed.data.notes ?? null,
      });
    }

    const pipeline = await getVenueReportPipelineSummary(venue.id);
    return NextResponse.json({ success: true, data: pipeline });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_REPORT] Request failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update venue report pipeline' }, { status: 500 });
  }
}
