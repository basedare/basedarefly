import Link from "next/link";
import { CalendarClock, MapPin, Users } from "lucide-react";

import type { PublicVenueEvent } from "@/lib/venue-events-server";

function formatEventTime(event: PublicVenueEvent) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: event.timezone,
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.startsAt));
}

export default function VenueEventCard({
  event,
  compact = false,
}: {
  event: PublicVenueEvent;
  compact?: boolean;
}) {
  const people = event.counts.going + event.counts.interested;
  return (
    <Link
      href={event.href}
      className={`group block overflow-hidden border border-white/10 bg-[linear-gradient(145deg,rgba(245,197,24,0.09),rgba(11,9,20,0.94)_45%,rgba(34,211,238,0.05))] transition hover:-translate-y-0.5 hover:border-[#f8dd72]/28 ${
        compact ? "rounded-2xl p-3.5" : "rounded-[1.6rem] p-5"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <span className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.08] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] text-[#f8dd72]">
          {event.liveNow ? "Live now" : event.category}
        </span>
        <span className="text-[9px] font-black uppercase tracking-[0.12em] text-emerald-100/58">
          {event.trustLabel}
        </span>
      </div>
      <h3
        className={`${
          compact ? "mt-3 text-base" : "mt-4 text-xl"
        } font-black leading-tight text-white group-hover:text-[#fff2a9]`}
      >
        {event.title}
      </h3>
      <div className="mt-3 space-y-1.5 text-xs font-bold text-white/52">
        <p className="flex items-center gap-2">
          <CalendarClock className="h-3.5 w-3.5 text-[#f8dd72]" />{" "}
          {formatEventTime(event)}
        </p>
        <p className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 text-cyan-200" /> {event.venue.name}
          {event.venue.city ? ` · ${event.venue.city}` : ""}
        </p>
        {people > 0 ? (
          <p className="flex items-center gap-2">
            <Users className="h-3.5 w-3.5 text-violet-200" />{" "}
            {event.counts.going} going · {event.counts.interested} interested
          </p>
        ) : null}
      </div>
      {event.priceLabel ? (
        <p className="mt-3 text-[10px] font-black uppercase tracking-[0.13em] text-white/60">
          {event.priceLabel}
        </p>
      ) : null}
    </Link>
  );
}
