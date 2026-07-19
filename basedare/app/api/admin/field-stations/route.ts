import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  FIELD_STATION_QR_ERROR_CORRECTION,
  FIELD_STATION_QR_QUIET_ZONE_MODULES,
  formatFieldStationSerial,
  normalizeDensityRadiusKm,
  normalizeFieldStationAttention,
  normalizeFieldStationFallback,
  normalizeFieldStationCode,
  normalizeMinimumDensity,
} from '@/lib/field-station-policy';
import { buildFieldStationReport } from '@/lib/field-station-server';
import {
  normalizeAttributionCode,
  normalizeTargetHref,
  normalizeTargetId,
  normalizeTargetType,
} from '@/lib/creator-attribution-policy';
import { prisma } from '@/lib/prisma';

const StationSchema = z.object({
  slug: z.string().min(1).max(64),
  stationCode: z.string().min(1).max(64),
  stationHostVenueSlug: z.string().min(1).max(191),
  contentCode: z.string().min(1).max(64),
  campaignCode: z.string().max(64).optional().default('siargao-field-stations-v1'),
  attentionMode: z.string().max(20).optional().default('ASK'),
  fallbackAttentionMode: z.string().max(20).optional().default('NEARBY'),
  minimumDensity: z.coerce.number().optional().default(3),
  densityRadiusKm: z.coerce.number().optional().default(3),
  targetType: z.string().max(20).optional().default('PAGE'),
  targetId: z.string().max(191).optional(),
  targetHref: z.string().max(1024).optional().default('/board'),
});

const StationStatusSchema = z.object({
  linkId: z.string().min(1).max(191),
  active: z.boolean(),
});

function appUrl(request: NextRequest) {
  return (process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL || request.nextUrl.origin).replace(/\/$/, '');
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const parsed = Number.parseInt(request.nextUrl.searchParams.get('periodDays') ?? '30', 10);
  const periodDays = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 1), 90) : 30;
  const report = await buildFieldStationReport(periodDays);
  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = [
      'occurredAt', 'eventType', 'stationCode', 'contentCode', 'campaignCode',
      'attentionMode', 'stationHostVenueId', 'destinationVenueId', 'journeyId',
    ];
    const rows = report.recentEvents.map((event) => [
      event.occurredAt.toISOString(), event.eventType, event.stationCode, event.contentCode,
      event.campaignCode, event.attentionMode, event.stationHostVenueId,
      event.destinationVenueId, event.journeyId,
    ]);
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="basedare-field-stations-${periodDays}d.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  return NextResponse.json({ success: true, data: report }, {
    headers: { 'Cache-Control': 'no-store' },
  });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const body = StationSchema.parse(await request.json());
    const host = await prisma.venue.findUnique({
      where: { slug: body.stationHostVenueSlug.trim().toLowerCase() },
      select: { id: true, slug: true, name: true },
    });
    if (!host) {
      return NextResponse.json({ success: false, error: 'Station host venue not found.' }, { status: 404 });
    }
    const stationCode = normalizeFieldStationCode(body.stationCode);
    const targetType = normalizeTargetType(body.targetType);
    const link = await prisma.creatorAttributionLink.create({
      data: {
        slug: normalizeAttributionCode(body.slug, 'slug'),
        creatorCode: 'basedare',
        contentCode: normalizeAttributionCode(body.contentCode, 'contentCode'),
        campaignCode: normalizeAttributionCode(body.campaignCode, 'campaignCode'),
        targetType,
        targetId: normalizeTargetId(body.targetId || `field-station:${stationCode}`),
        targetHref: normalizeTargetHref(body.targetHref),
        participationOwner: false,
        stationCode,
        stationHostVenueId: host.id,
        attentionMode: normalizeFieldStationAttention(body.attentionMode),
        fallbackAttentionMode: normalizeFieldStationFallback(body.fallbackAttentionMode),
        minimumDensity: normalizeMinimumDensity(body.minimumDensity),
        densityRadiusKm: normalizeDensityRadiusKm(body.densityRadiusKm),
        createdBy: auth.walletAddress,
      },
    });
    const publicPath = `/go/${link.slug}`;
    return NextResponse.json({
      success: true,
      data: {
        ...link,
        stationHostVenue: host,
        serial: formatFieldStationSerial(link.serialNumber),
        publicPath,
        shortUrl: `${appUrl(request)}${publicPath}`,
        qr: {
          errorCorrectionLevel: FIELD_STATION_QR_ERROR_CORRECTION,
          quietZoneModules: FIELD_STATION_QR_QUIET_ZONE_MODULES,
          proofAuthority: false,
        },
      },
    }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to create Field Station.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const body = StationStatusSchema.parse(await request.json());
    const result = await prisma.creatorAttributionLink.updateMany({
      where: {
        id: body.linkId,
        stationCode: { not: null },
      },
      data: { active: body.active },
    });
    if (result.count !== 1) {
      return NextResponse.json(
        { success: false, error: 'Field Station link not found.' },
        { status: 404 }
      );
    }
    const link = await prisma.creatorAttributionLink.findUnique({
      where: { id: body.linkId },
      select: { id: true, active: true, stationCode: true, slug: true },
    });
    return NextResponse.json({ success: true, data: link }, {
      headers: { 'Cache-Control': 'no-store' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to update Field Station.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
