import 'server-only';

import type { Prisma, PrismaClient } from '@prisma/client';
import { annotatePrimaryTags } from '@/lib/creator-identity';

export type CampaignTargetingCriteria = {
  niche?: string;
  minFollowers?: number;
  maxFollowers?: number;
  location?: string;
  platforms?: string[];
};

export type StreamerTagCandidate = {
  id: string;
  tag: string;
  walletAddress: string;
  bio: string | null;
  pfpUrl: string | null;
  followerCount: number | null;
  tags: string[];
  status: string;
  identityPlatform: string | null;
  identityHandle: string | null;
  twitterHandle: string | null;
  twitterVerified: boolean;
  twitchHandle: string | null;
  twitchVerified: boolean;
  youtubeHandle: string | null;
  youtubeVerified: boolean;
  kickHandle: string | null;
  kickVerified: boolean;
  totalEarned: number;
  completedDares: number;
};

type VenueAffinitySignal = {
  exactVenueMarks?: number;
  exactVenueCheckIns?: number;
  exactVenueWins?: number;
  sameCityMarks?: number;
};

type CampaignMatchContext = {
  venueAffinity?: VenueAffinitySignal;
};

type CampaignMatchingDb = PrismaClient | Prisma.TransactionClient;

export type RankedCampaignMatchesInput = {
  targeting: CampaignTargetingCriteria;
  venueId?: string | null;
  venueCity?: string | null;
  venueCountry?: string | null;
  limit?: number;
};

export const CAMPAIGN_MATCH_CANDIDATE_SELECT = {
  id: true,
  tag: true,
  walletAddress: true,
  bio: true,
  pfpUrl: true,
  followerCount: true,
  tags: true,
  status: true,
  verificationMethod: true,
  identityPlatform: true,
  identityHandle: true,
  verifiedAt: true,
  twitterHandle: true,
  twitterVerified: true,
  twitchHandle: true,
  twitchVerified: true,
  youtubeHandle: true,
  youtubeVerified: true,
  kickHandle: true,
  kickVerified: true,
  totalEarned: true,
  completedDares: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.StreamerTagSelect;

export function parseCampaignTargetingCriteria(raw: string | null | undefined): CampaignTargetingCriteria {
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as CampaignTargetingCriteria;
    return parsed ?? {};
  } catch {
    return {};
  }
}

function normalizePlatforms(platforms?: string[] | null) {
  return (platforms ?? []).map((platform) => platform.trim().toLowerCase()).filter(Boolean);
}

