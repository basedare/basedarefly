import { randomBytes } from 'crypto';
import type { NextRequest } from 'next/server';

import { applyJourneyCookie, ensureAttributionJourney, lockActionIntent } from '@/lib/creator-attribution-server';
import { derivePlaceHealth } from '@/lib/place-health';
import {
  canCompleteRouteStop,
  evaluateRoutePublication,
  type PlayableRouteMode,
  type RouteStopHealth,
} from '@/lib/playable-route-policy';
import { prisma } from '@/lib/prisma';

function receiptCode() {
  return `route_${randomBytes(10).toString('hex')}`;
}

const routeInclude = {
  stops: {
    orderBy: { ordinal: 'asc' as const },
    include: {
      venue: {
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          address: true,
          latitude: true,
          longitude: true,
          status: true,
          placeObservations: {
            orderBy: { acceptedAt: 'desc' as const },
            take: 8,
            select: {
              id: true,
              buyerQuestion: true,
              reportedOutcome: true,
              observedAt: true,
              acceptedAt: true,
              refreshAt: true,
              outcomeContractSnapshot: true,
            },
          },
        },
      },
    },
  },
} as const;

export async function getPlayableRoute(slug: string, includeDraft = false) {
  const route = await prisma.playableRoute.findUnique({
    where: { slug },
    include: routeInclude,
  });
  if (!route || (!includeDraft && route.status !== 'PUBLISHED')) return null;
  return route;
}

