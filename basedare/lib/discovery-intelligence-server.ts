import "server-only";
import { prisma } from "./prisma";
import { getViewerWallet } from "./meetups-server";
import { resolveSocialTargets, socialContext } from "./social-targets-server";
import { referenceId, type SocialReference } from "./social-retention";
import { suggestionsForArea } from "./home-activities";
import { adventureHref } from "./adventure-progress";
import { calculateDistance } from "./geo";
import { assessRecommendation } from "./recommendation-policy";
import { getCreatorMissions } from "./creator-missions-server";
import { getPaymentReadiness } from "./payment-readiness-server";
import { isPublicFacingDareTitle } from "./creator-mission-policy";
import {
  discoveryPrice,
  discoveryWindow,
  interpretDiscoveryIntent,
  rankDiscoveryResults,
  type DiscoveryAreaInput,
  type DiscoveryResponse,
  type DiscoveryResult,
} from "./discovery-intelligence";

const CAP = 80;
const rounded = (n: number) => Math.round(n * 1000) / 1000;
/** Public browsing context only. Never used to unlock presence, a claim or a payout. */
export function discoveryHref(href: string, area: DiscoveryAreaInput) {
  const url = new URL(href, "https://basedare.local");
  if (url.origin !== "https://basedare.local")
    throw Error("Invalid public discovery destination.");
  url.searchParams.set("lat", String(rounded(area.lat)));
  url.searchParams.set("lng", String(rounded(area.lng)));
  url.searchParams.set("areaLabel", area.label);
  url.searchParams.set("radiusKm", String(area.radiusKm));
  if (area.timeZone) url.searchParams.set("timeZone", area.timeZone);
  return url.pathname + url.search + url.hash;
}

