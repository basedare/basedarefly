import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CURATED_SIARGAO_VENUES, getCuratedVenueSlugsForQuery } from '@/lib/curated-venues';
import { hasRecordedRewardFunding } from '@/lib/reward-funding';
import { isCreatorMissionAvailable, isPublicFacingDareTitle } from '@/lib/creator-mission-policy';
import { readContentDelivery } from '@/lib/content-delivery';
import { contentRightsReleaseEnabled } from '@/lib/content-rights-server';
import { getViewerWallet } from '@/lib/meetups-server';
import { resolveSocialTargets, socialContext } from '@/lib/social-targets-server';
import { checkRateLimit, getClientIp } from '@/lib/rate-limit';

// ============================================================================
// GET /api/search - Universal app search for places, creators, dares, and actions.
// ============================================================================

type UniversalSearchResult = {
    type: 'place' | 'streamer' | 'dare' | 'action';
    title: string;
    subtitle: string;
    url: string;
    eyebrow?: string;
};

type SearchIntent = {
    key: string;
    label: string;
    aliases: string[];
    categories: string[];
};

const SEARCH_INTENTS: SearchIntent[] = [
    {
        key: 'breakfast',
        label: 'Breakfast',
        aliases: ['breakfast', 'brunch', 'morning', 'smoothie', 'smoothie bowl', 'acai', 'pancake', 'bakery', 'healthy', 'vegan'],
        categories: ['breakfast', 'brunch', 'morning', 'smoothie-bowl', 'smoothie', 'cafe', 'coffee', 'healthy', 'organic', 'bakery'],
    },
    {
        key: 'coffee',
        label: 'Coffee',
        aliases: ['coffee', 'cafe', 'work', 'laptop', 'wifi', 'wi-fi', 'coworking', 'remote work'],
        categories: ['coffee', 'cafe', 'work-friendly', 'coworking', 'breakfast', 'brunch'],
    },
    {
        key: 'food',
        label: 'Food',
        aliases: ['food', 'eat', 'restaurant', 'lunch', 'dinner', 'late food', 'late night'],
        categories: ['food', 'restaurant', 'lunch', 'dinner', 'late-night', 'pizza', 'tacos', 'tapas'],
    },
    {
        key: 'nightlife',
        label: 'Night',
        aliases: ['bar', 'bars', 'drink', 'drinks', 'night', 'nightlife', 'party', 'late'],
        categories: ['bar', 'nightlife', 'late-night', 'music', 'beach-club', 'sports-bar'],
    },
    {
        key: 'beach',
        label: 'Beach',
        aliases: ['beach', 'sunset', 'sunrise', 'surf', 'swim'],
        categories: ['beach', 'surf', 'sunset', 'sunrise', 'surf-view', 'boardwalk'],
    },
    {
        key: 'trendy',
        label: 'Trendy',
        aliases: ['trendy', 'cool spots', 'rooftop', 'sunset spot', 'date spot', 'events'],
        categories: ['trendy', 'rooftop', 'sunset', 'events', 'coworking', 'social', 'beachfront'],
    },
];

function normalizeToken(input: string) {
    return input.trim().toLowerCase().replace(/[\s_]+/g, '-');
}

function getSearchIntents(query: string) {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return [];
    return SEARCH_INTENTS.filter((intent) => intent.aliases.some((alias) => normalized.includes(alias)));
}

function getCategoryTokens(query: string) {
    const queryTokens = query
        .split(/\s+/)
        .map(normalizeToken)
        .filter((token) => token.length >= 2);
    const intentTokens = getSearchIntents(query).flatMap((intent) => intent.categories);
    return Array.from(new Set([...queryTokens, ...intentTokens]));
}

function getIntentLabelsForCategories(categories: string[] = [], preferredKeys: string[] = []) {
    const categorySet = new Set(categories.map(normalizeToken));
    const matches = SEARCH_INTENTS
        .filter((intent) => intent.categories.some((category) => categorySet.has(normalizeToken(category))))
        .map((intent) => ({ key: intent.key, label: intent.label }));
    const preferred = preferredKeys
        .map((key) => matches.find((intent) => intent.key === key)?.label ?? null)
        .filter((label): label is string => Boolean(label));
    const fallback = matches.map((intent) => intent.label).filter((label) => !preferred.includes(label));
    return [...preferred, ...fallback].slice(0, 2);
}

