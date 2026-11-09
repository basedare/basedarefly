import { NextRequest, NextResponse } from 'next/server';
import { Prisma } from '@prisma/client';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  buildCreatorAttributionReport,
} from '@/lib/creator-attribution-server';
import {
  normalizeAttributionCode,
  normalizeTargetHref,
  normalizeTargetId,
  normalizeTargetType,
} from '@/lib/creator-attribution-policy';
import { prisma } from '@/lib/prisma';
import { AcquisitionSchema, acquisitionTarget } from '@/lib/acquisition-policy';
import { boundedRequestBytes } from '@/lib/bounded-request';
import { sameOrigin } from '@/lib/social-request';
import { createDiscoveryQr, discoveryQrReport, updateDiscoveryQr, DiscoveryQrUnavailable } from '@/lib/discovery-qr-server';

const LinkSchema = z.object({
  slug: z.string().min(1).max(64),
  creatorCode: z.string().min(1).max(64),
  contentCode: z.string().min(1).max(64),
  campaignCode: z.string().max(64).optional().nullable(),
  targetType: z.string().min(1).max(20),
  targetId: z.string().min(1).max(191),
  targetHref: z.string().min(1).max(1024),
  participationOwner: z.boolean().optional().default(false),
  acquisition: AcquisitionSchema.optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const rawDays = Number.parseInt(request.nextUrl.searchParams.get('periodDays') ?? '30', 10);
  const periodDays = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 90) : 30;
  if (request.nextUrl.searchParams.get('view') === 'discovery-qr') {
    try { const report = await discoveryQrReport(periodDays); return NextResponse.json({ success: true, data: request.nextUrl.searchParams.get('format') === 'harness' ? report.observation : report }, { headers: { 'Cache-Control': 'private, no-store' } }); }
    catch { return NextResponse.json({ success: false, error: 'QR campaigns could not load. Please retry.' }, { status: 503, headers: { 'Cache-Control': 'private, no-store' } }); }
  }
  const report = await buildCreatorAttributionReport(periodDays);
  if (request.nextUrl.searchParams.get('format') === 'csv') {
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['occurredAt', 'eventType', 'creatorCode', 'contentCode', 'campaignCode', 'targetType', 'targetId'];
    const rows = report.recentCompletions.map((event) => [
      event.occurredAt.toISOString(), event.eventType, event.creatorCode, event.contentCode,
      event.campaignCode, event.targetType, event.targetId,
    ]);
    const csv = [header, ...rows].map((row) => row.map(escape).join(',')).join('\n');
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="basedare-creator-attribution-${periodDays}d.csv"`,
        'Cache-Control': 'no-store',
      },
    });
  }
  return NextResponse.json({ success: true, data: report });
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    if (!sameOrigin(request)) return NextResponse.json({ success: false, error: 'Invalid origin.' }, { status: 403 });
    const raw = JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 8192)));
    if (raw && typeof raw === 'object' && 'discoveryQr' in raw) {
      const link = await createDiscoveryQr(raw, auth.walletAddress);
      return NextResponse.json({ success: true, data: { id: link.id, publicPath: '/go/' + link.slug, active: link.active } }, { status: 201, headers: { 'Cache-Control': 'private, no-store' } });
    }
    const body = LinkSchema.parse(raw);
    const data = {
      slug: normalizeAttributionCode(body.slug, 'slug'),
      creatorCode: normalizeAttributionCode(body.creatorCode, 'creatorCode'),
      contentCode: normalizeAttributionCode(body.contentCode, 'contentCode'),
      campaignCode: body.campaignCode ? normalizeAttributionCode(body.campaignCode, 'campaignCode') : null,
      targetType: normalizeTargetType(body.targetType),
      targetId: normalizeTargetId(body.targetId),
      targetHref: normalizeTargetHref(body.targetHref),
      participationOwner: body.participationOwner,
      createdBy: auth.walletAddress,
      ...(body.acquisition ? acquisitionTarget(body.acquisition) : {}),
    };

    if (data.targetType === 'DARE') {
      const dare = await prisma.dare.findUnique({ where: { id: data.targetId }, select: { id: true } });
      if (!dare) {
        return NextResponse.json({ success: false, error: 'Tracked Dare target not found.' }, { status: 404 });
      }
    }
    if (data.targetType === 'MEETUP') {
      const meetup = await prisma.meetup.findUnique({ where: { id: data.targetId }, select: { id: true } });
      if (!meetup) {
        return NextResponse.json({ success: false, error: 'Tracked meetup target not found.' }, { status: 404 });
      }
    }

    if (data.participationOwner) {
      const owner = await prisma.creatorAttributionLink.findFirst({
        where: {
          targetType: data.targetType,
          targetId: data.targetId,
          participationOwner: true,
          active: true,
        },
      });
      if (owner) {
        return NextResponse.json(
          { success: false, error: `This mission already has participation owner ${owner.creatorCode}.` },
          { status: 409 }
        );
      }
    }

    const link = await prisma.creatorAttributionLink.create({ data });
    return NextResponse.json({
      success: true,
      data: { ...link, publicPath: `/go/${link.slug}` },
    }, { status: 201 });
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return NextResponse.json({ success: false, error: 'That short link name already exists. Refresh the campaigns before retrying.' }, { status: 409 });
    const message = error instanceof Error ? error.message : 'Unable to create creator link.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  if (!sameOrigin(request)) return NextResponse.json({ success: false, error: 'Invalid origin.' }, { status: 403 });
  try {
    const raw = JSON.parse(new TextDecoder().decode(await boundedRequestBytes(request, 4096)));
    return NextResponse.json({ success: true, data: await updateDiscoveryQr(raw, auth.walletAddress) }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (e) {
    return NextResponse.json({ success: false, error: e instanceof DiscoveryQrUnavailable ? e.message : 'QR status was not confirmed. Refresh and retry.' }, { status: e instanceof DiscoveryQrUnavailable ? 409 : 400, headers: { 'Cache-Control': 'private, no-store' } });
  }
}
