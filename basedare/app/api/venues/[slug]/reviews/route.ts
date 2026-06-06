import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import {
  getSpotVaultSnapshot,
  getVenueReviewEligibility,
  isVenueReviewTableMissingError,
  normalizeSpotVaultWallet,
} from '@/lib/spot-vault';
import { checkRateLimit, createRateLimitHeaders, getClientIp, RateLimiters } from '@/lib/rate-limit';
import { moderateDare } from '@/lib/moderation';
import { onVaultContribution } from '@/lib/vault-contributions';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const MAX_REVIEW_NOTE_LENGTH = 180;

const ReviewPostSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid walletAddress is required'),
  verdict: z.enum(['worth_it', 'skip']),
  note: z.string().max(240, 'Review note is too long').optional().nullable(),
  tag: z.string().max(40, 'Tag is too long').optional().nullable(),
});

const ReviewDeleteSchema = z.object({
  walletAddress: z.string().refine((value) => isAddress(value), 'Valid walletAddress is required'),
});

function getReviewAuthResource(slug: string) {
  return `venue:${slug}:reviews`;
}

function cleanTag(tag?: string | null) {
  const cleaned = tag?.replace(/^@/, '').replace(/[^a-zA-Z0-9_.-]/g, '').trim();
  return cleaned || null;
}

function sanitizeReviewNote(note?: string | null) {
  const cleaned = note
    ?.replace(/<[^>]*>/g, ' ')
    .replace(/[<>]/g, '')
    .replace(/[\x00-\x1F\x7F]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, MAX_REVIEW_NOTE_LENGTH);

  return cleaned || null;
}

async function readJsonBody(request: NextRequest) {
  try {
    return await request.json();
  } catch {
    return null;
  }
}

async function getActiveVenue(slug: string) {
  const venue = await prisma.venue.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      status: true,
    },
  });

  return venue?.status === 'ACTIVE' ? venue : null;
}

function applyReviewRateLimit(request: NextRequest, walletAddress: string) {
  const result = checkRateLimit(`${getClientIp(request)}:${walletAddress}`, {
    ...RateLimiters.strict,
    keyPrefix: 'venue-review',
  });

  return {
    result,
    headers: createRateLimitHeaders(result),
  };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const parsed = ReviewPostSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid venue review' },
        { status: 400 }
      );
    }

    const walletAddress = normalizeSpotVaultWallet(parsed.data.walletAddress);
    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress,
      action: 'spot-vault:review',
      resource: getReviewAuthResource(slug),
    });

    if (!authorizedWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet authorization required to review this spot' },
        { status: 401 }
      );
    }

    const rateLimit = applyReviewRateLimit(request, authorizedWallet);
    if (!rateLimit.result.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many review attempts. Try again in a minute.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const note = sanitizeReviewNote(parsed.data.note);
    if (note) {
      const moderation = moderateDare('Venue review', note, 0);
      if (!moderation.allowed) {
        return NextResponse.json(
          { success: false, error: 'Review note needs a cleaner signal.' },
          { status: 400, headers: rateLimit.headers }
        );
      }
    }

    const venue = await getActiveVenue(slug);
    if (!venue) {
      return NextResponse.json(
        { success: false, error: 'Venue not found' },
        { status: 404, headers: rateLimit.headers }
      );
    }

    const checkIn = await getVenueReviewEligibility({
      venueId: venue.id,
      walletAddress: authorizedWallet,
    });

    if (!checkIn) {
      return NextResponse.json(
        { success: false, error: 'Check in at this spot before leaving vault signal.' },
        { status: 403, headers: rateLimit.headers }
      );
    }

    const review = await prisma.venueReview.upsert({
      where: {
        venueId_walletAddress: {
          venueId: venue.id,
          walletAddress: authorizedWallet,
        },
      },
      create: {
        venueId: venue.id,
        walletAddress: authorizedWallet,
        tag: cleanTag(parsed.data.tag) ?? cleanTag(checkIn.tag),
        checkInId: checkIn.id,
        verdict: parsed.data.verdict,
        note,
        status: 'ACTIVE',
      },
      update: {
        tag: cleanTag(parsed.data.tag) ?? cleanTag(checkIn.tag),
        checkInId: checkIn.id,
        verdict: parsed.data.verdict,
        note,
        status: 'ACTIVE',
      },
      select: {
        id: true,
      },
    });

    await onVaultContribution({
      walletAddress: authorizedWallet,
      venueId: venue.id,
      type: 'review',
      sourceId: review.id,
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
    console.error('[VENUE_REVIEWS] Post failed:', message);

    if (isVenueReviewTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Venue reviews are not migrated yet' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Unable to review this spot right now' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const parsed = ReviewDeleteSchema.safeParse(await readJsonBody(request));

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid review retract' },
        { status: 400 }
      );
    }

    const walletAddress = normalizeSpotVaultWallet(parsed.data.walletAddress);
    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress,
      action: 'spot-vault:review',
      resource: getReviewAuthResource(slug),
    });

    if (!authorizedWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet authorization required to retract this review' },
        { status: 401 }
      );
    }

    const rateLimit = applyReviewRateLimit(request, authorizedWallet);
    if (!rateLimit.result.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many review attempts. Try again in a minute.' },
        { status: 429, headers: rateLimit.headers }
      );
    }

    const venue = await getActiveVenue(slug);
    if (!venue) {
      return NextResponse.json(
        { success: false, error: 'Venue not found' },
        { status: 404, headers: rateLimit.headers }
      );
    }

    const checkIn = await getVenueReviewEligibility({
      venueId: venue.id,
      walletAddress: authorizedWallet,
    });

    if (!checkIn) {
      return NextResponse.json(
        { success: false, error: 'Check in at this spot before changing vault signal.' },
        { status: 403, headers: rateLimit.headers }
      );
    }

    const existingReview = await prisma.venueReview.findUnique({
      where: {
        venueId_walletAddress: {
          venueId: venue.id,
          walletAddress: authorizedWallet,
        },
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!existingReview || existingReview.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'No active review to retract' },
        { status: 404, headers: rateLimit.headers }
      );
    }

    await prisma.venueReview.update({
      where: { id: existingReview.id },
      data: {
        status: 'RETRACTED',
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
    console.error('[VENUE_REVIEWS] Retract failed:', message);

    if (isVenueReviewTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Venue reviews are not migrated yet' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Unable to retract this spot review right now' },
      { status: 500 }
    );
  }
}
