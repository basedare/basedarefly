import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAuthorizedCreatorReviewWallet } from '@/lib/creator-review-auth-server';
import { isCreatorReviewTableMissingError } from '@/lib/creator-reviews';

const CreateCreatorReviewSchema = z.object({
  rating: z.number().int().min(1).max(5),
  review: z
    .string()
    .max(240, 'Review must be 240 characters or less.')
    .transform((value) => value.trim())
    .optional(),
});

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const review = await prisma.creatorReview.findUnique({
      where: { dareId: id },
      select: {
        id: true,
        rating: true,
        review: true,
        createdAt: true,
        reviewerWallet: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: review
        ? {
            ...review,
            createdAt: review.createdAt.toISOString(),
          }
        : null,
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error: unknown) {
    if (isCreatorReviewTableMissingError(error)) {
      return NextResponse.json({ success: true, data: null });
    }
    const message = error instanceof Error ? error.message : 'Failed to fetch review';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = CreateCreatorReviewSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const dare = await prisma.dare.findUnique({
      where: { id },
      select: {
        id: true,
        stakerAddress: true,
        streamerHandle: true,
        claimRequestTag: true,
        status: true,
      },
    });

    if (!dare) {
      return NextResponse.json({ success: false, error: 'Dare not found' }, { status: 404 });
    }

    if (!dare.stakerAddress) {
      return NextResponse.json({ success: false, error: 'This dare has no funder attached.' }, { status: 400 });
    }

    if (!['VERIFIED', 'PENDING_PAYOUT'].includes(dare.status)) {
      return NextResponse.json(
        { success: false, error: 'Reviews unlock after completion is approved.' },
        { status: 400 }
      );
    }

    const creatorTag = dare.streamerHandle ?? dare.claimRequestTag;
    if (!creatorTag) {
      return NextResponse.json({ success: false, error: 'No creator is linked to this dare yet.' }, { status: 400 });
    }

    const authorizedWallet = await getAuthorizedCreatorReviewWallet(
      request,
      dare.stakerAddress,
      dare.id
    );
    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    let existing: { id: string } | null = null;
    try {
      existing = await prisma.creatorReview.findUnique({
        where: { dareId: dare.id },
        select: { id: true },
      });
    } catch (error) {
      if (isCreatorReviewTableMissingError(error)) {
        return NextResponse.json(
          { success: false, error: 'Creator reviews are not migrated in this environment yet.' },
          { status: 503 }
        );
      }
      throw error;
    }
    if (existing) {
      return NextResponse.json(
        { success: false, error: 'A review has already been recorded for this dare.' },
        { status: 409 }
      );
    }

    const created = await prisma.creatorReview.create({
      data: {
        dareId: dare.id,
        creatorTag,
        reviewerWallet: authorizedWallet,
        rating: validation.data.rating,
        review: validation.data.review && validation.data.review.length > 0 ? validation.data.review : null,
      },
      select: {
        id: true,
        dareId: true,
        creatorTag: true,
        reviewerWallet: true,
        rating: true,
        review: true,
        createdAt: true,
      },
    });

    const response = NextResponse.json({
      success: true,
      data: {
        ...created,
        createdAt: created.createdAt.toISOString(),
      },
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  } catch (error: unknown) {
    if (isCreatorReviewTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Creator reviews are not migrated in this environment yet.' },
        { status: 503 }
      );
    }
    const message = error instanceof Error ? error.message : 'Failed to submit review';
    console.error('[CREATOR_REVIEW] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
