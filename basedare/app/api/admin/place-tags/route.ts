import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { createWalletNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';
import { withReceiptSerial } from '@/lib/receipt-serial';
import { publishVenueRoomReceipt } from '@/lib/venue-room';
import { composePassport } from '@/lib/creator-passport';

const ALLOWED_PLACE_TAG_STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'FLAGGED'] as const;

const PlaceTagReviewActionSchema = z.object({
  tagId: z.string().min(1, 'Tag ID is required'),
  action: z.enum(['APPROVE', 'REJECT', 'FLAG']),
  reason: z.string().max(500).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') ?? 'PENDING';
    const limit = Math.min(Math.max(Number(searchParams.get('limit') ?? '20'), 1), 50);

    const normalizedStatus = status === 'ALL'
      ? 'ALL'
      : ALLOWED_PLACE_TAG_STATUSES.includes(status as (typeof ALLOWED_PLACE_TAG_STATUSES)[number])
        ? status
        : 'PENDING';

    const where = normalizedStatus === 'ALL' ? {} : { status: normalizedStatus };

    const [tags, counts] = await Promise.all([
      prisma.placeTag.findMany({
        where,
        orderBy: { submittedAt: 'asc' },
        take: limit,
        select: {
          id: true,
          venueId: true,
          walletAddress: true,
          creatorTag: true,
          status: true,
          caption: true,
          vibeTags: true,
          proofMediaUrl: true,
          proofCid: true,
          proofType: true,
          linkedDareId: true,
          latitude: true,
          longitude: true,
          geoDistanceMeters: true,
          firstMark: true,
          submittedAt: true,
          reviewedAt: true,
          reviewerWallet: true,
          reviewReason: true,
          venue: {
            select: {
              id: true,
              slug: true,
              name: true,
              city: true,
              country: true,
            },
          },
        },
      }),
      prisma.placeTag.groupBy({
        by: ['status'],
        _count: true,
      }),
    ]);

    const countMap = counts.reduce(
      (acc, item) => {
        acc[item.status] = item._count;
        return acc;
      },
      {} as Record<string, number>
    );

    return NextResponse.json({
      success: true,
      data: {
        tags,
        counts: {
          pending: countMap.PENDING || 0,
          approved: countMap.APPROVED || 0,
          rejected: countMap.REJECTED || 0,
          flagged: countMap.FLAGGED || 0,
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_PLACE_TAGS] GET failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const validation = PlaceTagReviewActionSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const { tagId, action, reason } = validation.data;
    const reviewerWallet = auth.walletAddress;

    const existingTag = await prisma.placeTag.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        venueId: true,
        walletAddress: true,
        creatorTag: true,
        status: true,
        serialNumber: true,
        venue: {
          select: {
            slug: true,
            name: true,
          },
        },
      },
    });

    if (!existingTag) {
      return NextResponse.json({ success: false, error: 'Place tag not found' }, { status: 404 });
    }

    const now = new Date();

    if (action === 'APPROVE') {
      const updatedTag = await withReceiptSerial(async (serial, tx) => {
        const approvedCount = await tx.placeTag.count({
          where: {
            venueId: existingTag.venueId,
            status: 'APPROVED',
            NOT: { id: existingTag.id },
          },
        });

        return tx.placeTag.update({
          where: { id: existingTag.id },
          data: {
            status: 'APPROVED',
            reviewedAt: now,
            reviewerWallet,
            reviewReason: reason || null,
            firstMark: approvedCount === 0,
            // A serial is issued once and never overwritten on re-approval.
            ...(existingTag.serialNumber == null ? { serialNumber: serial } : {}),
          },
        });
      });

      await createWalletNotification({
        wallet: existingTag.walletAddress,
        type: 'PLACE_TAG_APPROVED',
        title: 'Your mark is live',
        message: `Your tag at "${existingTag.venue.name}" is now part of the BaseDare memory layer.`,
        link: `/venues/${existingTag.venue.slug}`,
        pushTopic: 'venues',
      }).catch(() => {});

      if (existingTag.status !== 'APPROVED') {
        const actorLabel = existingTag.creatorTag || `${existingTag.walletAddress.slice(0, 6)}...${existingTag.walletAddress.slice(-4)}`;
        await publishVenueRoomReceipt({
          venueId: existingTag.venueId,
          actorWallet: existingTag.walletAddress,
          actorLabel,
          receiptType: 'mark-approved',
          sourceId: existingTag.id,
          body: `${updatedTag.firstMark ? 'First mark verified' : 'Mark verified'} for ${actorLabel}.`,
          href: `/venues/${encodeURIComponent(existingTag.venue.slug)}`,
          tone: updatedTag.firstMark ? 'gold' : 'emerald',
        }).catch((receiptError) => {
          const receiptMessage = receiptError instanceof Error ? receiptError.message : 'Unknown receipt error';
          console.error('[ADMIN_PLACE_TAGS] Room receipt failed:', receiptMessage);
          return null;
        });

        await composePassport(existingTag.walletAddress, { persist: true }).catch((passportError) => {
          console.error('[ADMIN_PLACE_TAGS] Passport refresh failed:', passportError);
          return null;
        });
      }

      console.log(`[ADMIN_PLACE_TAGS] APPROVED ${tagId} by ${reviewerWallet}`);

      return NextResponse.json({
        success: true,
        data: {
          id: updatedTag.id,
          status: updatedTag.status,
          reviewedAt: updatedTag.reviewedAt,
        },
      });
    }

    const nextStatus = action === 'FLAG' ? 'FLAGGED' : 'REJECTED';

    const updatedTag = await prisma.placeTag.update({
      where: { id: existingTag.id },
      data: {
        status: nextStatus,
        reviewedAt: now,
        reviewerWallet,
        reviewReason: reason || null,
        firstMark: false,
      },
    });

    await createWalletNotification({
      wallet: existingTag.walletAddress,
      type: nextStatus === 'FLAGGED' ? 'PLACE_TAG_FLAGGED' : 'PLACE_TAG_REJECTED',
      title: nextStatus === 'FLAGGED' ? 'Your mark was flagged' : 'Your mark was rejected',
      message:
        nextStatus === 'FLAGGED'
          ? `Your tag at "${existingTag.venue.name}" was flagged for review.`
          : `Your tag at "${existingTag.venue.name}" did not pass review.`,
      link: `/venues/${existingTag.venue.slug}`,
      pushTopic: 'venues',
    }).catch(() => {});

    console.log(`[ADMIN_PLACE_TAGS] ${nextStatus} ${tagId} by ${reviewerWallet}${reason ? `: ${reason}` : ''}`);

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTag.id,
        status: updatedTag.status,
        reviewedAt: updatedTag.reviewedAt,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_PLACE_TAGS] PUT failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
