import "server-only";
import { prisma } from "./prisma";
import { publicLocalSignalItems, record } from "./community-stories";
import { momentInclude, momentPosts } from "./moment-server";
import {
  getVenueEventTrustLabel,
  type VenueEventTrustLevel,
} from "./venue-events";
import {
  referenceId,
  type SocialReference,
  type SocialTarget,
} from "./social-retention";

export type SocialContext = {
  wallet: string | null;
  ownIds: Set<string>;
  blockedIds: Set<string>;
  blockedWallets: Set<string>;
};
export type ResolvedTarget = SocialTarget & {
  personWallet?: string;
  personId?: string;
  venueId?: string;
};
export async function socialContext(
  wallet: string | null,
): Promise<SocialContext> {
  const own = wallet
    ? await prisma.streamerTag.findMany({
        where: { walletAddress: { equals: wallet, mode: "insensitive" } },
        select: { id: true },
      })
    : [];
  const ids = own.map((t) => t.id);
  const blocks = ids.length
    ? await prisma.meetupBlock.findMany({
        where: {
          OR: [
            { blockerBaretagId: { in: ids } },
            { blockedBaretagId: { in: ids } },
          ],
        },
      })
    : [];
  const ownIds = new Set(ids);
  const blockedIds = new Set(
    blocks.map((b) =>
      ownIds.has(b.blockerBaretagId) ? b.blockedBaretagId : b.blockerBaretagId,
    ),
  );
  const hidden = blockedIds.size
    ? await prisma.streamerTag.findMany({
        where: { id: { in: [...blockedIds] } },
        select: { walletAddress: true },
      })
    : [];
  return {
    wallet,
    ownIds,
    blockedIds,
    blockedWallets: new Set(hidden.map((t) => t.walletAddress.toLowerCase())),
  };
}
export function hiddenPerson(
  context: SocialContext,
  id: string,
  wallet: string,
) {
  return (
    context.blockedIds.has(id) ||
    context.blockedWallets.has(wallet.toLowerCase())
  );
}
export function targetDto(target: ResolvedTarget): SocialTarget {
  const {
    kind,
    key,
    title,
    summary,
    href,
    label,
    followable,
    latitude,
    longitude,
    at,
  } = target;
  return {
    kind,
    key,
    title,
    summary,
    href,
    label,
    followable,
    latitude,
    longitude,
    at,
  };
}
/** Accept a public handle/slug at entry; persist only its existing canonical source ID. */
export async function canonicalReference(
  ref: SocialReference,
): Promise<SocialReference> {
  if (ref.kind === "PERSON") {
    const handle = ref.key.replace(/^@/, "");
    const row = await prisma.streamerTag.findFirst({
      where: {
        OR: [
          { id: ref.key },
          { tag: { equals: handle, mode: "insensitive" } },
          { tag: { equals: "@" + handle, mode: "insensitive" } },
        ],
      },
      select: { id: true },
    });
    return { ...ref, key: row?.id ?? ref.key };
  }
  if (ref.kind === "VENUE") {
    const row = await prisma.venue.findFirst({
      where: { OR: [{ id: ref.key }, { slug: ref.key }] },
      select: { id: true },
    });
    return { ...ref, key: row?.id ?? ref.key };
  }
  return ref;
}

