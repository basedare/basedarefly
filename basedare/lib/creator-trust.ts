type CreatorTrustInput = {
  approvedMissions: number;
  settledMissions: number;
  totalEarned: number;
  uniqueVenues: number;
  firstMarks: number;
  followerCount?: number | null;
};

export type CreatorTrustProfile = {
  level: number;
  label: string;
  score: number;
  summary: string;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function getAudienceScore(followerCount?: number | null) {
  if (!followerCount || followerCount <= 0) return 0;
  if (followerCount >= 1_000_000) return 5;
  if (followerCount >= 250_000) return 4;
  if (followerCount >= 50_000) return 3;
  if (followerCount >= 10_000) return 2;
  if (followerCount >= 1_000) return 1;
  return 0;
}

function getTrustLabel(level: number) {
  if (level >= 5) return 'Apex';
  if (level >= 4) return 'Signal';
  if (level >= 3) return 'Trusted';
  if (level >= 2) return 'Proven';
  return 'Fresh';
}

function getTrustSummary(input: CreatorTrustInput, level: number) {
  if (input.approvedMissions <= 0) {
    return 'No approved missions yet. Trust starts compounding after the first cleared dare.';
  }

  if (level >= 5) {
    return 'High-trust operator with repeat proof, venue spread, and enough reps to matter to brands.';
  }

  if (level >= 4) {
    return 'Strong proof-of-execution across the grid. Businesses can already read real signal here.';
  }

  if (level >= 3) {
    return 'Clear delivery history with enough approved missions to feel credible beyond pure socials.';
  }

  if (level >= 2) {
    return 'Early proof is showing up. A few more approved missions will harden this profile fast.';
  }

  return 'Fresh on the board, but at least one approved mission is now on record.';
}

export function deriveCreatorTrustProfile(input: CreatorTrustInput): CreatorTrustProfile {
  const missionScore = Math.min(35, input.approvedMissions * 7);
  const settlementScore = Math.min(20, input.settledMissions * 4);
  const venueScore = Math.min(20, input.uniqueVenues * 4);
  const sparkScore = Math.min(15, input.firstMarks * 5);
  const earningsScore = Math.min(5, Math.floor(input.totalEarned / 100));
  const audienceScore = getAudienceScore(input.followerCount);

  const score = clamp(
    missionScore + settlementScore + venueScore + sparkScore + earningsScore + audienceScore,
    0,
    100
  );

  const level =
    score >= 80 ? 5 :
    score >= 60 ? 4 :
    score >= 40 ? 3 :
    score >= 20 ? 2 :
    input.approvedMissions > 0 || input.uniqueVenues > 0 ? 1 : 0;

  return {
    level,
    label: getTrustLabel(level),
    score,
    summary: getTrustSummary(input, level),
  };
}
