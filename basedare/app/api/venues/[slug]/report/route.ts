import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  getVenueReportPipelineSummary,
  recordVenueDecisionResponse,
  recordVenueReportEvent,
  recordVenueReportLead,
} from '@/lib/venue-report-pipeline';
import {
  FIRST_NODE_RESPONSE_TYPES,
  FIRST_NODE_TERMS_VERSION,
} from '@/lib/first-node-conversion';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';

const EventSchema = z.object({
  type: z.literal('event'),
  audience: z.enum(['venue', 'sponsor']).default('venue'),
  eventType: z.enum([
    'OPEN',
    'SHARE',
    'COPY_BRIEF',
    'COPY_LINK',
    'EMAIL_BRIEF',
    'WHATSAPP_BRIEF',
    'INSTAGRAM_BRIEF',
    'PRINT_HANDOFF',
    'QR_HANDOFF',
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

const DecisionResponseSchema = z.object({
  type: z.literal('decision-response'),
  audience: z.enum(['venue', 'sponsor']).default('venue'),
  requestId: z.string().uuid(),
  responseType: z.enum(FIRST_NODE_RESPONSE_TYPES),
  sessionKey: z.string().min(6).max(200).optional().nullable(),
  responderRole: z.string().max(100).optional().nullable(),
  authority: z.string().max(80).optional().nullable(),
  channel: z.string().max(80).optional().nullable(),
  contactName: z.string().max(120).optional().nullable(),
  email: z.string().email().max(180).optional().nullable(),
  contactRoute: z.string().max(240).optional().nullable(),
  message: z.string().max(2000).optional().nullable(),
  budgetRange: z.string().max(80).optional().nullable(),
  timeline: z.string().max(80).optional().nullable(),
  paymentPreference: z.string().max(80).optional().nullable(),
  termsVersion: z.literal(FIRST_NODE_TERMS_VERSION).optional().nullable(),
  activationLeadId: z.string().max(120).optional().nullable(),
}).superRefine((value, context) => {
  if (value.responseType === 'REQUEST_PILOT') {
    if (!value.contactName || !value.email || !value.responderRole || !value.authority) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Name, email, role, and authority are required to request a pilot.',
      });
    }
    if (value.termsVersion !== FIRST_NODE_TERMS_VERSION) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Confirm the pilot boundary before requesting it.',
      });
    }
  }
  if (['CORRECT_REPORT', 'ASK_QUESTION'].includes(value.responseType) && !value.message?.trim()) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Add the correction or question.',
    });
  }
});

const PayloadSchema = z.discriminatedUnion('type', [EventSchema, HandoffSchema, DecisionResponseSchema]);

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
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 40,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'venue-report',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many report updates. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { slug } = await params;
    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: { id: true, slug: true, name: true, city: true, country: true },
    });

    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const parsed = PayloadSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Invalid report payload' }, { status: 400 });
    }

    let responseResult: Awaited<ReturnType<typeof recordVenueDecisionResponse>> | null = null;
    if (parsed.data.type === 'event') {
      await recordVenueReportEvent({
        venueId: venue.id,
        audience: parsed.data.audience,
        eventType: parsed.data.eventType,
        sessionKey: parsed.data.sessionKey,
        channel: parsed.data.channel,
      });
    } else if (parsed.data.type === 'handoff') {
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
    } else {
      responseResult = await recordVenueDecisionResponse({
        venue,
        audience: parsed.data.audience,
        requestId: parsed.data.requestId,
        responseType: parsed.data.responseType,
        sessionKey: parsed.data.sessionKey ?? null,
        responderRole: parsed.data.responderRole ?? null,
        authority: parsed.data.authority ?? null,
        channel: parsed.data.channel ?? null,
        contactName: parsed.data.contactName ?? null,
        email: parsed.data.email ?? null,
        contactRoute: parsed.data.contactRoute ?? null,
        message: parsed.data.message ?? null,
        budgetRange: parsed.data.budgetRange ?? null,
        timeline: parsed.data.timeline ?? null,
        paymentPreference: parsed.data.paymentPreference ?? null,
        termsVersion: parsed.data.termsVersion ?? null,
        activationLeadId: parsed.data.activationLeadId ?? null,
      });
    }

    const pipeline = await getVenueReportPipelineSummary(venue.id);
    return NextResponse.json(
      { success: true, data: pipeline, response: responseResult },
      { headers: createRateLimitHeaders(rateLimit) }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_REPORT] Request failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to update venue report pipeline' }, { status: 500 });
  }
}
