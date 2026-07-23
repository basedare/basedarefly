import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { listPlayableRoutes, publishPlayableRoute } from '@/lib/playable-routes';
import { prisma } from '@/lib/prisma';

const StopSchema = z.object({
  venueId: z.string().min(1).max(191),
  loreTitle: z.string().trim().min(2).max(100),
  loreBody: z.string().trim().min(8).max(500),
});

const CreateSchema = z.object({
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100),
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().min(12).max(500),
  loreIntro: z.string().trim().max(500).nullable().optional(),
  mode: z.enum(['ORDERED', 'FREE_PLAY']),
  stops: z.array(StopSchema).min(3).max(5),
});

const ActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('PUBLISH'), routeId: z.string().min(1) }),
  z.object({ action: z.literal('RETIRE'), routeId: z.string().min(1) }),
]);

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const routes = await listPlayableRoutes(true);
  return NextResponse.json({ success: true, data: routes }, { headers: { 'Cache-Control': 'no-store' } });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const input = CreateSchema.parse(await request.json());
    const venueIds = input.stops.map((stop) => stop.venueId);
    if (new Set(venueIds).size !== venueIds.length) throw new Error('Every route stop must be a different place.');
    const activeVenueCount = await prisma.venue.count({ where: { id: { in: venueIds }, status: 'ACTIVE' } });
    if (activeVenueCount !== venueIds.length) throw new Error('Every route stop must be an active BaseDare place.');
    const route = await prisma.playableRoute.create({
      data: {
        slug: input.slug,
        title: input.title,
        description: input.description,
        loreIntro: input.loreIntro || null,
        mode: input.mode,
        createdBy: auth.walletAddress,
        stops: {
          create: input.stops.map((stop, index) => ({ ...stop, ordinal: index + 1 })),
        },
      },
      include: { stops: { orderBy: { ordinal: 'asc' }, include: { venue: true } } },
    });
    return NextResponse.json({ success: true, data: route }, { status: 201, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to create route.' }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const input = ActionSchema.parse(await request.json());
    const route = input.action === 'PUBLISH'
      ? await publishPlayableRoute(input.routeId)
      : await prisma.playableRoute.update({
          where: { id: input.routeId },
          data: { status: 'RETIRED', retiredAt: new Date() },
          include: { stops: { orderBy: { ordinal: 'asc' }, include: { venue: true } } },
        });
    return NextResponse.json({ success: true, data: route }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Unable to update route.' }, { status: 409 });
  }
}
