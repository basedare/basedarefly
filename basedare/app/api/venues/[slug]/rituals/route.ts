import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { authOptions } from '@/lib/auth-options';
import {
  LOCAL_RITUAL_PERMISSION_STATUSES,
  LOCAL_RITUAL_STATUSES,
  validateLocalRitualSchedule,
} from '@/lib/local-rituals';
import { getVenueRitualsBySlug } from '@/lib/local-rituals-server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

type RitualSession = {
  token?: string | null;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

const RitualSchema = z.object({
  slug: z.string().trim().min(3).max(96).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  title: z.string().trim().min(3).max(120),
  summary: z.string().trim().min(12).max(500),
  weekday: z.number().int().min(0).max(6),
  startLocalMinutes: z.number().int().min(0).max(1439),
  endLocalMinutes: z.number().int().min(0).max(1439).nullable().optional(),
  timezone: z.string().trim().min(3).max(64).default('Asia/Manila'),
  status: z.enum(LOCAL_RITUAL_STATUSES).default('ACTIVE'),
  permissionStatus: z.enum(LOCAL_RITUAL_PERMISSION_STATUSES).default('VENUE_CONFIRMED'),
  sourceLabel: z.string().trim().min(3).max(120),
  sourceUrl: z.string().url().max(600).nullable().optional(),
  freshnessDays: z.number().int().min(1).max(90).default(28),
  offerLabel: z.string().trim().max(240).nullable().optional(),
  rewardDareId: z.string().trim().max(191).nullable().optional(),
});

const ReplaceRitualsSchema = z.object({ rituals: z.array(RitualSchema).max(8) });

function sessionWallet(session: RitualSession | null) {
  return (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const venue = await prisma.venue.findUnique({ where: { slug }, select: { id: true } });
  if (!venue) {
    return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
  }
  const rituals = await getVenueRitualsBySlug(slug);
  return NextResponse.json(
    { success: true, data: { rituals } },
    { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' } }
  );
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const input = ReplaceRitualsSchema.parse(await request.json());
    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: { id: true, claimedBy: true },
    });
    if (!venue) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    const adminAuth = await authorizeAdminRequest(request);
    const adminHeaderAttempted = Boolean(
      request.headers.get('x-admin-secret') || request.headers.get('x-admin-wallet')
    );
    if (adminHeaderAttempted && !adminAuth.authorized) {
      return unauthorizedAdminResponse(adminAuth);
    }
    const session = (await getServerSession(authOptions)) as RitualSession | null;
    const wallet = sessionWallet(session);
    const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
    const sessionTokenValid = !session?.token || bearer === session.token;
    const ownerAuthorized = Boolean(
      session &&
      sessionTokenValid &&
      wallet &&
      venue.claimedBy?.toLowerCase() === wallet
    );
    if (!adminAuth.authorized && !ownerAuthorized) {
      return NextResponse.json(
        { success: false, error: 'Only the claimed venue wallet or a moderator can maintain this schedule.' },
        { status: 403 }
      );
    }

    const actor = adminAuth.authorized ? adminAuth.walletAddress : wallet;
    const now = new Date();
    const ritualSlugs = input.rituals.map((ritual) => ritual.slug);
    const conflictingRitual = ritualSlugs.length
      ? await prisma.venueRitual.findFirst({
          where: { slug: { in: ritualSlugs }, venueId: { not: venue.id } },
          select: { slug: true },
        })
      : null;
    if (conflictingRitual) {
      return NextResponse.json(
        {
          success: false,
          error: `The ritual slug "${conflictingRitual.slug}" already belongs to another venue.`,
        },
        { status: 409 }
      );
    }
    for (const ritual of input.rituals) {
      const confirmedAt = now;
      const expiresAt = new Date(now.getTime() + ritual.freshnessDays * 86_400_000);
      validateLocalRitualSchedule({
        weekday: ritual.weekday,
        startLocalMinutes: ritual.startLocalMinutes,
        endLocalMinutes: ritual.endLocalMinutes,
        sourceLastConfirmedAt: confirmedAt,
        freshnessExpiresAt: expiresAt,
      });
    }

    await prisma.$transaction(async (tx) => {
      const slugs = input.rituals.map((ritual) => ritual.slug);
      await tx.venueRitual.updateMany({
        where: { venueId: venue.id, slug: { notIn: slugs } },
        data: { status: 'PAUSED' },
      });
      for (const ritual of input.rituals) {
        const confirmedAt = now;
        const expiresAt = new Date(now.getTime() + ritual.freshnessDays * 86_400_000);
        await tx.venueRitual.upsert({
          where: { slug: ritual.slug },
          update: {
            venueId: venue.id,
            title: ritual.title,
            summary: ritual.summary,
            weekday: ritual.weekday,
            startLocalMinutes: ritual.startLocalMinutes,
            endLocalMinutes: ritual.endLocalMinutes ?? null,
            timezone: ritual.timezone,
            sourceKind: adminAuth.authorized ? 'BASEDARE_ADMIN_REVIEW' : 'VENUE_OWNER_CONFIRMATION',
            sourceLabel: ritual.sourceLabel,
            sourceUrl: ritual.sourceUrl ?? null,
            sourceLastConfirmedAt: confirmedAt,
            freshnessExpiresAt: expiresAt,
            status: ritual.status,
            permissionStatus: ownerAuthorized ? 'VENUE_CONFIRMED' : ritual.permissionStatus,
            offerLabel: ritual.offerLabel ?? null,
            rewardDareId: ritual.rewardDareId ?? null,
            createdBy: actor,
          },
          create: {
            venueId: venue.id,
            slug: ritual.slug,
            title: ritual.title,
            summary: ritual.summary,
            weekday: ritual.weekday,
            startLocalMinutes: ritual.startLocalMinutes,
            endLocalMinutes: ritual.endLocalMinutes ?? null,
            timezone: ritual.timezone,
            sourceKind: adminAuth.authorized ? 'BASEDARE_ADMIN_REVIEW' : 'VENUE_OWNER_CONFIRMATION',
            sourceLabel: ritual.sourceLabel,
            sourceUrl: ritual.sourceUrl ?? null,
            sourceLastConfirmedAt: confirmedAt,
            freshnessExpiresAt: expiresAt,
            status: ritual.status,
            permissionStatus: ownerAuthorized ? 'VENUE_CONFIRMED' : ritual.permissionStatus,
            offerLabel: ritual.offerLabel ?? null,
            rewardDareId: ritual.rewardDareId ?? null,
            createdBy: actor,
          },
        });
      }
    });
    return NextResponse.json(
      { success: true, data: { rituals: await getVenueRitualsBySlug(slug) } },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update local rituals.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
