import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  getSpotVaultSnapshot,
  isVenueReviewTableMissingError,
  normalizeSpotVaultWallet,
} from '@/lib/spot-vault';
import { moderateDare } from '@/lib/moderation';
import { checkRateLimit, createRateLimitHeaders, getClientIp, RateLimiters } from '@/lib/rate-limit';
import { recordVenueReportEvent } from '@/lib/venue-report-pipeline';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_REVIEW_REPORT_NOTE_LENGTH = 240;

const ReviewReportSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid walletAddress is required'),
  reason: z.enum(['spam', 'abuse', 'inaccurate']),
  note: z.string().max(MAX_REVIEW_REPORT_NOTE_LENGTH, 'Report note is too long').optional().nullable(),
});

function sanitizeReportNote(note?: string | null) {
  const cleaned = note
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_REVIEW_REPORT_NOTE_LENGTH);

  return cleaned || null;
}

async function readJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

function applyReviewReportRateLimit(request: NextRequest, walletAddress: string) {
  const result = checkRateLimit(`${getClientIp(request)}:${walletAddress}`, {
    ...RateLimiters.strict,
    keyPrefix: 'venue-review-report',
  });

  return {
    result,
    headers: createRateLimitHeaders(result),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; reviewId: string }> }
) {
  try {
    const { slug, reviewId } = await params;
    const parsed = ReviewReportSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid review report' },
        { status: 400 }
      );
    }

    const walletAddress = normalizeSpotVaultWallet(parsed.data.walletAddress);
    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress,
      action: 'spot-vault:review-report',
      resource: `venue:${slug}:reviews:${reviewId}`,
    });

    if (!authorizedWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet authorization required to flag this review' },
        { status: 401 }
      );
    }

    const rateLimit = applyReviewReportRateLimit(request, authorizedWallet);
    if (!rateLimit.result.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many review reports. Try again in a minute.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const note = sanitizeReportNote(parsed.data.note);
    if (note) {
      const moderation = moderateDare('Venue review report', note, 0);
      if (!moderation.allowed) {
        return NextResponse.json(
          { success: false, error: 'Report note needs a cleaner signal.' },
          { status: 400, headers: rateLimit.headers }
        );
      }
    }

    const venue = await prisma.venue.findUnique({
      where: { slug },
      select: {
        id: true,
        slug: true,
        status: true,
      },
    });

    if (!venue || venue.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Venue not found' },
        { status: 404, headers: rateLimit.headers }
      );
    }

    const review = await prisma.venueReview.findFirst({
      where: {
        id: reviewId,
        venueId: venue.id,
        status: 'ACTIVE',
      },
      select: {
        id: true,
        walletAddress: true,
        verdict: true,
      },
    });

    if (!review) {
      return NextResponse.json(
        { success: false, error: 'Review not found' },
        { status: 404, headers: rateLimit.headers }
      );
    }

    if (review.walletAddress.toLowerCase() === authorizedWallet) {
      return NextResponse.json(
        { success: false, error: 'Retract your own review instead.' },
        { status: 400, headers: rateLimit.headers }
      );
    }

    await prisma.venueReview.update({
      where: { id: review.id },
      data: {
        status: 'FLAGGED',
      },
    });

    await recordVenueReportEvent({
      venueId: venue.id,
      audience: 'venue',
      eventType: 'REVIEW_FLAGGED',
      channel: 'spot-vault-review',
      metadataJson: {
        reviewId: review.id,
        reason: parsed.data.reason,
        reporterWallet: authorizedWallet,
        reviewWallet: review.walletAddress,
        verdict: review.verdict,
        note,
      },
    });

    const snapshot = await getSpotVaultSnapshot({
      slug,
      walletAddress: authorizedWallet,
      limit: 14,
    });

    return NextResponse.json(
      {
        success: true,
        data: snapshot,
      },
      { headers: rateLimit.headers }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VENUE_REVIEW_REPORT] Report failed:', message);

    if (isVenueReviewTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Venue reviews are not migrated yet' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Unable to flag this review right now' },
      { status: 500 }
    );
  }
}