function splitNicheValues(niche?: string | null) {
  return (niche ?? '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

function candidatePlatforms(candidate: StreamerTagCandidate) {
  return [
    candidate.twitterHandle ? 'twitter' : null,
    candidate.twitchHandle ? 'twitch' : null,
    candidate.youtubeHandle ? 'youtube' : null,
    candidate.kickHandle ? 'kick' : null,
  ].filter(Boolean) as string[];
}

export function buildCampaignMatch(
  candidate: StreamerTagCandidate,
  targeting: CampaignTargetingCriteria,
  context: CampaignMatchContext = {}
) {
  const requiredPlatforms = normalizePlatforms(targeting.platforms);
  const creatorPlatforms = candidatePlatforms(candidate);
  const requestedNiches = splitNicheValues(targeting.niche);
  const reasons: string[] = [];
  let score = 0;
  const venueAffinity = context.venueAffinity ?? {};

  if (candidate.status === 'ACTIVE' || candidate.status === 'VERIFIED') {
    score += 20;
    reasons.push('verified creator identity');
  }

  if (typeof candidate.followerCount === 'number') {
    const followers = candidate.followerCount;
    if (typeof targeting.minFollowers === 'number' && followers >= targeting.minFollowers) {
      score += 25;
      reasons.push(`meets reach floor (${followers.toLocaleString()} followers)`);
    } else if (typeof targeting.minFollowers === 'number') {
      score -= 10;
      reasons.push(`below min reach (${followers.toLocaleString()} followers)`);
    } else {
      score += Math.min(20, Math.floor(followers / 5000));
      reasons.push(`has audience signal (${followers.toLocaleString()} followers)`);
    }

    if (typeof targeting.maxFollowers === 'number' && followers > targeting.maxFollowers) {
      score -= 10;
      reasons.push('above preferred reach ceiling');
    }
  }

  if (requiredPlatforms.length > 0) {
    const platformHits = requiredPlatforms.filter((platform) => creatorPlatforms.includes(platform));
    if (platformHits.length > 0) {
      score += platformHits.length * 12;
      reasons.push(`connected on ${platformHits.join(', ')}`);
    } else {
      score -= 8;
      reasons.push('missing preferred platforms');
    }
  } else if (creatorPlatforms.length > 0) {
    score += 8;
    reasons.push(`connected socials: ${creatorPlatforms.join(', ')}`);
  }

  if (requestedNiches.length > 0) {
    const candidateTags = candidate.tags.map((tag) => tag.toLowerCase());
    const nicheHits = requestedNiches.filter((niche) => candidateTags.includes(niche));
    if (nicheHits.length > 0) {
      score += nicheHits.length * 10;
      reasons.push(`niche fit: ${nicheHits.join(', ')}`);
    } else {
      reasons.push(`niche signal still forming: ${requestedNiches.join(', ')}`);
    }
  }

  if (targeting.location === 'near-venue') {
    reasons.push('location relevance requested for this activation');
  }

  if (candidate.completedDares > 0) {
    score += Math.min(15, candidate.completedDares * 2);
    reasons.push(`${candidate.completedDares} completed BaseDare wins`);
  }

  if (candidate.totalEarned > 0) {
    score += Math.min(10, Math.floor(candidate.totalEarned / 100));
    reasons.push(`earned $${Math.round(candidate.totalEarned)} on BaseDare`);
  }

  if ((venueAffinity.exactVenueMarks ?? 0) > 0) {
    const count = venueAffinity.exactVenueMarks ?? 0;
    score += Math.min(42, count * 18);
    reasons.unshift(`${count} approved mark${count === 1 ? '' : 's'} at this venue`);
  }

  if ((venueAffinity.exactVenueCheckIns ?? 0) > 0) {
    const count = venueAffinity.exactVenueCheckIns ?? 0;
    score += Math.min(24, count * 8);
    reasons.push(`${count} verified check-in${count === 1 ? '' : 's'} here`);
  }

  if ((venueAffinity.exactVenueWins ?? 0) > 0) {
    const count = venueAffinity.exactVenueWins ?? 0;
    score += Math.min(32, count * 14);
    reasons.unshift(`${count} verified win${count === 1 ? '' : 's'} at this venue`);
  }

  if ((venueAffinity.sameCityMarks ?? 0) > 0) {
    const count = venueAffinity.sameCityMarks ?? 0;
    score += Math.min(18, count * 4);
    reasons.push(`active around this city (${count} nearby marks)`);
  }

  return {
    score,
    reasons,
    venueAffinity: {
      exactVenueMarks: venueAffinity.exactVenueMarks ?? 0,
      exactVenueCheckIns: venueAffinity.exactVenueCheckIns ?? 0,
      exactVenueWins: venueAffinity.exactVenueWins ?? 0,
      sameCityMarks: venueAffinity.sameCityMarks ?? 0,
    },
    creator: {
      id: candidate.id,
      tag: candidate.tag,
      walletAddress: candidate.walletAddress,
      bio: candidate.bio,
      pfpUrl: candidate.pfpUrl,
      followerCount: candidate.followerCount,
      tags: candidate.tags,
      status: candidate.status,
      identityPlatform: candidate.identityPlatform,
      identityHandle: candidate.identityHandle,
      totalEarned: candidate.totalEarned,
      completedDares: candidate.completedDares,
      platforms: {
        twitter: candidate.twitterHandle
          ? { handle: candidate.twitterHandle, verified: candidate.twitterVerified }
          : null,
        twitch: candidate.twitchHandle
          ? { handle: candidate.twitchHandle, verified: candidate.twitchVerified }
          : null,
        youtube: candidate.youtubeHandle
          ? { handle: candidate.youtubeHandle, verified: candidate.youtubeVerified }
          : null,
        kick: candidate.kickHandle
          ? { handle: candidate.kickHandle, verified: candidate.kickVerified }
          : null,
      },
    },
  };
}

export async function getRankedCampaignMatches(
  db: CampaignMatchingDb,
  input: RankedCampaignMatchesInput
) {
  const candidates = await db.streamerTag.findMany({
    where: {
      status: { in: ['ACTIVE', 'VERIFIED'] },
    },
    select: CAMPAIGN_MATCH_CANDIDATE_SELECT,
    take: 150,
    orderBy: [{ followerCount: 'desc' }, { completedDares: 'desc' }, { totalEarned: 'desc' }],
  });

  const primaryCandidates = Array.from(
    annotatePrimaryTags(candidates)
      .filter((candidate) => candidate.isPrimary)
      .reduce((map, candidate) => {
        map.set(candidate.walletAddress.toLowerCase(), candidate);
        return map;
      }, new Map<string, (typeof candidates)[number] & { isPrimary: boolean }>())
      .values()
  );

  const venueAffinityByCreator = new Map<
    string,
    {
      exactVenueMarks: number;
      exactVenueCheckIns: number;
      exactVenueWins: number;
      sameCityMarks: number;
    }
  >();

  const venueId = input.venueId ?? null;
  const venueCity = input.venueCity ?? null;
  const venueCountry = input.venueCountry ?? null;

  if (primaryCandidates.length > 0 && (venueId || venueCity)) {
    const candidateTags = primaryCandidates.map((candidate) => candidate.tag);
    const candidateWallets = primaryCandidates.map((candidate) => candidate.walletAddress.toLowerCase());

    const [venueMarks, cityMarks, venueCheckIns, venueWins] = await Promise.all([
      venueId
        ? db.placeTag.findMany({
            where: {
              venueId,
              status: 'APPROVED',
              creatorTag: { in: candidateTags },
            },
            select: {
              creatorTag: true,
            },
          })
        : Promise.resolve([]),
      venueCity
        ? db.placeTag.findMany({
            where: {
              status: 'APPROVED',
              creatorTag: { in: candidateTags },
              ...(venueId ? { NOT: { venueId } } : {}),
              venue: {
                city: venueCity,
                ...(venueCountry ? { country: venueCountry } : {}),
              },
            },
            select: {
              creatorTag: true,
            },
          })
        : Promise.resolve([]),
      venueId
        ? db.venueCheckIn.findMany({
            where: {
              venueId,
              status: 'CONFIRMED',
              walletAddress: { in: candidateWallets },
            },
            select: {
              walletAddress: true,
            },
          })
        : Promise.resolve([]),
      venueId
        ? db.dare.findMany({
            where: {
              venueId,
              status: 'VERIFIED',
              streamerHandle: { in: candidateTags },
            },
            select: {
              streamerHandle: true,
            },
          })
        : Promise.resolve([]),
    ]);

    for (const candidate of primaryCandidates) {
      venueAffinityByCreator.set(candidate.id, {
        exactVenueMarks: venueMarks.filter((mark) => mark.creatorTag === candidate.tag).length,
        exactVenueCheckIns: venueCheckIns.filter(
          (checkIn) => checkIn.walletAddress.toLowerCase() === candidate.walletAddress.toLowerCase()
        ).length,
        exactVenueWins: venueWins.filter((win) => win.streamerHandle === candidate.tag).length,
        sameCityMarks: cityMarks.filter((mark) => mark.creatorTag === candidate.tag).length,
      });
    }
  }

  return primaryCandidates
    .map((candidate) =>
      buildCampaignMatch(candidate, input.targeting, {
        venueAffinity: venueAffinityByCreator.get(candidate.id),
      })
    )
    .sort((left, right) => right.score - left.score)
    .slice(0, input.limit ?? 25);
}
