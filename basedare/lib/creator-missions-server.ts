import 'server-only';

import { prisma } from '@/lib/prisma';
import {
  buildCreatorMissionCopy,
  calculateCreatorPayout,
  isCreatorMissionAvailable,
  isPublicFacingDareTitle,
} from '@/lib/creator-mission-policy';

export type CreatorMission = {
  id: string;
  shortId: string;
  title: string;
  typeLabel: string;
  family: 'FIELD_TRUTH' | 'EXPERIENCE_EXECUTION' | 'PUBLICATION';
  locationLabel: string;
  venueName: string | null;
  venueSlug: string | null;
  expiresAt: Date | null;
  grossReward: number;
  creatorPayout: number;
  whatToMake: string;
  submitLabel: string;
  proofDetail: string;
  safety: string[];
  prohibited: string[];
  baseDareCanDisplay: boolean;
  sponsorReuseNeedsOptIn: boolean;
  isAvailable: boolean;
  status: string;
  claimRequestWallet: string | null;
  claimRequestStatus: string | null;
};

const creatorMissionSelect = {
  id: true,
  shortId: true,
  title: true,
  bounty: true,
  isSimulated: true,
  missionMode: true,
  tag: true,
  streamerHandle: true,
  status: true,
  expiresAt: true,
  claimedBy: true,
  targetWalletAddress: true,
  claimRequestWallet: true,
  claimRequestStatus: true,
  locationLabel: true,
  outcomeContractSnapshot: true,
  venue: {
    select: {
      name: true,
      slug: true,
      city: true,
    },
  },
} as const;

type CreatorMissionRow = Awaited<ReturnType<typeof fetchMissionRows>>[number];

async function fetchMissionRows() {
  const now = new Date();
  return prisma.dare.findMany({
    where: {
      status: 'PENDING',
      bounty: { gt: 0 },
      isSimulated: false,
      claimedBy: null,
      targetWalletAddress: null,
      claimRequestStatus: null,
      AND: [
        { OR: [{ expiresAt: null }, { expiresAt: { gte: now } }] },
        {
          OR: [
            { streamerHandle: null },
            { streamerHandle: { equals: '@open', mode: 'insensitive' } },
            { streamerHandle: { equals: '@everyone', mode: 'insensitive' } },
          ],
        },
      ],
    },
    select: creatorMissionSelect,
    orderBy: [{ bounty: 'desc' }, { createdAt: 'desc' }],
    take: 24,
  });
}

function shapeCreatorMission(row: CreatorMissionRow, now = new Date()): CreatorMission {
  const copy = buildCreatorMissionCopy({
    title: row.title,
    missionMode: row.missionMode,
    tag: row.tag,
    outcomeContractSnapshot: row.outcomeContractSnapshot,
  });

  return {
    id: row.id,
    shortId: row.shortId ?? row.id,
    title: row.title,
    typeLabel: copy.typeLabel,
    family: copy.family,
    locationLabel:
      row.locationLabel?.trim() ||
      row.venue?.name ||
      row.venue?.city ||
      (row.missionMode === 'STREAM' ? 'Online' : 'Mission location'),
    venueName: row.venue?.name ?? null,
    venueSlug: row.venue?.slug ?? null,
    expiresAt: row.expiresAt,
    grossReward: row.bounty,
    creatorPayout: calculateCreatorPayout(row.bounty),
    whatToMake: copy.whatToMake,
    submitLabel: copy.submitLabel,
    proofDetail: copy.proofDetail,
    safety: copy.safety,
    prohibited: copy.prohibited,
    baseDareCanDisplay: copy.baseDareCanDisplay,
    sponsorReuseNeedsOptIn: copy.sponsorReuseNeedsOptIn,
    isAvailable: isCreatorMissionAvailable(row, now),
    status: row.status,
    claimRequestWallet: row.claimRequestWallet,
    claimRequestStatus: row.claimRequestStatus,
  };
}

export async function getCreatorMissions(): Promise<CreatorMission[]> {
  try {
    const now = new Date();
    const rows = await fetchMissionRows();
    return rows
      .filter((row) => isCreatorMissionAvailable(row, now))
      .map((row) => shapeCreatorMission(row, now));
  } catch (error) {
    console.error('[CREATOR MISSIONS] Unable to load open missions:', error);
    return [];
  }
}

export async function getCreatorMissionByShortId(shortId: string): Promise<CreatorMission | null> {
  try {
    const row = await prisma.dare.findFirst({
      where: {
        OR: [{ shortId }, { id: shortId }],
        bounty: { gt: 0 },
        isSimulated: false,
      },
      select: creatorMissionSelect,
    });
    if (!row || !isPublicFacingDareTitle(row.title)) return null;
    return shapeCreatorMission(row);
  } catch (error) {
    console.error('[CREATOR MISSIONS] Unable to load mission:', error);
    return null;
  }
}
