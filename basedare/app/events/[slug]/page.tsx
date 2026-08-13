import type { Metadata } from "next";
import { notFound } from "next/navigation";

import EventDetailClient from "@/components/events/EventDetailClient";
import { getPublicVenueEvent } from "@/lib/venue-events-server";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await getPublicVenueEvent(slug, {
    viewerBaretagId: null,
  }).catch(() => null);
  return event
    ? {
        title: `${event.title} | BaseDare`,
        description: `${event.title} at ${event.venue.name}. See the source, who is going and open the place on the map.`,
      }
    : { title: "Island Pulse | BaseDare" };
}

export default async function EventPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const event = await getPublicVenueEvent(slug).catch(() => null);
  if (!event) notFound();
  return <EventDetailClient initialEvent={event} />;
}
