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
    bio: string | null;
    followerCount: number | null;
    tags: string[];
    status: string;
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

function candidatePlatforms(candidate: StreamerTagCandidate) {
    return [
        candidate.twitterHandle ? 'twitter' : null,
        candidate.twitchHandle ? 'twitch' : null,
        candidate.youtubeHandle ? 'youtube' : null,
        candidate.kickHandle ? 'kick' : null,
    ].filter(Boolean) as string[];
}

export function buildCampaignMatch(candidate: StreamerTagCandidate, targeting: CampaignTargetingCriteria) {
    const requiredPlatforms = normalizePlatforms(targeting.platforms);
    const creatorPlatforms = candidatePlatforms(candidate);
    const reasons: string[] = [];
    let score = 0;

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
            score -= 30;
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
            score -= 18;
            reasons.push('missing preferred platforms');
        }
    } else if (creatorPlatforms.length > 0) {
        score += 8;
        reasons.push(`connected socials: ${creatorPlatforms.join(', ')}`);
    }

    const normalizedNiche = targeting.niche?.trim().toLowerCase();
    if (normalizedNiche) {
        const nicheMatch = candidate.tags.some((tag) => tag.toLowerCase() === normalizedNiche);
        if (nicheMatch) {
            score += 18;
            reasons.push(`niche match: ${targeting.niche}`);
        } else {
            reasons.push(`niche not yet confirmed: ${targeting.niche}`);
        }
    }

    if (candidate.completedDares > 0) {
        score += Math.min(15, candidate.completedDares * 2);
        reasons.push(`${candidate.completedDares} completed BaseDare wins`);
    }

    if (candidate.totalEarned > 0) {
        score += Math.min(10, Math.floor(candidate.totalEarned / 100));
        reasons.push(`earned $${Math.round(candidate.totalEarned)} on BaseDare`);
    }

    return {
        score,
        reasons,
        creator: {
            id: candidate.id,
            tag: candidate.tag,
            bio: candidate.bio,
            followerCount: candidate.followerCount,
            tags: candidate.tags,
            status: candidate.status,
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

