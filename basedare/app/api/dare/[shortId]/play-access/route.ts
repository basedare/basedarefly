import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  formatCommunitySparkPlayRadius,
  isCommunitySparkRecord,
  resolveCommunitySparkPlayAccess,
} from '@/lib/community-spark-map-policy';
import { calculateDistance, formatDistance, isValidCoordinates } from '@/lib/geo';

const PlayAccessQuerySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ shortId: string }> },
) {
  const rawLat = request.nextUrl.searchParams.get('lat');
  const rawLng = request.nextUrl.searchParams.get('lng');
  if (rawLat === null || rawLng === null) {
    return NextResponse.json(
      { success: false, error: 'A valid location is required to unlock Play.' },
      { status: 400 },
    );
  }
  const query = PlayAccessQuerySchema.safeParse({
    lat: rawLat,
    lng: rawLng,
  });
  if (!query.success || !isValidCoordinates(query.data.lat, query.data.lng)) {
    return NextResponse.json(
      { success: false, error: 'A valid location is required to unlock Play.' },
      { status: 400 },
    );
  }

  const { shortId } = await params;
  const dare = await prisma.dare.findFirst({
    where: {
      OR: [{ shortId }, { id: shortId }],
    },
    select: {
      id: true,
      bounty: true,
      tag: true,
      status: true,
      expiresAt: true,
      latitude: true,
      longitude: true,
      discoveryRadiusKm: true,
      venue: {
        select: {
          latitude: true,
          longitude: true,
        },
      },
    },
  });

  if (!dare) {
    return NextResponse.json(
      { success: false, error: 'Community Spark not found.' },
      { status: 404 },
    );
  }
  if (!isCommunitySparkRecord({ bounty: dare.bounty, missionTag: dare.tag })) {
    return NextResponse.json(
      { success: false, error: 'This activity does not use the Community Spark Play gate.' },
      { status: 400 },
    );
  }
  if (dare.status !== 'PENDING' || (dare.expiresAt && dare.expiresAt.getTime() <= Date.now())) {
    return NextResponse.json(
      { success: false, error: 'This Community Spark is no longer open to play.' },
      { status: 409 },
    );
  }

  const targetLatitude = dare.latitude ?? dare.venue?.latitude ?? null;
  const targetLongitude = dare.longitude ?? dare.venue?.longitude ?? null;
  if (
    targetLatitude === null ||
    targetLongitude === null ||
    !isValidCoordinates(targetLatitude, targetLongitude)
  ) {
    return NextResponse.json(
      { success: false, error: 'This Spark needs a corrected map location before Play can unlock.' },
      { status: 409 },
    );
  }

  const distanceKm = calculateDistance(
    query.data.lat,
    query.data.lng,
    targetLatitude,
    targetLongitude,
  );
  const access = resolveCommunitySparkPlayAccess({
    distanceFromPlayerKm: distanceKm,
    playRadiusKm: dare.discoveryRadiusKm,
  });
  const response = NextResponse.json({
    success: true,
    data: {
      ...access,
      distanceKm: Math.round(distanceKm * 1000) / 1000,
      distanceDisplay: formatDistance(distanceKm),
      playRadiusLabel: formatCommunitySparkPlayRadius(access.playRadiusKm),
    },
  });
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}
