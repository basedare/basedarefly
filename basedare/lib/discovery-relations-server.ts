import "server-only";

import { momentCreditAllowed, publicMomentAllowed } from "./adventure-evidence";
import { record } from "./community-stories";
import { momentInclude, momentPosts } from "./moment-server";
import { prisma } from "./prisma";
import { referenceId, type SocialReference } from "./social-retention";
import {
  canonicalReference,
  resolveSocialTargets,
  socialContext,
} from "./social-targets-server";

export type DiscoveryRelationReference = {
  kind: "VENUE" | "MOMENT" | "STORY" | "PERSON";
  key: string;
};
export type DiscoveryRelationNode = {
  kind: string;
  key: string;
  title: string;
  summary: string;
  label: string;
  href: string;
};
export type DiscoveryRelations = {
  source: Pick<DiscoveryRelationNode, "kind" | "key" | "title" | "href">;
  nodes: DiscoveryRelationNode[];
  limited: boolean;
};

const SOURCE_LIMIT = 8;
const NODE_LIMIT = 24;
const relatedMomentInclude = {
  venue: { select: { ...momentInclude.venue.select, id: true } },
} as const;

/** Current canonical relations only. A place attachment never asserts attendance. */
export async function getDiscoveryRelations(
  input: DiscoveryRelationReference,
  viewerWallet: string | null = null,
  now = new Date()
): Promise<DiscoveryRelations | null> {
  const ref = await canonicalReference(input);
  const context = await socialContext(viewerWallet);
  const initial = (await resolveSocialTargets([ref], context, now)).get(
    referenceId(ref)
  );
  if (!initial) return null;

  let venueId: string | undefined;
  let venueSlug: string | undefined;
  let personId: string | undefined;
  let personWallet: string | undefined;
  let sourceMomentWallet: string | undefined;
  if (ref.kind === "VENUE") {
    const venue = await prisma.venue.findFirst({
      where: { id: ref.key, status: "ACTIVE" },
      select: { id: true, slug: true },
    });
    if (!venue) return null;
    venueId = venue.id;
    venueSlug = venue.slug;
  } else if (ref.kind === "PERSON") {
    personId = initial.personId;
    personWallet = initial.personWallet;
  } else if (ref.kind === "STORY") {
    const story = await prisma.founderEvent.findUnique({
      where: { id: ref.key },
      include: { venue: { select: { slug: true } } },
    });
    if (!story) return null;
    const metadata = record(story.metadataJson);
    personId =
      typeof metadata.authorTagId === "string"
        ? metadata.authorTagId
        : undefined;
    personWallet =
      typeof metadata.authorWallet === "string"
        ? metadata.authorWallet
        : undefined;
    venueId = story.venueId ?? undefined;
    venueSlug = story.venue?.slug;
  } else {
    const moment = await prisma.adventureSubmission.findUnique({
      where: { id: ref.key },
      include: relatedMomentInclude,
    });
    if (!moment) return null;
    sourceMomentWallet = moment.wallet.toLowerCase();
    venueId = moment.venue?.id;
    venueSlug = moment.venue?.slug;
    const post = (await momentPosts([moment]))[0];
    // Display consent alone does not authorize a creator association.
    if (post?.creatorTag && momentCreditAllowed(moment)) {
      const creator = await prisma.streamerTag.findFirst({
        where: {
          tag: post.creatorTag,
          walletAddress: { equals: moment.wallet, mode: "insensitive" },
          status: { in: ["ACTIVE", "VERIFIED"] },
          revokedAt: null,
        },
        select: { id: true, walletAddress: true },
      });
      personId = creator?.id;
      personWallet = creator?.walletAddress.toLowerCase();
    }
  }

  const horizon = new Date(now.getTime() + 7 * 86400000);
  const anchored = Boolean(venueId || personId);
  const [stories, moments, events, meetups] = await Promise.all([
    anchored
      ? prisma.founderEvent.findMany({
          where: {
            eventType: "LOCAL_SIGNAL",
            subjectType: "community_story",
            status: "APPROVED",
            ...(venueId
              ? { venueId }
              : { metadataJson: { path: ["authorTagId"], equals: personId! } }),
          },
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: SOURCE_LIMIT + 1,
        })
      : [],
    venueSlug || personWallet
      ? prisma.adventureSubmission.findMany({
          where: {
            status: "APPROVED",
            ...(venueSlug
              ? { venueSlug }
              : {
                  wallet: { equals: personWallet!, mode: "insensitive" },
                  OR: [
                    { creatorCreditConsent: true },
                    {
                      creatorCreditConsent: null,
                      publicConsentVersion: "adventure-display-v1",
                    },
                  ],
                }),
          },
          include: relatedMomentInclude,
          orderBy: [{ createdAt: "desc" }, { id: "asc" }],
          take: SOURCE_LIMIT + 1,
        })
      : [],
    venueId
      ? prisma.venueEvent.findMany({
          where: {
            venueId,
            status: "PUBLISHED",
            expiresAt: { gt: now },
            startsAt: { lte: horizon },
            OR: [
              { endsAt: { gt: now } },
              { endsAt: null, startsAt: { gte: now } },
            ],
          },
          select: { id: true },
          orderBy: [{ startsAt: "asc" }, { id: "asc" }],
          take: SOURCE_LIMIT + 1,
        })
      : [],
    anchored
      ? prisma.meetup.findMany({
          where: {
            status: "active",
            startTime: { gte: now, lte: horizon },
            ...(venueId ? { venueId } : { creatorBaretagId: personId! }),
          },
          select: { id: true, venueId: true },
          orderBy: [{ startTime: "asc" }, { id: "asc" }],
          take: SOURCE_LIMIT + 1,
        })
      : [],
  ]);

  const candidates: Array<
    SocialReference & {
      label: string;
      requires?: string;
      creditedWallet?: string;
      creditMomentId?: string;
    }
  > = [];
  const add = (
    kind: SocialReference["kind"],
    key: string | undefined,
    label: string,
    requires?: string,
    creditedWallet?: string,
    creditMomentId?: string
  ) => {
    if (key && referenceId({ kind, key }) !== referenceId(ref))
      candidates.push({
        kind,
        key,
        label,
        requires,
        creditedWallet,
        creditMomentId,
      });
  };
  add("VENUE", venueId, "Place attached to this post");
  add(
    "PERSON",
    personId,
    "Public creator credit",
    undefined,
    personWallet?.toLowerCase(),
    ref.kind === "MOMENT" ? ref.key : undefined
  );
  for (const row of stories.slice(0, SOURCE_LIMIT))
    add(
      "STORY",
      row.id,
      venueId
        ? "Community story at this place"
        : "Story credited to this profile"
    );
  for (const row of moments.slice(0, SOURCE_LIMIT))
    add(
      "MOMENT",
      row.id,
      venueId ? "Moment shared with this place" : "Moment with creator credit",
      undefined,
      venueSlug ? undefined : personWallet?.toLowerCase(),
      venueSlug ? undefined : row.id
    );
  for (const row of events.slice(0, SOURCE_LIMIT))
    add("ACTIVITY", "venue_event:" + row.id, "Upcoming event at this place");
  for (const row of meetups.slice(0, SOURCE_LIMIT))
    add(
      "ACTIVITY",
      "meetup:" + row.id,
      venueId
        ? "Upcoming public meetup at this place"
        : "Public meetup hosted by this profile"
    );

  const eligible = await resolveSocialTargets(candidates, context, now);
  for (const row of stories.slice(0, SOURCE_LIMIT)) {
    const parent = referenceId({ kind: "STORY", key: row.id });
    if (!eligible.has(parent)) continue;
    const metadata = record(row.metadataJson);
    if (
      typeof metadata.authorTagId === "string" &&
      typeof metadata.authorWallet === "string"
    )
      add(
        "PERSON",
        metadata.authorTagId,
        "Credited on a public story",
        parent,
        metadata.authorWallet.toLowerCase()
      );
    add(
      "VENUE",
      row.venueId ?? undefined,
      "Place attached to a public story",
      parent
    );
  }
  const creditedMoments = moments
    .slice(0, SOURCE_LIMIT)
    .filter(
      (row) =>
        momentCreditAllowed(row) &&
        eligible.has(referenceId({ kind: "MOMENT", key: row.id }))
    );
  const creditedPosts = await momentPosts(creditedMoments);
  const creators = creditedPosts.length
    ? await prisma.streamerTag.findMany({
        where: {
          status: { in: ["ACTIVE", "VERIFIED"] },
          revokedAt: null,
          OR: creditedPosts.flatMap((post) => {
            const row = creditedMoments.find(
              (moment) => moment.id === post.id
            )!;
            return post.creatorTag
              ? [
                  {
                    tag: post.creatorTag,
                    walletAddress: {
                      equals: row.wallet,
                      mode: "insensitive" as const,
                    },
                  },
                ]
              : [];
          }),
        },
        select: { id: true, tag: true, walletAddress: true },
        take: SOURCE_LIMIT,
      })
    : [];
  for (const row of moments.slice(0, SOURCE_LIMIT)) {
    const parent = referenceId({ kind: "MOMENT", key: row.id });
    if (!eligible.has(parent)) continue;
    add(
      "VENUE",
      row.venue?.id,
      "Place attached to a public Moment",
      parent,
      venueId ? undefined : personWallet?.toLowerCase(),
      venueId ? undefined : row.id
    );
    const post = creditedPosts.find((item) => item.id === row.id);
    const creator = creators.find(
      (person) =>
        person.tag === post?.creatorTag &&
        person.walletAddress.toLowerCase() === row.wallet.toLowerCase()
    );
    if (creator)
      add(
        "PERSON",
        creator.id,
        "Credited on a public Moment",
        parent,
        row.wallet.toLowerCase(),
        row.id
      );
  }
  for (const row of meetups.slice(0, SOURCE_LIMIT)) {
    const parent = referenceId({ kind: "ACTIVITY", key: "meetup:" + row.id });
    if (eligible.has(parent))
      add(
        "VENUE",
        row.venueId ?? undefined,
        "Place attached to a public meetup",
        parent
      );
  }

  // Re-resolve every candidate, including the source, after retrieval. Never send
  // raw records, stored wallets, media identifiers or private author metadata.
  const current = await resolveSocialTargets(
    [ref, ...candidates],
    context,
    now
  );
  const source = current.get(referenceId(ref));
  if (!source) return null;
  const momentIds = [
    ...new Set([
      ...(ref.kind === "MOMENT" ? [ref.key] : []),
      ...candidates.flatMap((candidate) =>
        candidate.kind === "MOMENT" ? [candidate.key] : []
      ),
    ]),
  ];
  // Display eligibility does not imply current creator credit. Re-read those
  // relations after projection so withdrawal of credit cannot retain an edge.
  const [finalMomentRows, finalPerson] = await Promise.all([
    momentIds.length
      ? prisma.adventureSubmission.findMany({
          where: { id: { in: momentIds } },
          include: relatedMomentInclude,
        })
      : [],
    ref.kind === "PERSON"
      ? prisma.streamerTag.findFirst({
          where: {
            id: ref.key,
            status: { in: ["ACTIVE", "VERIFIED"] },
            revokedAt: null,
          },
          select: { walletAddress: true },
        })
      : null,
  ]);
  const finalMoments = new Map(
    finalMomentRows.filter(publicMomentAllowed).map((row) => [row.id, row])
  );
  if (
    ref.kind === "PERSON" &&
    finalPerson?.walletAddress.toLowerCase() !== personWallet
  )
    return null;
  if (ref.kind === "MOMENT" && !finalMoments.has(ref.key)) return null;
  const sourceCredit =
    ref.kind === "MOMENT" ? finalMoments.get(ref.key) : undefined;
  if (sourceCredit && sourceCredit.venue?.id !== venueId) return null;
  const creatorOriginAvailable =
    !sourceCredit ||
    Boolean(
      momentCreditAllowed(sourceCredit) &&
        sourceCredit.wallet.toLowerCase() === sourceMomentWallet &&
        personId &&
        current.get(referenceId({ kind: "PERSON", key: personId }))
          ?.personWallet === personWallet
    );
  const seen = new Set<string>();
  const nodes: DiscoveryRelationNode[] = [];
  for (const candidate of candidates) {
    const id = referenceId(candidate),
      target = current.get(id);
    const credit = candidate.creditMomentId
      ? finalMoments.get(candidate.creditMomentId)
      : undefined;
    const parentMomentId = candidate.requires?.startsWith("MOMENT:")
      ? candidate.requires.slice(7)
      : undefined;
    const parentMoment = parentMomentId
      ? finalMoments.get(parentMomentId)
      : undefined;
    if (
      !target ||
      seen.has(id) ||
      (ref.kind === "MOMENT" && !venueId && !creatorOriginAvailable) ||
      (candidate.requires && !current.has(candidate.requires)) ||
      (parentMomentId &&
        (!parentMoment ||
          (candidate.kind === "VENUE" &&
            parentMoment.venue?.id !== candidate.key))) ||
      (candidate.kind === "MOMENT" && !finalMoments.has(candidate.key)) ||
      (candidate.creditMomentId &&
        (!credit ||
          !momentCreditAllowed(credit) ||
          credit.wallet.toLowerCase() !== candidate.creditedWallet)) ||
      (candidate.kind === "PERSON" &&
        candidate.creditedWallet &&
        target.personWallet !== candidate.creditedWallet)
    )
      continue;
    seen.add(id);
    nodes.push({
      kind: target.kind,
      key: target.key,
      title: target.title,
      summary: target.summary,
      label: candidate.label,
      href: target.href,
    });
  }
  return {
    source: {
      kind: source.kind,
      key: source.key,
      title: source.title,
      href: source.href,
    },
    nodes: nodes.slice(0, NODE_LIMIT),
    limited:
      nodes.length > NODE_LIMIT ||
      [stories, moments, events, meetups].some(
        (rows) => rows.length > SOURCE_LIMIT
      ),
  };
}
