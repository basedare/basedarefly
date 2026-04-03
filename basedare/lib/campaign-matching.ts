type CampaignTargetingCriteria = {
    niche?: string;
    minFollowers?: number;
    maxFollowers?: number;
    location?: string;
    platforms?: string[];
};

type StreamerTagCandidate = {
    id: string;
    tag: string;
    walletAddress: string;
    bio: string | null;
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

    if ((candidate.status === 'ACTIVE' || candidate.status === 'VERIFIED')) {
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
            bio: candidate.bio,
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
