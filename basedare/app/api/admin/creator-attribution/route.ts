import { NextRequest, NextResponse } from 'next/server';
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

const LinkSchema = z.object({
  slug: z.string().min(1).max(64),
  creatorCode: z.string().min(1).max(64),
  contentCode: z.string().min(1).max(64),
  campaignCode: z.string().max(64).optional().nullable(),
  targetType: z.string().min(1).max(20),
  targetId: z.string().min(1).max(191),
  targetHref: z.string().min(1).max(1024),
  participationOwner: z.boolean().optional().default(false),
});

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  const rawDays = Number.parseInt(request.nextUrl.searchParams.get('periodDays') ?? '30', 10);
  const periodDays = Number.isFinite(rawDays) ? Math.min(Math.max(rawDays, 1), 90) : 30;
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
    const body = LinkSchema.parse(await request.json());
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
    const message = error instanceof Error ? error.message : 'Unable to create creator link.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