export async function discoverPublicExperiences(
  query: string,
  area: DiscoveryAreaInput,
  now = new Date()
): Promise<DiscoveryResponse> {
  const interpretation = interpretDiscoveryIntent(query);
  const deltaLat = area.radiusKm / 110.574;
  const deltaLng =
    area.radiusKm /
    (111.32 * Math.max(0.2, Math.cos((area.lat * Math.PI) / 180)));
  const latitude = { gte: area.lat - deltaLat, lte: area.lat + deltaLat };
  const longitude = { gte: area.lng - deltaLng, lte: area.lng + deltaLng };
  const window = discoveryWindow(interpretation.when, now, area.timeZone);
  const horizon = new Date(Math.max(window.to, now.getTime() + 86400000));
  const context = await socialContext(await getViewerWallet());
  const [venues, events, meetups, moments, stories, freeDares] =
    await Promise.all([
      prisma.venue.findMany({
        where: { status: "ACTIVE", latitude, longitude },
        select: {
          id: true,
          slug: true,
          name: true,
          description: true,
          city: true,
          categories: true,
          latitude: true,
          longitude: true,
          timezone: true,
        },
        orderBy: { updatedAt: "desc" },
        take: CAP + 1,
      }),
      prisma.venueEvent.findMany({
        where: {
          status: "PUBLISHED",
          expiresAt: { gt: now },
          startsAt: { lt: horizon },
          venue: { status: "ACTIVE", latitude, longitude },
          OR: [
            { endsAt: { gt: now } },
            { endsAt: null, startsAt: { gte: now } },
          ],
        },
        include: {
          venue: {
            select: {
              id: true,
              slug: true,
              name: true,
              latitude: true,
              longitude: true,
            },
          },
        },
        orderBy: { startsAt: "asc" },
        take: CAP + 1,
      }),
      prisma.meetup.findMany({
        where: {
          status: "active",
          startTime: { gte: now, lt: horizon },
          approxLat: latitude,
          approxLng: longitude,
        },
        orderBy: { startTime: "asc" },
        take: CAP + 1,
      }),
      prisma.adventureSubmission.findMany({
        where: {
          status: "APPROVED",
          venue: { status: "ACTIVE", latitude, longitude },
        },
        select: { id: true, venueSlug: true, activityId: true },
        orderBy: { createdAt: "desc" },
        take: CAP + 1,
      }),
      prisma.founderEvent.findMany({
        where: {
          eventType: "LOCAL_SIGNAL",
          subjectType: "community_story",
          status: "APPROVED",
          venue: { status: "ACTIVE", latitude, longitude },
        },
        select: { id: true, venueId: true },
        orderBy: { createdAt: "desc" },
        take: CAP + 1,
      }),
      prisma.dare.findMany({
        where: {
          status: "PENDING",
          bounty: 0,
          tag: "community",
          venue: { status: "ACTIVE", latitude, longitude },
          claimedBy: null,
          targetWalletAddress: null,
          AND: [
            { OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
            {
              OR: [
                { claimRequestStatus: null },
                { claimRequestStatus: "REJECTED" },
              ],
            },
            {
              OR: [
                { streamerHandle: null },
                {
                  streamerHandle: {
                    in: ["@open", "@everyone"],
                    mode: "insensitive",
                  },
                },
              ],
            },
          ],
        },
        select: {
          id: true,
          shortId: true,
          title: true,
          expiresAt: true,
          venueId: true,
        },
        orderBy: { createdAt: "desc" },
        take: CAP + 1,
      }),
    ]);
  let complete = [venues, events, meetups, moments, stories, freeDares].every(
    (rows) => rows.length <= CAP
  );
  const placeRows = venues.slice(0, CAP);
  const refs: SocialReference[] = [
    ...placeRows.map((v) => ({ kind: "VENUE" as const, key: v.id })),
    ...events
      .slice(0, CAP)
      .map((e) => ({ kind: "ACTIVITY" as const, key: "venue_event:" + e.id })),
    ...meetups
      .slice(0, CAP)
      .map((e) => ({ kind: "ACTIVITY" as const, key: "meetup:" + e.id })),
    ...moments
      .slice(0, CAP)
      .map((e) => ({ kind: "MOMENT" as const, key: e.id })),
    ...stories
      .slice(0, CAP)
      .map((e) => ({ kind: "STORY" as const, key: e.id })),
  ];
  const targets = await resolveSocialTargets(refs, context, now);
  const publicPlaces = new Map(
    placeRows
      .filter(
        (v) =>
          targets.has("VENUE:" + v.id) &&
          calculateDistance(area.lat, area.lng, v.latitude, v.longitude) <=
            area.radiusKm
      )
      .map((v) => [v.id, v])
  );
  const bySlug = new Map([...publicPlaces.values()].map((v) => [v.slug, v]));
  const candidates: DiscoveryResult[] = [];
  const distance = (lat: number, lng: number) =>
    Math.round(calculateDistance(area.lat, area.lng, lat, lng) * 10) / 10;
  const place = (v: {
    slug: string;
    name: string;
    latitude: number;
    longitude: number;
  }) => ({
    slug: v.slug,
    name: v.name,
    lat: rounded(v.latitude),
    lng: rounded(v.longitude),
  });
  for (const v of publicPlaces.values()) {
    const assessment = assessRecommendation(
      {
        title: v.name,
        kind: "place",
        latitude: v.latitude,
        longitude: v.longitude,
        categories: v.categories,
      },
      {
        now,
        window:
          interpretation.when === "now" || interpretation.when === "next2h"
            ? interpretation.when
            : "browse",
        timeZone: v.timezone,
      }
    );
    if (!assessment.eligible) continue;
    candidates.push({
      kind: "PLACE",
      key: v.id,
      title: v.name,
      summary:
        v.description?.slice(0, 280) ||
        "Explore this place and check access before travelling.",
      label: "Place · hours unconfirmed",
      reason: "Near your selected area · check opening hours",
      href: discoveryHref("/venues/" + encodeURIComponent(v.slug), area),
      actionLabel: "Explore place",
      pricePhp: null,
      priceLabel: "Price unconfirmed",
      minutes: null,
      place: place(v),
      distanceKm: distance(v.latitude, v.longitude),
      categories: [...v.categories, v.city ?? "", area.label],
    });
  }
  for (const e of events.slice(0, CAP)) {
    const target = targets.get(
      referenceId({ kind: "ACTIVITY", key: "venue_event:" + e.id })
    );
    if (!target || !publicPlaces.has(e.venueId)) continue;
    const assessment = assessRecommendation(
      {
        title: e.title,
        kind: "activity",
        latitude: e.venue.latitude,
        longitude: e.venue.longitude,
        startsAt: e.startsAt.toISOString(),
        endsAt: e.endsAt?.toISOString(),
      },
      {
        now: interpretation.when === "tomorrow" ? e.startsAt : now,
        window:
          interpretation.when === "tomorrow" ? "now" : interpretation.when,
        timeZone: e.timezone,
      }
    );
    if (!assessment.eligible) continue;
    candidates.push({
      kind: "EVENT",
      key: e.id,
      title: target.title,
      summary: target.summary,
      label: target.label,
      reason:
        interpretation.when === "tonight"
          ? "Published event in tonight’s local window"
          : "Published event · check the scheduled time",
      href: discoveryHref(target.href, area),
      actionLabel: "View event",
      pricePhp: discoveryPrice(e.priceLabel),
      priceLabel: e.priceLabel || "Entry price unconfirmed",
      minutes: e.endsAt
        ? Math.ceil((e.endsAt.getTime() - e.startsAt.getTime()) / 60000)
        : null,
      startsAt: e.startsAt.toISOString(),
      endsAt: e.endsAt?.toISOString(),
      place: place(e.venue),
      distanceKm: distance(e.venue.latitude, e.venue.longitude),
      categories: [e.category, area.label],
    });
  }
  for (const m of meetups.slice(0, CAP)) {
    const target = targets.get("ACTIVITY:meetup:" + m.id);
    if (!target || (m.venueId && !publicPlaces.has(m.venueId))) continue;
    if (
      calculateDistance(area.lat, area.lng, m.approxLat, m.approxLng) >
      area.radiusKm
    )
      continue;
    if (
      !assessRecommendation(
        {
          title: m.title,
          kind: "activity",
          latitude: m.approxLat,
          longitude: m.approxLng,
          startsAt: m.startTime.toISOString(),
        },
        {
          now: interpretation.when === "tomorrow" ? m.startTime : now,
          window:
            interpretation.when === "tomorrow" ? "now" : interpretation.when,
          timeZone: area.timeZone,
        }
      ).eligible
    )
      continue;
    candidates.push({
      kind: "MEETUP",
      key: m.id,
      title: target.title,
      summary: target.summary,
      label: "Public meetup",
      reason: "A real public plan · open it to check the details",
      href: discoveryHref(target.href, area),
      actionLabel: "View meetup",
      pricePhp: null,
      priceLabel: "Any costs: check the plan",
      minutes: null,
      startsAt: m.startTime.toISOString(),
      place: m.venueId
        ? place(publicPlaces.get(m.venueId)!)
        : {
            slug: "",
            name: m.placeLabel,
            lat: rounded(m.approxLat),
            lng: rounded(m.approxLng),
          },
      distanceKm: distance(m.approxLat, m.approxLng),
      categories: ["meet people", area.label],
    });
  }
  for (const ref of refs.filter(
    (r) => r.kind === "MOMENT" || r.kind === "STORY"
  )) {
    const target = targets.get(referenceId(ref));
    const v =
      ref.kind === "MOMENT"
        ? bySlug.get(moments.find((m) => m.id === ref.key)?.venueSlug ?? "")
        : publicPlaces.get(
            stories.find((s) => s.id === ref.key)?.venueId ?? ""
          );
    if (!target || !v) continue;
    candidates.push({
      kind: ref.kind === "MOMENT" ? "MOMENT" : "STORY",
      key: ref.key,
      title: target.title,
      summary: target.summary.slice(0, 280),
      label:
        ref.kind === "MOMENT"
          ? "Reviewed Moment · past story"
          : "Community experience · past story",
      reason:
        "A shared experience at this place · not a live event or verified visit",
      href: discoveryHref(target.href, area),
      actionLabel: ref.kind === "MOMENT" ? "View Moment" : "Read story",
      pricePhp: null,
      priceLabel: "A past experience",
      minutes: null,
      at: target.at,
      place: place(v),
      distanceKm: distance(v.latitude, v.longitude),
      categories: [area.label],
    });
  }
  for (const d of freeDares.slice(0, CAP)) {
    const v = publicPlaces.get(d.venueId ?? "");
    if (!v || !isPublicFacingDareTitle(d.title)) continue;
    if (
      !assessRecommendation(
        {
          title: d.title,
          kind: "activity",
          latitude: v.latitude,
          longitude: v.longitude,
          endsAt: d.expiresAt?.toISOString(),
        },
        {
          now,
          window:
            interpretation.when === "tomorrow" ? "browse" : interpretation.when,
          timeZone: v.timezone,
        }
      ).eligible
    )
      continue;
    candidates.push({
      kind: "CHALLENGE",
      key: d.id,
      title: d.title,
      summary:
        "Open the challenge for its instructions and actual participation requirements.",
      label: "Published free challenge",
      reason:
        "Available challenge at a public place · participation rules still apply",
      href: discoveryHref(
        "/dare/" + encodeURIComponent(d.shortId || d.id),
        area
      ),
      actionLabel: "View challenge",
      pricePhp: null,
      priceLabel: "No cash reward · check any activity costs",
      minutes: null,
      endsAt: d.expiresAt?.toISOString(),
      place: place(v),
      distanceKm: distance(v.latitude, v.longitude),
      categories: [area.label, ...v.categories],
    });
  }
  // Authored suggestions are clearly self-guided, not fabricated hosted inventory.
  for (const activity of suggestionsForArea(area, now)) {
    if (
      (interpretation.when === "tonight" && activity.daylight) ||
      interpretation.when === "tomorrow"
    )
      continue;
    candidates.push({
      kind: "ADVENTURE",
      key: activity.id,
      title: activity.title,
      summary: activity.summary,
      label: "Self-guided adventure · free to try",
      reason: "Try at your own pace · no sign-in or purchase required",
      href: discoveryHref(adventureHref(activity.id, undefined, area), area),
      actionLabel: "Start adventure",
      pricePhp: 0,
      priceLabel: "Free · no cash reward",
      minutes: activity.minutes,
      distanceKm: null,
      categories: [...activity.moods, activity.category ?? "", area.label],
    });
  }
  const notices = [...interpretation.notices];
  if (!area.timeZone && ["tonight", "tomorrow"].includes(interpretation.when))
    notices.push(
      "This area has no confirmed timezone. Scheduled dates are interpreted in UTC; select a city with a timezone for local results."
    );
  if (interpretation.intent === "earn") {
    const readiness = await getPaymentReadiness();
    if (!readiness.ready)
      notices.push(
        "Paid opportunities are currently unavailable while the payment setup is checked. No payment has been requested."
      );
    else {
      const missions = await getCreatorMissions();
      if (!missions) throw Error("Paid opportunities could not load.");
      const locations = await prisma.dare.findMany({
        where: {
          id: { in: missions.map((m) => m.id) },
          status: "PENDING",
          venue: { status: "ACTIVE", latitude, longitude },
        },
        select: { id: true, venueId: true },
      });
      for (const m of missions.filter((m) => m.isAvailable)) {
        const v = publicPlaces.get(
          locations.find((d) => d.id === m.id)?.venueId ?? ""
        );
        if (!v) continue;
        candidates.push({
          kind: "MISSION",
          key: m.id,
          title: m.title,
          summary: m.whatToMake,
          label: "Paid creator mission · recorded funding",
          reason:
            "Open brief with recorded funding · eligibility and review still apply",
          href: discoveryHref("/earn/" + encodeURIComponent(m.shortId), area),
          actionLabel: "View mission",
          pricePhp: null,
          priceLabel: `$${m.creatorPayout.toFixed(
            2
          )} USDC potential payout · see brief`,
          minutes: null,
          endsAt: m.expiresAt?.toISOString(),
          place: place(v),
          distanceKm: distance(v.latitude, v.longitude),
          categories: [area.label, ...v.categories],
        });
      }
      if (missions.length >= 24) {
        complete = false;
        notices.push(
          "The open mission catalogue is bounded; this is a selection, not a complete market total."
        );
      }
    }
  }
  if (!complete)
    notices.push(
      "This is a bounded selection. Some sources contain more records; no complete count or exhaustive absence is claimed."
    );
  notices.push(
    `Searching ${area.label}. Choose another destination on the map to search a different city.`
  );
  const ranked = rankDiscoveryResults(candidates, interpretation, area, now);
  return {
    area,
    interpretation,
    results: ranked.slice(0, 12),
    complete: complete && ranked.length <= 12,
    notices,
  };
}
