import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, createRateLimitHeaders, getClientIp } from '@/lib/rate-limit';
import { resolveSessionBaretag, baretagExists } from '@/lib/meetups-server';

// POST /api/meetups/block — Baretag-gated, idempotent. Hides the blocked creator's
// meetups from the blocker (applied in GET /api/meetups). No value released.
const BlockSchema = z.object({
  blockedBaretagId: z.string().min(1).max(60),
});

export async function POST(request: NextRequest) {
  const rateLimit = checkRateLimit(getClientIp(request), {
    limit: 20,
    windowMs: 60 * 60 * 1000,
    keyPrefix: 'meetup-block',
  });
  if (!rateLimit.allowed) {
    return NextResponse.json(
      { success: false, error: 'Too many block actions. Try again later.' },
      { status: 429, headers: createRateLimitHeaders(rateLimit) }
    );
  }

  const baretag = await resolveSessionBaretag(request);
  if (!baretag) {
    return NextResponse.json(
      { success: false, error: 'Claim and verify a Baretag to block.' },
      { status: 401 }
    );
  }

  try {
    const parsed = BlockSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Invalid block' },
        { status: 400 }
      );
    }
    if (parsed.data.blockedBaretagId === baretag.id) {
      return NextResponse.json({ success: false, error: 'You cannot block yourself.' }, { status: 400 });
    }
    if (!(await baretagExists(parsed.data.blockedBaretagId))) {
      return NextResponse.json({ success: false, error: 'Unknown baretag' }, { status: 400 });
    }

    await prisma.meetupBlock.upsert({
      where: {
        blockerBaretagId_blockedBaretagId: {
          blockerBaretagId: baretag.id,
          blockedBaretagId: parsed.data.blockedBaretagId,
        },
      },
      create: { blockerBaretagId: baretag.id, blockedBaretagId: parsed.data.blockedBaretagId },
      update: {},
    });

    return NextResponse.json({ success: true, data: { blocked: true } });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[MEETUPS] block failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to block' }, { status: 500 });
  }
}
