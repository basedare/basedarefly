import "server-only";
import { prisma } from "./prisma";
import { calculateDistance } from "./geo";
import { momentCreditAllowed } from "./adventure-evidence";
import { record } from "./community-stories";
import {
  canonicalReference,
  resolveSocialTargets,
  socialContext,
  targetDto,
} from "./social-targets-server";
import {
  SOCIAL_RELATION_LIMIT,
  referenceId,
  type SocialReference,
} from "./social-retention";

export class RetentionError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}
export async function relationshipState(
  ref: SocialReference,
  wallet: string | null,
) {
  const canonical = await canonicalReference(ref);
  const targets = await resolveSocialTargets(
    [canonical],
    await socialContext(wallet),
  );
  const target = targets.get(referenceId(canonical));
  if (!target)
    throw new RetentionError("This item is no longer available.", 404);
  const [follow, save] = wallet
    ? await Promise.all([
        prisma.socialFollow.findUnique({
          where: {
            wallet_targetKind_targetKey: {
              wallet,
              targetKind: canonical.kind,
              targetKey: canonical.key,
            },
          },
        }),
        prisma.savedItem.findUnique({
          where: {
            wallet_targetKind_targetKey: {
              wallet,
              targetKind: canonical.kind,
              targetKey: canonical.key,
            },
          },
        }),
      ])
    : [null, null];
  return {
    target: targetDto(target),
    identified: Boolean(wallet),
    following: Boolean(
      follow?.active &&
        target.followable &&
        (canonical.kind !== "PERSON" ||
          follow.targetWallet === target.personWallet),
    ),
    saved: Boolean(save?.active),
  };
}

