import type { Metadata } from "next";
import Link from "next/link";

import VenueEventCard from "@/components/events/VenueEventCard";
import { getUpcomingVenueEvents } from "@/lib/venue-events-server";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Island Pulse | BaseDare",
  description:
    "What is happening around Siargao, attached to the real places on the BaseDare map.",
};

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ venue?: string }>;
}) {
  const { venue } = await searchParams;
  const events = await getUpcomingVenueEvents({
    venueSlug: venue ?? null,
    window: "month",
    limit: 48,
    viewerBaretagId: null,
  }).catch(() => []);
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 text-white sm:px-6 lg:px-10">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_4%,rgba(245,197,24,0.13),transparent_30%),radial-gradient(circle_at_86%_18%,rgba(34,211,238,0.1),transparent_34%)]" />
      <div className="relative mx-auto max-w-6xl">
        <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#f8dd72]">
          Island Pulse
        </p>
        <h1 className="mt-3 max-w-4xl text-4xl font-black leading-[0.95] sm:text-6xl">
          What’s happening, where—and who wants to go?
        </h1>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href="/map?intent=tonight"
            className="rounded-full bg-[#f5c518] px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-[#171006]"
          >
            Open live map
          </Link>
          <Link
            href="/community"
            className="rounded-full border border-white/12 bg-white/[0.04] px-5 py-3 text-[10px] font-black uppercase tracking-[0.14em] text-white/62"
          >
            Community plans
          </Link>
        </div>
        {events.length ? (
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map((event) => (
              <VenueEventCard key={event.id} event={event} />
            ))}
          </div>
        ) : (
          <div className="mt-8 rounded-[1.7rem] border border-dashed border-white/14 bg-black/24 p-8 text-center">
            <p className="text-lg font-black">
              No sourced events are live yet.
            </p>
            <p className="mt-2 text-sm text-white/44">
              The operator queue publishes only listings with a real source,
              place and exact time.
            </p>
          </div>
        )}
      </div>
    </main>
  );
}
