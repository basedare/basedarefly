import 'server-only';

import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import type { VenueRecentTag, VenueTagSummary } from '@/lib/venue-types';

const EMPTY_TAG_SUMMARY: VenueTagSummary = {
  approvedCount: 0,
  heatScore: 0,
  lastTaggedAt: null,
};

export function isPlaceTagTableMissingError(error: unknown) {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2021') {
    return true;
  }

  if (error instanceof Error) {
    return error.message.includes('PlaceTag');
  }

  return false;
}

export async function getApprovedTagSummaryMap(venueIds: string[]) {
  if (venueIds.length === 0) {
    return new Map<string, VenueTagSummary>();
  }

  try {
    const rows = await prisma.placeTag.groupBy({
      by: ['venueId'],
      where: {
        venueId: { in: venueIds },
        status: 'APPROVED',
      },
      _count: { _all: true },
      _sum: { heatContribution: true },
      _max: { submittedAt: true },
    });

    return new Map(
      rows.map((row) => [
        row.venueId,
        {
          approvedCount: row._count._all,
          heatScore: row._sum.heatContribution ?? 0,
          lastTaggedAt: row._max.submittedAt?.toISOString() ?? null,
        } satisfies VenueTagSummary,
      ])
    );
  } catch (error) {
    if (isPlaceTagTableMissingError(error)) {
      return new Map<string, VenueTagSummary>();
    }

    throw error;
  }
}

export function getVenueTagSummary(
  summaryMap: Map<string, VenueTagSummary>,
  venueId: string
): VenueTagSummary {
  return summaryMap.get(venueId) ?? EMPTY_TAG_SUMMARY;
}

export async function getRecentApprovedPlaceTagsByVenueId(
  venueId: string,
  limit = 5
): Promise<VenueRecentTag[]> {
  try {
    const tags = await prisma.placeTag.findMany({
      where: {
        venueId,
        status: 'APPROVED',
      },
      orderBy: { submittedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        creatorTag: true,
        walletAddress: true,
        caption: true,
        vibeTags: true,
        proofMediaUrl: true,
        proofType: true,
        source: true,
        submittedAt: true,
        firstMark: true,
      },
    });

    return tags.map((tag) => ({
      id: tag.id,
      creatorTag: tag.creatorTag,
      walletAddress: tag.walletAddress,
      caption: tag.caption,
      vibeTags: tag.vibeTags,
      proofMediaUrl: tag.proofMediaUrl,
      proofType: tag.proofType,
      source: tag.source,
      submittedAt: tag.submittedAt.toISOString(),
      firstMark: tag.firstMark,
    }));
  } catch (error) {
    if (isPlaceTagTableMissingError(error)) {
      return [];
    }

    throw error;
  }
}
