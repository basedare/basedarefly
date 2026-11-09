import "server-only";
import { getMissionPassSecret } from "./mission-pass-crypto";

import { Prisma, type CreatorAttributionLink } from "@prisma/client";
import { prisma } from "./prisma";
import { adventureTemplate } from "./adventure-sharing";
import { adventureHref } from "./adventure-progress";
import { suggestionsForArea } from "./home-activities";
import {
  canonicalReference,
  resolveSocialTargets,
  socialContext,
} from "./social-targets-server";
import { referenceId } from "./social-retention";
import { normalizeAttributionCode } from "./creator-attribution-policy";
import {
  DISCOVERY_QR_KIND,
  QrCreateSchema,
  QrStatusSchema,
  parseDiscoveryQr,
  type QrMetadata,
} from "./discovery-qr";

const trackingReady = () => {
  try {
    getMissionPassSecret();
    return true;
  } catch {
    return false;
  }
};

export class DiscoveryQrUnavailable extends Error {}
const available = (value: unknown, message: string) => {
  if (!value) throw new DiscoveryQrUnavailable(message);
};
async function hostFor(id: string | null) {
  const host = id
    ? await prisma.venue.findFirst({
        where: { id, status: "ACTIVE" },
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          timezone: true,
          latitude: true,
          longitude: true,
        },
      })
    : null;
  available(host, "The placement location is unavailable.");
  return host!;
}
async function personCurrent(id: string, wallet: string | null) {
  const row = await prisma.streamerTag.findFirst({
    where: {
      id,
      status: { in: ["ACTIVE", "VERIFIED"] },
      revokedAt: null,
      walletAddress: { equals: wallet ?? "", mode: "insensitive" },
    },
    select: { id: true },
  });
  available(row, "The ambassador account has changed or is unavailable.");
}
async function destination(
  meta: QrMetadata,
  host: Awaited<ReturnType<typeof hostFor>>,
) {
  if (meta.destinationKind === "ADVENTURE") {
    const activity = adventureTemplate(meta.key);
    available(activity, "The adventure is unavailable.");
    available(
      suggestionsForArea(
        {
          lat: host.latitude,
          lng: host.longitude,
          label: host.city || host.name,
          timeZone: host.timezone || undefined,
        },
        new Date(),
      ).some((a) => a.id === meta.key),
      "This adventure is not available here at the current local time. Try another nearby idea.",
    );
    return {
      title: activity!.title,
      href: adventureHref(activity!.id, host.slug),
      targetType: "PAGE",
      targetId: activity!.id,
      key: activity!.id,
      subjectWallet: null,
    };
  }
  const kind =
    meta.destinationKind === "CREATOR"
      ? "PERSON"
      : meta.destinationKind === "VENUE"
        ? "VENUE"
        : "ACTIVITY";
  const key =
    meta.destinationKind === "EVENT"
      ? "venue_event:" + meta.key
      : meta.destinationKind === "MEETUP"
        ? "meetup:" + meta.key
        : meta.key;
  const ref = await canonicalReference({ kind, key });
  const target = (
    await resolveSocialTargets([ref], await socialContext(null))
  ).get(referenceId(ref));
  available(target, "This public experience is no longer available.");
  if (meta.destinationKind === "CREATOR" && meta.subjectWallet)
    available(
      meta.subjectWallet === target!.personWallet,
      "The creator account has changed.",
    );
  const href = new URL(target!.href, "https://basedare.local");
  // Only canonical public place context transfers. This is never presence evidence.
  href.searchParams.set("lat", String(Math.round(host.latitude * 1000) / 1000));
  href.searchParams.set(
    "lng",
    String(Math.round(host.longitude * 1000) / 1000),
  );
  href.searchParams.set("areaLabel", host.city || host.name);
  if (host.timezone) href.searchParams.set("timeZone", host.timezone);
  return {
    title: target!.title,
    href: href.pathname + href.search,
    targetType: meta.destinationKind === "MEETUP" ? "MEETUP" : "PAGE",
    targetId:
      meta.destinationKind === "MEETUP"
        ? meta.key
        : `${meta.destinationKind.toLowerCase()}:${ref.key}`,
    key: kind === "ACTIVITY" ? meta.key : ref.key,
    subjectWallet: target!.personWallet ?? null,
  };
}
/** Fresh canonical resolution; a stored URL is never redirect authority for these links. */
export async function resolveDiscoveryQr(
  link: CreatorAttributionLink,
  checkPermission = true,
) {
  const meta = parseDiscoveryQr(link.metadataJson);
  available(meta, "This QR configuration is unavailable.");
  available(Date.parse(meta!.expiresAt) > Date.now(), "This QR has expired.");
  if (checkPermission)
    available(
      link.placementPermissionConfirmedAt,
      "Placement permission is not confirmed.",
    );
  const host = await hostFor(link.stationHostVenueId);
  if (meta!.ambassadorId)
    await personCurrent(meta!.ambassadorId, meta!.ambassadorWallet);
  return {
    ...(await destination(meta!, host)),
    host,
    expiresAt: meta!.expiresAt,
  };
}
export async function createDiscoveryQr(raw: unknown, actor: string) {
  const body = QrCreateSchema.parse(raw),
    input = body.discoveryQr;
  const creatorCode = normalizeAttributionCode(body.creatorCode, "ambassador");
  const host = await prisma.venue.findUnique({
    where: { slug: input.hostVenueSlug.toLowerCase() },
    select: { id: true },
  });
  available(host, "Choose an existing public placement location.");
  const currentHost = await hostFor(host!.id);
  const ambassador =
    creatorCode === "basedare"
      ? null
      : await prisma.streamerTag.findFirst({
          where: {
            tag: { in: [creatorCode, "@" + creatorCode], mode: "insensitive" },
            status: { in: ["ACTIVE", "VERIFIED"] },
            revokedAt: null,
          },
          select: { id: true, walletAddress: true },
        });
  if (creatorCode !== "basedare")
    available(
      ambassador,
      "Choose a current public Baretag or the BaseDare account.",
    );
  let key = input.key;
  if (input.kind === "EVENT") {
    const event = await prisma.venueEvent.findFirst({
      where: { OR: [{ id: key }, { slug: key }] },
      select: { id: true },
    });
    available(event, "Choose an existing event.");
    key = event!.id;
  }
  const meta: QrMetadata = {
    kind: DISCOVERY_QR_KIND,
    destinationKind: input.kind,
    key,
    expiresAt: new Date(
      Date.now() + input.expiresInDays * 86400000,
    ).toISOString(),
    subjectWallet: null,
    ambassadorId: ambassador?.id ?? null,
    ambassadorWallet: ambassador?.walletAddress.toLowerCase() ?? null,
  };
  const resolved = await destination(meta, currentHost);
  meta.key = resolved.key;
  meta.subjectWallet = resolved.subjectWallet;
  return prisma.creatorAttributionLink.create({
    data: {
      slug: normalizeAttributionCode(body.slug, "short link"),
      creatorCode,
      contentCode: normalizeAttributionCode(body.contentCode, "placement code"),
      campaignCode: body.campaignCode
        ? normalizeAttributionCode(body.campaignCode, "campaign")
        : null,
      targetType: resolved.targetType,
      targetId: resolved.targetId,
      targetHref: resolved.href,
      stationHostVenueId: host!.id,
      metadataJson: meta as Prisma.InputJsonValue,
      participationOwner: false,
      active: false,
      createdBy: actor,
      placementPermissionConfirmedAt: body.placementPermissionConfirmed
        ? new Date()
        : null,
      placementPermissionConfirmedBy: body.placementPermissionConfirmed
        ? actor
        : null,
    },
  });
}
export async function updateDiscoveryQr(raw: unknown, actor: string) {
  const body = QrStatusSchema.parse(raw);
  const current = await prisma.creatorAttributionLink.findUnique({
    where: { id: body.linkId },
  });
  available(
    current && parseDiscoveryQr(current.metadataJson),
    "Discovery QR not found.",
  );
  const permission =
    body.placementPermissionConfirmed ??
    Boolean(current!.placementPermissionConfirmedAt);
  available(
    body.active !== true || permission,
    "Confirm placement permission before activation.",
  );
  if (body.active === true) {
    available(
      trackingReady(),
      "Journey tracking is not configured. Keep this QR paused and ask the operator to check setup.",
    );
    await resolveDiscoveryQr(current!, false);
  }
  const result = await prisma.creatorAttributionLink.updateMany({
    // Do not let concurrent permission revocation lose to a stale activation.
    where: {
      id: current!.id,
      active: current!.active,
      placementPermissionConfirmedAt: current!.placementPermissionConfirmedAt,
      metadataJson: { equals: current!.metadataJson as Prisma.InputJsonValue },
    },
    data: {
      ...(body.active !== undefined ? { active: body.active } : {}),
      ...(body.placementPermissionConfirmed !== undefined
        ? {
            placementPermissionConfirmedAt: permission ? new Date() : null,
            placementPermissionConfirmedBy: permission ? actor : null,
            ...(!permission ? { active: false } : {}),
          }
        : {}),
    },
  });
  if (result.count !== 1)
    throw new DiscoveryQrUnavailable(
      "This QR changed. Refresh before trying again.",
    );
  return { id: current!.id };
}
export async function discoveryQrReport(periodDays: number) {
  const links = await prisma.creatorAttributionLink.findMany({
    where: { metadataJson: { path: ["kind"], equals: DISCOVERY_QR_KIND } },
    orderBy: { createdAt: "desc" },
    take: 51,
  });
  const shown = links.slice(0, 50),
    since = new Date(Date.now() - periodDays * 86400000);
  const touches = await prisma.attributionTouch.findMany({
    where: {
      linkId: { in: shown.map((l) => l.id) },
      occurredAt: { gte: since },
    },
    select: { id: true, linkId: true, journeyId: true, occurredAt: true },
    take: 5001,
  });
  const events =
    touches.length <= 5000
      ? await prisma.attributionEvent.findMany({
          where: {
            touchId: { in: touches.map((t) => t.id) },
            occurredAt: { gte: since },
            eventType: {
              in: [
                "ADVENTURE_LANDING_RENDERED",
                "ADVENTURE_STARTED",
                "ADVENTURE_COMPLETED_SELF_REPORTED",
                "ADVENTURE_INVITATION_ACTION",
                "PATH_VERIFIED_COMPLETION",
              ],
            },
          },
          select: {
            eventType: true,
            touchId: true,
            journeyId: true,
            targetType: true,
            targetId: true,
            occurredAt: true,
          },
          take: 10001,
        })
      : [];
  const validTouches = touches.filter(
    (t): t is typeof t & { linkId: string; journeyId: string } =>
      Boolean(t.linkId && t.journeyId),
  );
  const complete =
    trackingReady() &&
    touches.length <= 5000 &&
    events.length <= 10000 &&
    validTouches.length === touches.length;
  const byLink = new Map(
    shown
      .filter(
        (l) =>
          parseDiscoveryQr(l.metadataJson)?.destinationKind === "ADVENTURE",
      )
      .map((l) => [l.id, l]),
  );
  const byTouch = new Map(validTouches.map((t) => [t.id, t]));
  const cohortKey = (journey: string, link: CreatorAttributionLink) =>
    `${journey}:${link.targetType}:${link.targetId}`;
  const eligible = events.filter((e) => {
    const touch = e.touchId ? byTouch.get(e.touchId) : null;
    const link = touch ? byLink.get(touch.linkId) : null;
    return (
      link &&
      touch &&
      e.journeyId === touch.journeyId &&
      e.occurredAt >= touch.occurredAt &&
      e.targetType === link.targetType &&
      e.targetId === link.targetId
    );
  });
  const stageTotal = (name: string) =>
    new Set(
      eligible
        .filter((e) => e.eventType === name)
        .map((e) => {
          const t = byTouch.get(e.touchId!)!;
          return cohortKey(t.journeyId, byLink.get(t.linkId)!);
        }),
    ).size;
  const observation = {
    source: "admin-free-adventure-qr",
    unit: "browser_journey_target",
    windowStart: since.toISOString(),
    windowEnd: new Date().toISOString(),
    complete: complete && links.length <= 50,
    counts:
      complete && links.length <= 50
        ? {
            entries: new Set(
              validTouches.flatMap((t) => {
                const l = byLink.get(t.linkId);
                return l ? [cohortKey(t.journeyId, l)] : [];
              }),
            ).size,
            landings: stageTotal("ADVENTURE_LANDING_RENDERED"),
            starts: stageTotal("ADVENTURE_STARTED"),
            selfReportedFinishes: stageTotal(
              "ADVENTURE_COMPLETED_SELF_REPORTED",
            ),
            shareActions: stageTotal("ADVENTURE_INVITATION_ACTION"),
            verifiedCompletions: stageTotal("PATH_VERIFIED_COMPLETION"),
          }
        : null,
  };
  return {
    trackingReady: trackingReady(),
    hasMore: links.length > 50,
    metricsAvailable: complete,
    periodDays,
    observation,
    note: "Entries are redirect requests, including repeats and bots. Browser journeys are not unique people. Starts/finishes are client-reported; sharing is not delivery. Scanning never proves presence or earns money. Source limits make metrics unavailable, never a truncated zero.",
    links: await Promise.all(
      shown.map(async (link) => {
        let resolved: Awaited<ReturnType<typeof resolveDiscoveryQr>> | null =
            null,
          issue: string | null = null;
        try {
          resolved = await resolveDiscoveryQr(link, false);
        } catch (e) {
          if (!(e instanceof DiscoveryQrUnavailable)) throw e;
          issue = e.message;
        }
        const source = validTouches.filter((t) => t.linkId === link.id),
          index = new Map(source.map((t) => [t.id, t]));
        const scoped = events.filter((e) => {
          const t = e.touchId ? index.get(e.touchId) : null;
          return (
            t &&
            t.journeyId === e.journeyId &&
            e.occurredAt >= t.occurredAt &&
            e.targetType === link.targetType &&
            e.targetId === link.targetId
          );
        });
        const stage = (kind: string) =>
          parseDiscoveryQr(link.metadataJson)?.destinationKind === "ADVENTURE"
            ? new Set(
                scoped
                  .filter((e) => e.eventType === kind)
                  .map((e) => e.journeyId),
              ).size
            : null;
        return {
          id: link.id,
          slug: link.slug,
          creatorCode: link.creatorCode,
          campaignCode: link.campaignCode,
          contentCode: link.contentCode,
          active: link.active,
          permissionConfirmed: Boolean(link.placementPermissionConfirmedAt),
          publicPath: "/go/" + link.slug,
          title: resolved?.title ?? "Unavailable experience",
          host: resolved?.host.name ?? null,
          destination: resolved?.href ?? null,
          expiresAt: parseDiscoveryQr(link.metadataJson)?.expiresAt ?? null,
          issue,
          printable: Boolean(
            link.active &&
              link.placementPermissionConfirmedAt &&
              resolved &&
              trackingReady(),
          ),
          metrics: complete
            ? {
                entries: source.length,
                browserJourneys: new Set(source.map((t) => t.journeyId)).size,
                landings: stage("ADVENTURE_LANDING_RENDERED"),
                starts: stage("ADVENTURE_STARTED"),
                selfReportedFinishes: stage(
                  "ADVENTURE_COMPLETED_SELF_REPORTED",
                ),
                shareActions: stage("ADVENTURE_INVITATION_ACTION"),
                verifiedCompletions: stage("PATH_VERIFIED_COMPLETION"),
              }
            : null,
        };
      }),
    ),
  };
}
