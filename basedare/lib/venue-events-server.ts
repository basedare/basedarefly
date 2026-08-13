import "server-only";

import { prisma } from "@/lib/prisma";
import { resolveViewerBaretag } from "@/lib/meetups-server";
import {
  getVenueEventTrustLabel,
  isVenueEventLiveNow,
  type VenueEventRsvpStatus,
  type VenueEventTrustLevel,
} from "@/lib/venue-events";

export type PublicVenueEvent = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  category: string;
  startsAt: string;
  endsAt: string | null;
  timezone: string;
  priceLabel: string | null;
  sourceLabel: string;
  sourceUrl: string | null;
  trustLevel: VenueEventTrustLevel;
  trustLabel: string;
  lastConfirmedAt: string;
  liveNow: boolean;
  venue: {
    id: string;
    slug: string;
    name: string;
    city: string | null;
    latitude: number;
    longitude: number;
  };
  counts: { interested: number; going: number };
  viewerStatus: VenueEventRsvpStatus | null;
  href: string;
};

function mapPublicVenueEvent(
  event: {
    id: string;
    slug: string;
    title: string;
    summary: string | null;
    category: string;
    startsAt: Date;
    endsAt: Date | null;
    timezone: string;
    priceLabel: string | null;
    sourceLabel: string;
    sourceUrl: string | null;
    trustLevel: string;
    lastConfirmedAt: Date;
    venue: {
      id: string;
      slug: string;
      name: string;
      city: string | null;
      latitude: number;
      longitude: number;
    };
    rsvps: Array<{ baretagId: string; status: string }>;
  },
  viewerBaretagId: string | null
): PublicVenueEvent {
  const trustLevel = event.trustLevel as VenueEventTrustLevel;
  return {
    id: event.id,
    slug: event.slug,
    title: event.title,
    summary: event.summary,
    category: event.category,
    startsAt: event.startsAt.toISOString(),
    endsAt: event.endsAt?.toISOString() ?? null,
    timezone: event.timezone,
    priceLabel: event.priceLabel,
    sourceLabel: event.sourceLabel,
    sourceUrl: event.sourceUrl,
    trustLevel,
    trustLabel: getVenueEventTrustLabel(trustLevel),
    lastConfirmedAt: event.lastConfirmedAt.toISOString(),
    liveNow: isVenueEventLiveNow(event),
    venue: event.venue,
    counts: {
      interested: event.rsvps.filter((rsvp) => rsvp.status === "INTERESTED")
        .length,
      going: event.rsvps.filter((rsvp) => rsvp.status === "GOING").length,
    },
    viewerStatus:
      (event.rsvps.find((rsvp) => rsvp.baretagId === viewerBaretagId)
        ?.status as VenueEventRsvpStatus | undefined) ?? null,
    href: `/events/${encodeURIComponent(event.slug)}`,
  };
}

export async function getUpcomingVenueEvents(
  options: {
    venueSlug?: string | null;
    window?: "tonight" | "week" | "month";
    limit?: number;
    viewerBaretagId?: string | null;
    now?: Date;
  } = {}
) {
  const now = options.now ?? new Date();
  const viewer =
    options.viewerBaretagId === undefined
      ? await resolveViewerBaretag().catch(() => null)
      : null;
  const viewerBaretagId =
    options.viewerBaretagId === undefined
      ? viewer?.id ?? null
      : options.viewerBaretagId;
  const horizonMs =
    options.window === "tonight"
      ? 18 * 60 * 60 * 1000
      : options.window === "month"
      ? 31 * 24 * 60 * 60 * 1000
      : 8 * 24 * 60 * 60 * 1000;
  const events = await prisma.venueEvent.findMany({
    where: {
      status: "PUBLISHED",
      expiresAt: { gt: now },
      startsAt: { lte: new Date(now.getTime() + horizonMs) },
      OR: [
        { endsAt: { gte: now } },
        {
          endsAt: null,
          startsAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
        },
      ],
      ...(options.venueSlug ? { venue: { slug: options.venueSlug } } : {}),
    },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      category: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      priceLabel: true,
      sourceLabel: true,
      sourceUrl: true,
      trustLevel: true,
      lastConfirmedAt: true,
      venue: {
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      },
      rsvps: { select: { baretagId: true, status: true } },
    },
    orderBy: { startsAt: "asc" },
    take: Math.min(100, Math.max(1, options.limit ?? 24)),
  });
  return events.map((event) => mapPublicVenueEvent(event, viewerBaretagId));
}

export async function getPublicVenueEvent(
  identifier: string,
  options: { viewerBaretagId?: string | null } = {}
) {
  const viewer =
    options.viewerBaretagId === undefined
      ? await resolveViewerBaretag().catch(() => null)
      : null;
  const viewerBaretagId =
    options.viewerBaretagId === undefined
      ? viewer?.id ?? null
      : options.viewerBaretagId;
  const now = new Date();
  const event = await prisma.venueEvent.findFirst({
    where: {
      AND: [
        { status: "PUBLISHED", expiresAt: { gt: now } },
        { OR: [{ id: identifier }, { slug: identifier }] },
        {
          OR: [
            { endsAt: { gte: now } },
            {
              endsAt: null,
              startsAt: { gte: new Date(now.getTime() - 4 * 60 * 60 * 1000) },
            },
          ],
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      summary: true,
      category: true,
      startsAt: true,
      endsAt: true,
      timezone: true,
      priceLabel: true,
      sourceLabel: true,
      sourceUrl: true,
      trustLevel: true,
      lastConfirmedAt: true,
      venue: {
        select: {
          id: true,
          slug: true,
          name: true,
          city: true,
          latitude: true,
          longitude: true,
        },
      },
      rsvps: { select: { baretagId: true, status: true } },
    },
  });
  return event ? mapPublicVenueEvent(event, viewerBaretagId) : null;
}