export async function listPlayableRoutes(includeDraft = false) {
  return prisma.playableRoute.findMany({
    where: includeDraft ? {} : { status: 'PUBLISHED' },
    orderBy: [{ status: 'asc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    include: routeInclude,
  });
}

export async function publishPlayableRoute(id: string) {
  const route = await prisma.playableRoute.findUnique({ where: { id }, include: routeInclude });
  if (!route) throw new Error('Route not found.');
  const stops: RouteStopHealth[] = route.stops.map((stop) => ({
    venueId: stop.venueId,
    venueName: stop.venue.name,
    active: stop.venue.status === 'ACTIVE',
    health: derivePlaceHealth(stop.venue.placeObservations),
  }));
  const decision = evaluateRoutePublication(stops);
  if (!decision.publishable) throw new Error(decision.failures.join(' '));
  return prisma.playableRoute.update({
    where: { id },
    data: { status: 'PUBLISHED', publishedAt: new Date(), retiredAt: null },
    include: routeInclude,
  });
}

export async function startPlayableRoute(request: NextRequest, slug: string) {
  const route = await getPlayableRoute(slug);
  if (!route) throw new Error('This route is not live.');
  const healthDecision = evaluateRoutePublication(route.stops.map((stop) => ({
    venueId: stop.venueId,
    venueName: stop.venue.name,
    active: stop.venue.status === 'ACTIVE',
    health: derivePlaceHealth(stop.venue.placeObservations),
  })));
  if (!healthDecision.publishable) {
    throw new Error('This route is paused while one or more places are rechecked.');
  }
  const locked = await lockActionIntent(request, {
    targetType: 'ROUTE',
    targetId: route.id,
    targetHref: `/routes/${route.slug}`,
    title: route.title,
  });
  const run = await prisma.playableRouteRun.upsert({
    where: { routeId_journeyId: { routeId: route.id, journeyId: locked.intent.journeyId } },
    update: { actionIntentId: locked.intent.id },
    create: {
      routeId: route.id,
      journeyId: locked.intent.journeyId,
      actionIntentId: locked.intent.id,
      receiptCode: receiptCode(),
    },
    include: { progress: { include: { stop: true } } },
  });
  return { route, run, journeyToken: locked.journeyToken };
}

export async function completePlayableRouteStop(input: {
  request: NextRequest;
  routeSlug: string;
  stopId: string;
  walletAddress: string;
}) {
  const liveRoute = await getPlayableRoute(input.routeSlug);
  if (!liveRoute) throw new Error('This route is not live.');
  const healthDecision = evaluateRoutePublication(liveRoute.stops.map((stop) => ({
    venueId: stop.venueId,
    venueName: stop.venue.name,
    active: stop.venue.status === 'ACTIVE',
    health: derivePlaceHealth(stop.venue.placeObservations),
  })));
  if (!healthDecision.publishable) {
    throw new Error('This route is paused while one or more places are rechecked.');
  }
  const resolved = await ensureAttributionJourney(input.request);
  const run = await prisma.playableRouteRun.findFirst({
    where: { route: { slug: input.routeSlug }, journeyId: resolved.journey.id },
    include: {
      route: { include: { stops: { orderBy: { ordinal: 'asc' } } } },
      progress: { include: { stop: true } },
    },
  });
  if (!run) throw new Error('Start this route before completing a stop.');
  if (run.status === 'COMPLETE') return { run, alreadyComplete: true, journeyToken: resolved.rawToken };
  if (run.route.status !== 'PUBLISHED') throw new Error('This route is paused and cannot accept new stop completions.');
  if (run.walletAddress && run.walletAddress !== input.walletAddress) {
    throw new Error('This route is already bound to a different wallet.');
  }
  const stop = run.route.stops.find((item) => item.id === input.stopId);
  if (!stop) throw new Error('Route stop not found.');
  const order = canCompleteRouteStop({
    mode: run.route.mode as PlayableRouteMode,
    ordinal: stop.ordinal,
    completedOrdinals: run.progress.map((item) => item.stop.ordinal),
  });
  if (!order.allowed) throw new Error(order.reason ?? 'This stop is still locked.');
  const checkIn = await prisma.venueCheckIn.findFirst({
    where: {
      venueId: stop.venueId,
      walletAddress: input.walletAddress,
      status: 'CONFIRMED',
      proofLevel: 'QR_AND_GPS',
      scannedAt: { gte: new Date(Date.now() - 24 * 60 * 60_000) },
    },
    orderBy: { scannedAt: 'desc' },
    select: { id: true },
  });
  if (!checkIn) throw new Error('A confirmed venue QR + GPS check-in from the last 24 hours is required.');

  const result = await prisma.$transaction(async (tx) => {
    const walletBinding = await tx.playableRouteRun.updateMany({
      where: {
        id: run.id,
        status: 'ACTIVE',
        OR: [{ walletAddress: null }, { walletAddress: input.walletAddress }],
      },
      data: { walletAddress: input.walletAddress },
    });
    if (walletBinding.count !== 1) throw new Error('This route is already bound to a different wallet.');
    await tx.playableRouteProgress.upsert({
      where: { runId_stopId: { runId: run.id, stopId: stop.id } },
      update: {},
      create: { runId: run.id, stopId: stop.id, checkInId: checkIn.id },
    });
    const progressCount = await tx.playableRouteProgress.count({ where: { runId: run.id } });
    const completed = progressCount === run.route.stops.length;
    const updated = await tx.playableRouteRun.update({
      where: { id: run.id },
      data: {
        ...(completed ? { status: 'COMPLETE', completedAt: new Date() } : {}),
      },
      include: { progress: { include: { stop: true } } },
    });
    if (completed && run.actionIntentId) {
      await tx.actionIntent.updateMany({
        where: { id: run.actionIntentId, state: { in: ['LOCKED', 'BOUND'] } },
        data: { state: 'COMPLETED', completedAt: new Date(), walletAddress: input.walletAddress },
      });
    }
    return updated;
  });
  return { run: result, alreadyComplete: false, journeyToken: resolved.rawToken };
}

export { applyJourneyCookie };
export { canCompleteRouteStop, evaluateRoutePublication } from '@/lib/playable-route-policy';
export type { PlayableRouteMode, RouteStopHealth } from '@/lib/playable-route-policy';