/** Desired state, not toggle: concurrent retries have the same result. Removal needs no live source. */
export async function writeRelationship(
  wallet: string,
  ref: SocialReference,
  action: "follow" | "unfollow" | "save" | "unsave",
) {
  const canonical = await canonicalReference(ref);
  const follow = action === "follow" || action === "unfollow";
  const active = action === "follow" || action === "save";
  if (follow && !["PERSON", "VENUE"].includes(canonical.kind))
    throw new RetentionError(
      "Only public people and verified venues can be followed.",
    );
  if (!follow && canonical.kind === "PERSON")
    throw new RetentionError("Use Follow for a public profile.");
  const target = active
    ? (
        await resolveSocialTargets([canonical], await socialContext(wallet))
      ).get(referenceId(canonical))
    : null;
  if (active && (!target || (follow && !target.followable)))
    throw new RetentionError(
      follow
        ? "This profile cannot be followed."
        : "This item is no longer available.",
      404,
    );
  return prisma.$transaction(
    async (tx) => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${`social-retention:${wallet}`}))::text`;
      const where = {
        wallet_targetKind_targetKey: {
          wallet,
          targetKind: canonical.kind,
          targetKey: canonical.key,
        },
      };
      const previous = follow
        ? await tx.socialFollow.findUnique({ where })
        : await tx.savedItem.findUnique({ where });
      if (!active) {
        if (previous?.active) {
          if (follow)
            await tx.socialFollow.update({ where, data: { active: false } });
          else await tx.savedItem.update({ where, data: { active: false } });
        }
        return { ...canonical, action, active: false };
      }
      if (!target)
        throw new RetentionError("This item is no longer available.", 404);
      if (
        previous?.active &&
        (!follow ||
          canonical.kind !== "PERSON" ||
          ("targetWallet" in previous &&
            previous.targetWallet === target.personWallet))
      )
        return { ...canonical, action, active: true };
      const count = follow
        ? await tx.socialFollow.count({ where: { wallet, active: true } })
        : await tx.savedItem.count({ where: { wallet, active: true } });
      if (count >= SOCIAL_RELATION_LIMIT)
        throw new RetentionError(
          `You can keep up to ${SOCIAL_RELATION_LIMIT} ${follow ? "follows" : "saved items"}. Remove one first.`,
          409,
        );
      // Durable daily write budget, separate from participation/engagement records.
      const budgetKey = `social-retention-budget:${wallet}:${new Date().toISOString().slice(0, 10)}`;
      const budget = await tx.founderEvent.findUnique({
        where: { dedupeKey: budgetKey },
      });
      const actions = Number(record(budget?.metadataJson).actions) || 0;
      if (actions >= 200)
        throw new RetentionError(
          "Daily social action limit reached. Try tomorrow.",
          429,
        );
      await tx.founderEvent.upsert({
        where: { dedupeKey: budgetKey },
        create: {
          eventType: "SOCIAL_RETENTION_BUDGET",
          source: "social",
          subjectType: "wallet",
          subjectId: wallet,
          dedupeKey: budgetKey,
          title: "Private social action budget",
          status: "SYSTEM",
          metadataJson: { actions: actions + 1 },
        },
        update: { metadataJson: { actions: actions + 1 } },
      });
      if (follow)
        await tx.socialFollow.upsert({
          where,
          create: {
            wallet,
            targetKind: canonical.kind,
            targetKey: canonical.key,
            targetWallet: target.personWallet ?? null,
          },
          update: { active: true, targetWallet: target.personWallet ?? null },
        });
      else
        await tx.savedItem.upsert({
          where,
          create: {
            wallet,
            targetKind: canonical.kind,
            targetKey: canonical.key,
          },
          update: { active: true },
        });
      return { ...canonical, action, active: true };
    },
    { timeout: 15_000 },
  );
}

export async function socialLibrary(wallet: string) {
  const [follows, saves, context] = await Promise.all([
    prisma.socialFollow.findMany({
      where: { wallet, active: true },
      orderBy: { updatedAt: "desc" },
      take: SOCIAL_RELATION_LIMIT + 1,
    }),
    prisma.savedItem.findMany({
      where: { wallet, active: true },
      orderBy: { updatedAt: "desc" },
      take: SOCIAL_RELATION_LIMIT + 1,
    }),
    socialContext(wallet),
  ]);
  if (
    follows.length > SOCIAL_RELATION_LIMIT ||
    saves.length > SOCIAL_RELATION_LIMIT
  )
    throw new RetentionError(
      "Your list is too large to load safely. Contact support.",
      503,
    );
  const refs = [...follows, ...saves].map((r) => ({
    kind: r.targetKind as SocialReference["kind"],
    key: r.targetKey,
  }));
  const targets = await resolveSocialTargets(refs, context);
  const project = (row: (typeof saves)[number] | (typeof follows)[number]) => {
    const ref = {
      kind: row.targetKind as SocialReference["kind"],
      key: row.targetKey,
    };
    const target = targets.get(referenceId(ref));
    const valid =
      target &&
      (!("targetWallet" in row) ||
        (target.followable &&
          (ref.kind !== "PERSON" || row.targetWallet === target.personWallet)));
    return { ...ref, target: valid ? targetDto(target) : null };
  };
  return { follows: follows.map(project), saves: saves.map(project) };
}

export async function followingProjection(
  wallet: string,
  area: { lat: number; lng: number; radiusKm: number },
) {
  const [rows, context] = await Promise.all([
    prisma.socialFollow.findMany({
      where: { wallet, active: true },
      take: SOCIAL_RELATION_LIMIT + 1,
    }),
    socialContext(wallet),
  ]);
  if (rows.length > SOCIAL_RELATION_LIMIT)
    throw new RetentionError("Following could not load completely.", 503);
  const refs = rows.map((r) => ({
    kind: r.targetKind as SocialReference["kind"],
    key: r.targetKey,
  }));
  const profiles = await resolveSocialTargets(refs, context);
  const followed = rows.flatMap((row) => {
    const target = profiles.get(`${row.targetKind}:${row.targetKey}`);
    return target?.followable &&
      (row.targetKind !== "PERSON" || row.targetWallet === target.personWallet)
      ? [target]
      : [];
  });
  const personIds = followed.flatMap((t) => (t.personId ? [t.personId] : [])),
    wallets = followed.flatMap((t) => (t.personWallet ? [t.personWallet] : [])),
    venueIds = followed.flatMap((t) => (t.venueId ? [t.venueId] : []));
  const now = new Date(),
    horizon = new Date(now.getTime() + 7 * 86400000);
  const latDelta = area.radiusKm / 110.574,
    lngDelta =
      area.radiusKm /
      (111.32 * Math.max(0.2, Math.cos((area.lat * Math.PI) / 180)));
  const lat = { gte: area.lat - latDelta, lte: area.lat + latDelta },
    lng = { gte: area.lng - lngDelta, lte: area.lng + lngDelta };
  const [stories, moments, events, meetups] = await Promise.all([
    prisma.founderEvent.findMany({
      where: {
        eventType: "LOCAL_SIGNAL",
        subjectType: "community_story",
        status: "APPROVED",
        AND: [
          { metadataJson: { path: ["latitude"], gte: lat.gte, lte: lat.lte } },
          { metadataJson: { path: ["longitude"], gte: lng.gte, lte: lng.lte } },
        ],
        OR: personIds.map((id) => ({
          metadataJson: { path: ["authorTagId"], equals: id },
        })),
      },
      orderBy: { createdAt: "desc" },
      take: 101,
    }),
    prisma.adventureSubmission.findMany({
      where: {
        wallet: { in: wallets, mode: "insensitive" },
        status: "APPROVED",
        venue: { status: "ACTIVE", latitude: lat, longitude: lng },
      },
      orderBy: { createdAt: "desc" },
      take: 101,
    }),
    prisma.venueEvent.findMany({
      where: {
        venueId: { in: venueIds },
        status: "PUBLISHED",
        expiresAt: { gt: now },
        startsAt: { lte: horizon },
        venue: { status: "ACTIVE", latitude: lat, longitude: lng },
        OR: [{ endsAt: { gt: now } }, { endsAt: null, startsAt: { gte: now } }],
      },
      orderBy: { startsAt: "asc" },
      take: 101,
    }),
    prisma.meetup.findMany({
      where: {
        creatorBaretagId: { in: personIds },
        status: "active",
        startTime: { gte: now, lte: horizon },
        approxLat: lat,
        approxLng: lng,
      },
      orderBy: { startTime: "asc" },
      take: 101,
    }),
  ]);
  const candidates: SocialReference[] = [
    ...stories.map((r) => ({ kind: "STORY" as const, key: r.id })),
    ...moments
      .filter(momentCreditAllowed)
      .map((r) => ({ kind: "MOMENT" as const, key: r.id })),
    ...events.map((r) => ({
      kind: "ACTIVITY" as const,
      key: "venue_event:" + r.id,
    })),
    ...meetups.map((r) => ({
      kind: "ACTIVITY" as const,
      key: "meetup:" + r.id,
    })),
  ];
  const current = await resolveSocialTargets(candidates, context, now);
  const items = [...current.values()].filter(
    (t) =>
      t.latitude != null &&
      t.longitude != null &&
      calculateDistance(area.lat, area.lng, t.latitude, t.longitude) <=
        area.radiusKm,
  );
  items.sort((a, b) =>
    a.kind === "ACTIVITY" && b.kind === "ACTIVITY"
      ? (a.at ?? "").localeCompare(b.at ?? "")
      : a.kind === "ACTIVITY"
        ? 1
        : b.kind === "ACTIVITY"
          ? -1
          : (b.at ?? "").localeCompare(a.at ?? ""),
  );
  return {
    items: items.slice(0, 40).map(targetDto),
    followingCount: followed.length,
    hasMore:
      items.length > 40 ||
      [stories, moments, events, meetups].some((r) => r.length > 100),
  };
}
