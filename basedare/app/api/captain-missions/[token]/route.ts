import { randomUUID } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import {
  findCaptainMissionEventByToken,
  mapCaptainMissionEvent,
} from '@/lib/captain-missions-server';
import { CREATOR_CAPTAIN_EVENT_TYPE } from '@/lib/creator-captains';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import {
  buildVenuePitchPacket,
  isRecord,
  normalizeLeadUrl,
  normalizeScoutHandle,
  normalizeScoutText,
  stringValue,
} from '@/lib/scout-creator-leads';
import { alertCaptainMissionProofSubmitted } from '@/lib/telegram';

const CaptainMissionProofSchema = z.object({
  creatorHandle: z.string().max(140).optional().default(''),
  bestVenueName: z.string().min(2).max(180),
  city: z.string().min(2).max(140),
  venueAddress: z.string().max(240).optional().default(''),
  venueWebsite: z.string().max(240).optional().default(''),
  venueInstagram: z.string().max(240).optional().default(''),
  proofLinks: z.string().min(4).max(1600),
  whyGoodFit: z.string().min(20).max(1200),
  momentDescription: z.string().min(10).max(900),
  perkIdea: z.string().max(600).optional().default(''),
  ownerIntroStatus: z.enum(['none', 'can_intro', 'owner_knows_me', 'already_contacted']).optional().default('none'),
  alternateVenues: z.string().max(900).optional().default(''),
  safetyAccepted: z.boolean().refine(Boolean, 'Accept the safety and truthfulness rules before submitting.'),
  companyWebsite: z.string().max(240).optional().default(''),
});

type MetadataRecord = Record<string, unknown>;

function asRecord(value: unknown): MetadataRecord {
  return isRecord(value) ? value : {};
}

function splitProofLinks(value: string) {
  return value
    .split(/[\n,]+/g)
    .map((item) => normalizeLeadUrl(item))
    .filter(Boolean)
    .slice(0, 12);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const event = await findCaptainMissionEventByToken(token);
  if (!event) {
    return NextResponse.json({ success: false, error: 'Captain mission not found' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    data: mapCaptainMissionEvent(event),
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const clientIp = getClientIp(request);
  const rateLimit = checkRateLimit(clientIp, {
    limit: 5,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'captain-mission-proof',
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many mission submissions. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  try {
    const { token } = await params;
    const event = await findCaptainMissionEventByToken(token);
    if (!event) {
      return NextResponse.json(
        { success: false, error: 'Captain mission not found' },
        { status: 404, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const body = await request.json();
    const validation = CaptainMissionProofSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message || 'Invalid mission proof' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const input = validation.data;
    if (input.companyWebsite) {
      return NextResponse.json({ success: true, data: { received: true } });
    }

    const metadata = asRecord(event.metadataJson);
    const mission = asRecord(metadata.mission);
    const statusHistory = Array.isArray(metadata.statusHistory) ? metadata.statusHistory : [];
    const existingProofSubmissions = Array.isArray(mission.proofSubmissions) ? mission.proofSubmissions : [];
    const creatorHandle = normalizeScoutHandle(input.creatorHandle || stringValue(metadata.creatorHandle));
    const bestVenueName = normalizeScoutText(input.bestVenueName);
    const city = normalizeScoutText(input.city);
    const proofLinks = splitProofLinks(input.proofLinks);

    if (!proofLinks.length) {
      return NextResponse.json(
        { success: false, error: 'Add at least one proof link.' },
        { status: 400, headers: createRateLimitHeaders(rateLimit) }
      );
    }

    const latestProof = {
      id: randomUUID(),
      submittedAt: new Date().toISOString(),
      creatorHandle,
      bestVenueName,
      city,
      venueAddress: normalizeScoutText(input.venueAddress),
      venueWebsite: normalizeLeadUrl(input.venueWebsite),
      venueInstagram: normalizeLeadUrl(input.venueInstagram),
      proofLinks,
      whyGoodFit: normalizeScoutText(input.whyGoodFit),
      momentDescription: normalizeScoutText(input.momentDescription),
      perkIdea: normalizeScoutText(input.perkIdea),
      ownerIntroStatus: input.ownerIntroStatus,
      alternateVenues: normalizeScoutText(input.alternateVenues),
      safetyAccepted: true,
      clientIp,
    };

    const pitchPacket = buildVenuePitchPacket({
      creatorHandle,
      creatorCity: city,
      venueName: bestVenueName,
      venueAddress: latestProof.venueAddress,
      venueWebsite: latestProof.venueWebsite,
      venueInstagram: latestProof.venueInstagram,
      whyGoodFit: latestProof.whyGoodFit,
      momentDescription: latestProof.momentDescription,
      perkIdea: latestProof.perkIdea,
      ownerIntroStatus: latestProof.ownerIntroStatus,
    });

    const nextMetadata = JSON.parse(
      JSON.stringify({
        ...metadata,
        mission: {
          ...mission,
          status: 'PROOF_SUBMITTED',
          proofSubmittedAt: latestProof.submittedAt,
          latestProof,
          proofSubmissions: [...existingProofSubmissions.slice(-8), latestProof],
          pitchPacket,
        },
        statusHistory: [
          ...statusHistory.slice(-12),
          {
            from: event.status || 'MISSION_SENT',
            to: 'PROOF_SUBMITTED',
            at: latestProof.submittedAt,
            by: 'captain-mission-proof',
          },
        ],
      })
    ) as Prisma.InputJsonValue;

    const updated = await prisma.founderEvent.update({
      where: { id: event.id },
      data: {
        status: event.eventType === CREATOR_CAPTAIN_EVENT_TYPE ? event.status || 'CONTACTED' : 'PROOF_SUBMITTED',
        href: event.eventType === CREATOR_CAPTAIN_EVENT_TYPE ? '/admin/creator-captains' : '/admin/scouts',
        metadataJson: nextMetadata,
      },
      select: {
        id: true,
        eventType: true,
        title: true,
        status: true,
        metadataJson: true,
        occurredAt: true,
        updatedAt: true,
      },
    });

    void alertCaptainMissionProofSubmitted({
      leadId: updated.id,
      creatorHandle,
      venueName: bestVenueName,
      city,
      proofCount: proofLinks.length,
      activationHref: pitchPacket.activationHref,
    }).catch((error) => {
      console.error('[CAPTAIN_MISSION] Telegram alert failed:', error);
    });

    return NextResponse.json({
      success: true,
      data: mapCaptainMissionEvent(updated),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[CAPTAIN_MISSION] Proof submit failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to submit captain mission proof' },
      { status: 500, headers: createRateLimitHeaders(rateLimit) }
    );
  }
}
