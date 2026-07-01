import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { resolveSessionBaretag, baretagExists } from '@/lib/meetups-server';

// POST /api/meetups/[id]/report — Baretag-gated. Creates a moderation record.
// (Admin moderation routing/UX is Stage 4; this only records the report.)
const ReportSchema = z.object({
  reason: z.string().min(3).max(500),
  reportedBaretagId: z.string().max(60).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const rateLimit = checkRateLimit(getClientIp(request), {
    limit: 10,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'meetup-report',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many reports. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  const baretag = await resolveSessionBaretag(request);
  if (!baretag) {
    return NextResponse.json(
      { success: false, error: 'Claim and verify a Baretag to report.' },
      { status: 401 }
    );
  }

  try {
    const parsed = ReportSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid report' },
        { status: 400 }
      );
    }

    const meetup = await prisma.meetup.findUnique({ where: { id }, select: { id: true } });
    if (!meetup) {
      return NextResponse.json({ success: false, error: 'Meetup not found' }, { status: 404 });
    }
    if (parsed.data.reportedBaretagId && !(await baretagExists(parsed.data.reportedBaretagId))) {
      return NextResponse.json({ success: false, error: 'Unknown baretag' }, { status: 400 });
    }

    await prisma.meetupReport.create({
      data: {
        meetupId: id,
        reportedBaretagId: parsed.data.reportedBaretagId || null,
        reporterBaretagId: baretag.id,
        reason: parsed.data.reason.trim(),
      },
    });

    return NextResponse.json({ success: true, data: { reported: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MEETUPS] report failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to submit report' }, { status: 500 });
  }
}
