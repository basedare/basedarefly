import 'server-only';

import { createWalletNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export const PLACE_REVIEW_ACTIONS = ['APPROVE', 'REJECT', 'FLAG'] as const;
export type PlaceReviewAction = (typeof PLACE_REVIEW_ACTIONS)[number];

export async function searchTelegramPlaces(query: string, limit = 6) {
  const trimmed = query.trim();
  if (!trimmed) {
    return [];
  }

  return prisma.venue.findMany({
    where: {
      status: 'ACTIVE',
      OR: [
        { name: { contains: trimmed, mode: 'insensitive' } },
        { slug: { contains: trimmed.toLowerCase().replace(/\s+/g, '-'), mode: 'insensitive' } },
        { city: { contains: trimmed, mode: 'insensitive' } },
        { country: { contains: trimmed, mode: 'insensitive' } },
        { address: { contains: trimmed, mode: 'insensitive' } },
      ],
    },
    orderBy: [
      { isPartner: 'desc' },
      { updatedAt: 'desc' },
    ],
    take: limit,
    select: {
      id: true,
      slug: true,
      name: true,
      address: true,
      city: true,
      country: true,
      latitude: true,
      longitude: true,
      isPartner: true,
      _count: {
        select: {
          placeTags: {
            where: { status: 'APPROVED' },
          },
        },
      },
      placeTags: {
        where: { status: 'APPROVED' },
        orderBy: { submittedAt: 'desc' },
        take: 1,
        select: {
          submittedAt: true,
          heatContribution: true,
        },
      },
    },
  });
}

export async function getPendingTelegramPlaceTags(limit = 10) {
  return prisma.placeTag.findMany({
    where: { status: 'PENDING' },
    orderBy: { submittedAt: 'asc' },
    take: limit,
    select: {
      id: true,
      creatorTag: true,
      walletAddress: true,
      caption: true,
      vibeTags: true,
      firstMark: true,
      submittedAt: true,
      venue: {
        select: {
          slug: true,
          name: true,
          city: true,
          country: true,
        },
      },
    },
  });
}

export async function reviewTelegramPlaceTag(input: {
  tagRef: string;
  action: PlaceReviewAction;
  reason?: string;
  reviewerWallet?: string;
}) {
  const tagRef = input.tagRef.trim();
  const reviewerWallet = input.reviewerWallet ?? 'telegram-admin';

  const existingTag = await prisma.placeTag.findFirst({
    where: {
      OR: [
        { id: tagRef },
        { id: { startsWith: tagRef } },
      ],
    },
    select: {
      id: true,
      venueId: true,
      walletAddress: true,
      creatorTag: true,
      status: true,
      venue: {
        select: {
          slug: true,
          name: true,
        },
      },
    },
  });

  if (!existingTag) {
    return { ok: false as const, error: 'Place tag not found' };
  }

  const now = new Date();

  if (input.action === 'APPROVE') {
    const approvedCount = await prisma.placeTag.count({
      where: {
        venueId: existingTag.venueId,
        status: 'APPROVED',
        NOT: { id: existingTag.id },
      },
    });

    const updatedTag = await prisma.placeTag.update({
      where: { id: existingTag.id },
      data: {
        status: 'APPROVED',
        reviewedAt: now,
        reviewerWallet,
        reviewReason: input.reason || null,
        firstMark: approvedCount === 0,
      },
    });

    await createWalletNotification({
      wallet: existingTag.walletAddress,
      type: 'PLACE_TAG_APPROVED',
      title: 'Your mark is live',
      message: `Your tag at "${existingTag.venue.name}" is now part of the BaseDare memory layer.`,
      link: `/venues/${existingTag.venue.slug}`,
      pushTopic: 'venues',
    }).catch(() => {});

    return {
      ok: true as const,
      tag: existingTag,
      status: updatedTag.status,
      reviewedAt: updatedTag.reviewedAt,
      firstMark: updatedTag.firstMark,
    };
  }

  const nextStatus = input.action === 'FLAG' ? 'FLAGGED' : 'REJECTED';

  const updatedTag = await prisma.placeTag.update({
    where: { id: existingTag.id },
    data: {
      status: nextStatus,
      reviewedAt: now,
      reviewerWallet,
      reviewReason: input.reason || null,
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

  return {
    ok: true as const,
    tag: existingTag,
    status: updatedTag.status,
    reviewedAt: updatedTag.reviewedAt,
    firstMark: false,
  };
}

export async function getTelegramPlaceStats() {
  const [totalPlaces, activePlaces, pendingPlaceTags, approvedPlaceTags, hotPlaces] = await Promise.all([
    prisma.venue.count(),
    prisma.venue.count({ where: { status: 'ACTIVE' } }),
    prisma.placeTag.count({ where: { status: 'PENDING' } }),
    prisma.placeTag.count({ where: { status: 'APPROVED' } }),
    prisma.placeTag.groupBy({
      by: ['venueId'],
      where: { status: 'APPROVED' },
      _count: { _all: true },
      orderBy: {
        _count: {
          venueId: 'desc',
        },
      },
      take: 100,
    }),
  ]);

  return {
    totalPlaces,
    activePlaces,
    pendingPlaceTags,
    approvedPlaceTags,
    hotPlaces: hotPlaces.filter((row) => row._count._all >= 3).length,
  };
}