function buildActionResults(query: string, intents: SearchIntent[]): UniversalSearchResult[] {
    const normalized = query.trim().toLowerCase();
    const results: UniversalSearchResult[] = [];

    if (intents.length > 0) {
        const intent = intents[0];
        results.push({
            type: 'action',
            eyebrow: 'Map intent',
            title: `Find ${intent.label.toLowerCase()} spots`,
            subtitle: 'Open the map with this search ready',
            url: `/map?q=${encodeURIComponent(intent.key)}`,
        });
    }

    if (/(first spark|pilot|activate|activation|venue|mission)/i.test(normalized)) {
        results.push({
            type: 'action',
            eyebrow: 'Paid pilot',
            title: 'Run First Spark',
            subtitle: 'One venue, one proof path, one recap',
            url: '/first-spark',
        });
    }

    if (/(create|dare|bounty|fund)/i.test(normalized)) {
        results.push({
            type: 'action',
            eyebrow: 'Create',
            title: 'Create a dare',
            subtitle: 'Fund a proof request',
            url: `/create?title=${encodeURIComponent(query.trim())}`,
        });
    }

    return results.slice(0, 3);
}

export async function GET(request: NextRequest) {
    if(!checkRateLimit('universal-search:'+getClientIp(request),{limit:60,windowMs:60000}).allowed) return NextResponse.json({success:false,error:'Please wait before searching again.'},{status:429,headers:{'Cache-Control':'private, no-store'}});
    try {
        const { searchParams } = new URL(request.url);
        const query = searchParams.get('q');

        if (!query || query.trim().length === 0) {
            return NextResponse.json({ success: true, results: { streamers: [], dares: [] } });
        }

        const searchTerm = query.trim();
        if (searchTerm.length > 120) return NextResponse.json({success:false,error:'Use a shorter search.'},{status:400,headers:{'Cache-Control':'private, no-store'}});
        const normalizedSearchTerm = searchTerm.toLowerCase();
        const normalizedSlugQuery = normalizedSearchTerm.replace(/\s+/g, '-');
        const normalizedTagQuery = searchTerm.replace(/^#/, '').toLowerCase();
        const intents = getSearchIntents(searchTerm);
        const intentKeys = intents.map((intent) => intent.key);
        const categoryTokens = getCategoryTokens(searchTerm);
        const searchTokens = searchTerm
            .split(/\s+/)
            .map((token) => token.trim())
            .filter((token) => token.length >= 2);
        const recentSince = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const curatedSlugsForQuery = getCuratedVenueSlugsForQuery(searchTerm);

        const categoryClauses =
            categoryTokens.length > 0
                ? [
                      { categories: { hasSome: categoryTokens } },
                      {
                          placeTags: {
                              some: {
                                  status: 'APPROVED',
                                  vibeTags: { hasSome: categoryTokens },
                              },
                          },
                      },
                  ]
                : [];
        const tokenClauses = searchTokens.flatMap((token) => [
            { name: { contains: token, mode: 'insensitive' as const } },
            { slug: { contains: token.toLowerCase(), mode: 'insensitive' as const } },
            { city: { contains: token, mode: 'insensitive' as const } },
            { country: { contains: token, mode: 'insensitive' as const } },
            { address: { contains: token, mode: 'insensitive' as const } },
        ]);

        const venues = await prisma.venue.findMany({
            where: {
                status: 'ACTIVE',
                OR: [
                    { name: { contains: searchTerm, mode: 'insensitive' } },
                    { slug: { contains: normalizedSlugQuery, mode: 'insensitive' } },
                    { city: { contains: searchTerm, mode: 'insensitive' } },
                    { country: { contains: searchTerm, mode: 'insensitive' } },
                    { address: { contains: searchTerm, mode: 'insensitive' } },
                    ...categoryClauses,
                    ...tokenClauses,
                ],
            },
            take: 8,
            select: {
                id: true,
                slug: true,
                name: true,
                address: true,
                city: true,
                country: true,
                categories: true,
                isPartner: true,
                updatedAt: true,
                checkIns: {
                    where: {
                        status: 'CONFIRMED',
                        scannedAt: { gte: recentSince },
                    },
                    select: { id: true },
                },
                dares: {
                    where: {
                        NOT: {
                            OR: [
                                { status: { in: ['EXPIRED', 'FAILED', 'VERIFIED'] } },
                                { expiresAt: { lt: new Date() } },
                            ],
                        },
                    },
                    select: { id: true },
                },
            },
            orderBy: [
                { isPartner: 'desc' },
                { updatedAt: 'desc' },
            ],
        });

        const tagSummaryMap =
            venues.length > 0
                ? await prisma.placeTag.groupBy({
                      by: ['venueId'],
                      where: {
                          status: 'APPROVED',
                          venueId: { in: venues.map((venue) => venue.id) },
                      },
                      _count: { _all: true },
                  })
                : [];
        const tagSummaryByVenueId = new Map(
            tagSummaryMap.map((summary) => [summary.venueId, summary._count._all])
        );

        const streamers = await prisma.streamerTag.findMany({
            where: {
                status: { in: ['ACTIVE', 'VERIFIED'] },
                revokedAt: null,
                OR: [
                    {
                        tag: {
                            contains: searchTerm,
                            mode: 'insensitive', // ILIKE equivalent
                        },
                    },
                    { twitterHandle: { contains: searchTerm, mode: 'insensitive' } },
                    { twitchHandle: { contains: searchTerm, mode: 'insensitive' } },
                    { youtubeHandle: { contains: searchTerm, mode: 'insensitive' } },
                    { kickHandle: { contains: searchTerm, mode: 'insensitive' } },
                    { tags: { has: normalizedTagQuery } },
                ],
            },
            take: 5,
            select: {
                id: true,
                tag: true,
                walletAddress: true,
                tags: true,
            },
        });

        const dares = await prisma.dare.findMany({
            where: {
                status: 'PENDING',
                claimedBy: null,
                targetWalletAddress: null,
                AND: [
                    { OR: [{venueId:null},{venue:{status:'ACTIVE'}}] },
                    { OR: [{expiresAt:null},{expiresAt:{gt:new Date()}}] },
                    { OR: [{claimRequestStatus:null},{claimRequestStatus:'REJECTED'}] },
                    { OR: [{streamerHandle:null},{streamerHandle:{in:['@open','@everyone'],mode:'insensitive'}}] },
                    { OR: [{bounty:0,tag:'community'},{bounty:{gt:0},isSimulated:false,txHash:{not:null},onChainDareId:{not:null}}] },
                ],
                OR: [
                    { title: { contains: searchTerm, mode: 'insensitive' } },
                    { streamerHandle: { contains: normalizedTagQuery, mode: 'insensitive' } },
                    { locationLabel: { contains: searchTerm, mode: 'insensitive' } },
                ],
            },
            take: 5,
            select: {
                id: true,
                shortId: true,
                title: true,
                bounty: true,
                status: true,
                streamerHandle: true,
                tag: true, isSimulated: true, txHash: true, onChainDareId: true, missionMode: true,
                venueId: true,
                claimedBy: true, targetWalletAddress: true, claimRequestStatus: true, expiresAt: true, outcomeContractSnapshot: true,
            },
        });

        const context = await socialContext(await getViewerWallet());
        const publicTargets = await resolveSocialTargets([
            ...venues.map(v=>({kind:'VENUE' as const,key:v.id})),
            ...streamers.map(s=>({kind:'PERSON' as const,key:s.id})),
            ...dares.flatMap(d=>d.venueId?[{kind:'VENUE' as const,key:d.venueId}]:[]),
        ],context);
        const knownCurated = curatedSlugsForQuery.length ? await prisma.venue.findMany({where:{slug:{in:curatedSlugsForQuery}},select:{slug:true}}) : [];
        const placesFromDb = venues.filter(v=>publicTargets.has('VENUE:'+v.id))
            .map((venue) => {
                const categoryMatchCount = categoryTokens.filter((token) =>
                    venue.categories.map(normalizeToken).includes(token)
                ).length;
                const exactNameMatch = venue.name.toLowerCase().includes(normalizedSearchTerm);
                const proofCount = tagSummaryByVenueId.get(venue.id) ?? 0;
                const intentLabels = getIntentLabelsForCategories(venue.categories, intentKeys);
                const signalParts = [
                    ...intentLabels,
                    venue.checkIns.length > 0 ? `${venue.checkIns.length} check-in${venue.checkIns.length === 1 ? '' : 's'} today` : null,
                    proofCount > 0 ? `${proofCount} proof${proofCount === 1 ? '' : 's'}` : null,
                    venue.dares.length > 0 ? 'Take proof here' : null,
                ].filter(Boolean);
                const score =
                    (exactNameMatch ? 120 : 0) +
                    categoryMatchCount * 32 +
                    venue.dares.length * 24 +
                    venue.checkIns.length * 16 +
                    proofCount * 9 +
                    (venue.isPartner ? 8 : 0);

                return {
                    type: 'place' as const,
                    slug: venue.slug,
                    title: venue.name,
                    subtitle:
                        signalParts.join(' · ') ||
                        [venue.address, venue.city, venue.country].filter(Boolean).join(', ') ||
                        'Open on map',
                    url: `/map?place=${encodeURIComponent(venue.slug)}&q=${encodeURIComponent(searchTerm)}`,
                    eyebrow: 'Place',
                    score,
                };
            })
            .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
            .slice(0, 6);
        const dbPlaceSlugSet = new Set(knownCurated.map((venue) => venue.slug));
        const curatedFallbackPlaces = CURATED_SIARGAO_VENUES
            .filter((venue) => curatedSlugsForQuery.includes(venue.slug) && !dbPlaceSlugSet.has(venue.slug))
            .map((venue) => {
                const categoryMatchCount = categoryTokens.filter((token) =>
                    venue.categories.map(normalizeToken).includes(token)
                ).length;
                const exactNameMatch = venue.name.toLowerCase().includes(normalizedSearchTerm);
                const intentLabels = getIntentLabelsForCategories(venue.categories, intentKeys);
                const signalParts = [
                    ...intentLabels,
                    [venue.city, venue.country].filter(Boolean).join(', '),
                ].filter(Boolean);

                return {
                    type: 'place' as const,
                    slug: venue.slug,
                    title: venue.name,
                    subtitle: signalParts.join(' · ') || 'Open on map',
                    url: `/map?q=${encodeURIComponent(venue.name)}`,
                    eyebrow: 'Curated map suggestion · check current details',
                    score: (exactNameMatch ? 110 : 0) + categoryMatchCount * 28,
                };
            })
            .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title));

        const places = [...placesFromDb, ...curatedFallbackPlaces]
            .sort((a, b) => b.score - a.score || a.title.localeCompare(b.title))
            .slice(0, 6)
            .map(({ score, slug, ...place }) => {
                void score;
                void slug;
                return place;
            });

        const actions = buildActionResults(searchTerm, intents);

        return NextResponse.json({
            success: true,
            results: {
                places,
                streamers: streamers.filter(s=>publicTargets.has('PERSON:'+s.id)).map(s => ({
                    type: 'streamer',
                    title: `@${s.tag.replace(/^@+/, '')}`,
                    subtitle: s.tags && s.tags.length > 0 ? s.tags.slice(0,3).map(t=>'#'+t).join(' ') : 'Public creator profile',
                    url: `/creator/${encodeURIComponent(s.tag.replace(/^@+/, '').toLowerCase())}`,
                    eyebrow: 'Creator',
                })),
                dares: dares.filter(d => (!d.venueId || publicTargets.has('VENUE:'+d.venueId)) && isPublicFacingDareTitle(d.title) && (d.bounty === 0 || (hasRecordedRewardFunding(d) && isCreatorMissionAvailable(d) && (!readContentDelivery(d.outcomeContractSnapshot) || contentRightsReleaseEnabled())))).map(d => ({
                    type: 'dare',
                    title: d.title,
                    subtitle: d.bounty === 0 ? 'Free challenge · see participation requirements' : `$${d.bounty} USDC recorded reward · check brief and availability`,
                    url: `/dare/${d.shortId || d.id}`,
                    eyebrow: 'Dare',
                })),
                actions,
            },
        }, {headers:{'Cache-Control':'private, no-store'}});
    } catch {
        console.error('[SEARCH] Query could not complete.');
        return NextResponse.json(
            { success: false, error: 'Failed to perform search' },
            { status: 503, headers:{'Cache-Control':'private, no-store'} }
        );
    }
}
