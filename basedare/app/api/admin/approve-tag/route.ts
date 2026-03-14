import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { alertTagClaimDecision } from '@/lib/telegram';

const TELEGRAM_ADMIN_SECRET = process.env.TELEGRAM_ADMIN_SECRET;

const ApproveTagSchema = z.object({
  tagClaimId: z.string().min(1, 'tagClaimId is required'),
  approved: z.boolean(),
});

function hasValidAdminSecret(request: NextRequest): boolean {
  if (!TELEGRAM_ADMIN_SECRET || TELEGRAM_ADMIN_SECRET.length < 32) {
    return false;
  }

  const candidate = request.headers.get('x-telegram-admin-secret');
  if (!candidate || candidate.length !== TELEGRAM_ADMIN_SECRET.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < candidate.length; i++) {
    result |= candidate.charCodeAt(i) ^ TELEGRAM_ADMIN_SECRET.charCodeAt(i);
  }

  return result === 0;
}

function resolveHandle(tag: {
  twitterHandle: string | null;
  twitchHandle: string | null;
  youtubeHandle: string | null;
  kickHandle: string | null;
}): string {
  return tag.twitterHandle ?? tag.twitchHandle ?? tag.youtubeHandle ?? tag.kickHandle ?? '';
}

export async function POST(request: NextRequest) {
  try {
    if (!hasValidAdminSecret(request)) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const parsed = ApproveTagSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { tagClaimId, approved } = parsed.data;

    const existing = await prisma.streamerTag.findUnique({
      where: { id: tagClaimId },
      select: {
        id: true,
        tag: true,
        status: true,
        walletAddress: true,
        verificationMethod: true,
        twitterHandle: true,
        twitchHandle: true,
        youtubeHandle: true,
        kickHandle: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { success: false, error: 'Tag claim not found' },
        { status: 404 }
      );
    }

    if (existing.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: `Tag claim is already ${existing.status}` },
        { status: 400 }
      );
    }

    const updated = await prisma.streamerTag.update({
      where: { id: tagClaimId },
      data: approved
        ? {
            status: 'ACTIVE',
            verifiedAt: new Date(),
            revokedAt: null,
            revokedBy: null,
            revokeReason: null,
          }
        : {
            status: 'REJECTED',
            verifiedAt: null,
            revokeReason: 'Rejected by admin review',
          },
      select: {
        id: true,
        tag: true,
        status: true,
        walletAddress: true,
        verificationMethod: true,
        twitterHandle: true,
        twitchHandle: true,
        youtubeHandle: true,
        kickHandle: true,
      },
    });

    void alertTagClaimDecision({
      tagClaimId: updated.id,
      tag: updated.tag,
      approved,
      walletAddress: updated.walletAddress,
      platform: updated.verificationMethod,
      handle: resolveHandle(updated),
    }).catch((error) => {
      console.error('[ADMIN APPROVE TAG] Telegram notification failed:', error);
    });

    return NextResponse.json({
      success: true,
      data: {
        tagClaimId: updated.id,
        tag: updated.tag,
        status: updated.status,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN APPROVE TAG] Failed:', message);
    return NextResponse.json(
      {
        success: false,
        error: 'Unable to process tag approval right now',
      },
      { status: 500 }
    );
  }
}
