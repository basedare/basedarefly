import Link from "next/link";
import { ArrowRight, Radio } from "lucide-react";

import VenueEventCard from "@/components/events/VenueEventCard";
import type { PublicVenueEvent } from "@/lib/venue-events-server";

export default function VenueEventRail({
  events,
  venueSlug,
}: {
  events: PublicVenueEvent[];
  venueSlug: string;
}) {
  if (!events.length) return null;
  return (
    <section className="mt-5 rounded-[22px] border border-[#f5c518]/18 bg-[linear-gradient(145deg,rgba(245,197,24,0.08),rgba(8,8,16,0.82)_48%,rgba(34,211,238,0.05))] p-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8dd72]">
            <Radio className="h-3.5 w-3.5" /> Island Pulse
          </p>
          <p className="mt-1 text-sm font-black text-white">Coming up here</p>
        </div>
        <Link
          href={`/events?venue=${encodeURIComponent(venueSlug)}`}
          className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/70"
        >
          All <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {events.slice(0, 4).map((event) => (
          <VenueEventCard key={event.id} event={event} compact />
        ))}
      </div>
      <p className="mt-3 text-[9px] leading-4 text-white/34">
        Publicly sourced event details. Check the linked venue source before
        travelling.
      </p>
    </section>
  );
}