/** Batch current-source projection: no saved title, media URL, wallet or location snapshot. */
export async function resolveSocialTargets(
  refs: SocialReference[],
  context: SocialContext,
  now = new Date(),
) {
  const keys = (kind: SocialReference["kind"]) =>
    refs.filter((r) => r.kind === kind).map((r) => r.key);
  const activityKeys = keys("ACTIVITY");
  const eventIds = activityKeys
    .filter((k) => k.startsWith("venue_event:"))
    .map((k) => k.slice(12));
  const meetupIds = activityKeys
    .filter((k) => k.startsWith("meetup:"))
    .map((k) => k.slice(7));
  const [venues, stories, moments, events, meetups] = await Promise.all([
    keys("VENUE").length
      ? prisma.venue.findMany({
          where: { id: { in: keys("VENUE") }, status: "ACTIVE" },
        })
      : Promise.resolve([]),
    keys("STORY").length
      ? prisma.founderEvent.findMany({
          where: {
            id: { in: keys("STORY") },
            eventType: "LOCAL_SIGNAL",
            subjectType: "community_story",
            status: "APPROVED",
          },
        })
      : Promise.resolve([]),
    keys("MOMENT").length
      ? prisma.adventureSubmission.findMany({
          where: { id: { in: keys("MOMENT") }, status: "APPROVED" },
          include: momentInclude,
        })
      : Promise.resolve([]),
    eventIds.length
      ? prisma.venueEvent.findMany({
          where: {
            id: { in: eventIds },
            status: "PUBLISHED",
            expiresAt: { gt: now },
            venue: { status: "ACTIVE" },
            OR: [
              { endsAt: { gt: now } },
              { endsAt: null, startsAt: { gte: now } },
            ],
          },
          include: { venue: true },
        })
      : Promise.resolve([]),
    meetupIds.length
      ? prisma.meetup.findMany({
          where: {
            id: { in: meetupIds },
            status: "active",
            startTime: { gte: now },
          },
        })
      : Promise.resolve([]),
  ]);
  const people =
    keys("PERSON").length || meetups.length || moments.length
      ? await prisma.streamerTag.findMany({
          where: {
            status: { in: ["ACTIVE", "VERIFIED"] },
            revokedAt: null,
            OR: [
              {
                id: {
                  in: [
                    ...keys("PERSON"),
                    ...meetups.map((m) => m.creatorBaretagId),
                  ],
                },
              },
              {
                walletAddress: {
                  in: moments.map((m) => m.wallet),
                  mode: "insensitive",
                },
              },
            ],
          },
        })
      : [];
  const attachedPlaces = meetups.some((m) => m.venueId)
    ? await prisma.venue.findMany({
        where: {
          id: { in: meetups.flatMap((m) => (m.venueId ? [m.venueId] : [])) },
          status: "ACTIVE",
        },
        select: { id: true },
      })
    : [];
  const activePlaceIds = new Set(attachedPlaces.map((v) => v.id));
  const publicPeople = people.filter(
    (p) => !hiddenPerson(context, p.id, p.walletAddress),
  );
  const [storyItems, momentItems] = await Promise.all([
    stories.length ? publicLocalSignalItems(stories) : Promise.resolve([]),
    momentPosts(moments),
  ]);
  const result = new Map<string, ResolvedTarget>();
  const add = (target: ResolvedTarget) =>
    result.set(referenceId(target), target);
  for (const person of publicPeople.filter((p) =>
    keys("PERSON").includes(p.id),
  )) {
    add({
      kind: "PERSON",
      key: person.id,
      title: "@" + person.tag.replace(/^@/, ""),
      summary: person.bio ?? "",
      href: "/creator/" + encodeURIComponent(person.tag.replace(/^@/, "")),
      label: "Public profile",
      followable: person.walletAddress.toLowerCase() !== context.wallet,
      personWallet: person.walletAddress.toLowerCase(),
      personId: person.id,
    });
  }
  for (const venue of venues) {
    if (
      venue.claimedBy &&
      context.blockedWallets.has(venue.claimedBy.toLowerCase())
    )
      continue;
    add({
      kind: "VENUE",
      key: venue.id,
      title: venue.name,
      summary: venue.city ?? "Explore this place",
      href: "/venues/" + encodeURIComponent(venue.slug),
      label: "Place",
      followable: Boolean(
        venue.claimedBy &&
          venue.claimedAt &&
          venue.claimRequestStatus === "APPROVED",
      ),
      venueId: venue.id,
      latitude: venue.latitude,
      longitude: venue.longitude,
    });
  }
  for (const item of storyItems) {
    const meta = record(stories.find((s) => s.id === item.id)!.metadataJson);
    if (
      hiddenPerson(context, String(meta.authorTagId), String(meta.authorWallet))
    )
      continue;
    add({
      kind: "STORY",
      key: item.id,
      title: item.title,
      summary: item.notes,
      href: "/community/posts/" + item.id,
      label: `${item.submittedBy} · Community experience`,
      followable: false,
      venueId: item.venueId ?? undefined,
      latitude: item.latitude ?? undefined,
      longitude: item.longitude ?? undefined,
      at: item.createdAt,
    });
  }
  for (const item of momentItems) {
    const source = moments.find((m) => m.id === item.id)!;
    if (
      !publicPeople.some(
        (p) => p.walletAddress.toLowerCase() === source.wallet.toLowerCase(),
      )
    )
      continue;
    add({
      kind: "MOMENT",
      key: item.id,
      title: item.caption,
      summary: "Reviewed for display, not verified attendance.",
      href: item.momentHref!,
      label: item.creatorTag
        ? item.creatorTag + " · Moment"
        : "Community Moment",
      followable: false,
      latitude: item.venue?.latitude,
      longitude: item.venue?.longitude,
      at: item.createdAt,
    });
  }
  for (const event of events) {
    if (
      event.venue.claimedBy &&
      context.blockedWallets.has(event.venue.claimedBy.toLowerCase())
    )
      continue;
    add({
      kind: "ACTIVITY",
      key: "venue_event:" + event.id,
      title: event.title,
      summary: event.summary ?? event.venue.name,
      href: "/events/" + encodeURIComponent(event.slug),
      label: getVenueEventTrustLabel(event.trustLevel as VenueEventTrustLevel),
      followable: false,
      venueId: event.venueId,
      latitude: event.venue.latitude,
      longitude: event.venue.longitude,
      at: event.startsAt.toISOString(),
    });
  }
  for (const meetup of meetups) {
    const author = publicPeople.find((p) => p.id === meetup.creatorBaretagId);
    if (!author || (meetup.venueId && !activePlaceIds.has(meetup.venueId)))
      continue;
    add({
      kind: "ACTIVITY",
      key: "meetup:" + meetup.id,
      title: meetup.title,
      summary: meetup.note ?? meetup.placeLabel,
      href: "/community/meet/" + encodeURIComponent(meetup.id),
      label: "Public meetup · " + author.tag,
      followable: false,
      venueId: meetup.venueId ?? undefined,
      latitude: meetup.approxLat,
      longitude: meetup.approxLng,
      at: meetup.startTime.toISOString(),
    });
  }
  return result;
}
