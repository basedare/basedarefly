"use client";

import Link from "next/link";
import {
  ArrowLeft,
  CalendarClock,
  ExternalLink,
  MapPin,
  ShieldCheck,
  Users,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useState } from "react";
import { useAccount, useSignMessage } from "wagmi";

import PlanShareButton from "@/components/community/PlanShareButton";
import type { PublicVenueEvent } from "@/lib/venue-events-server";
import { buildWalletActionAuthHeaders } from "@/lib/wallet-action-auth";

type EventSession = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

function formatWhen(event: PublicVenueEvent) {
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: event.timezone,
    weekday: "long",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(event.startsAt));
}

export default function EventDetailClient({
  initialEvent,
}: {
  initialEvent: PublicVenueEvent;
}) {
  const { data: session } = useSession();
  const { address } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const sessionShape = session as EventSession | null;
  const sessionWallet =
    sessionShape?.walletAddress ?? sessionShape?.user?.walletAddress ?? null;
  const actorWallet = address ?? sessionWallet;
  const [event, setEvent] = useState(initialEvent);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const rsvp = async (status: "INTERESTED" | "GOING") => {
    setMessage(null);
    if (!actorWallet) {
      setMessage("Sign in from the top bar, then tap again.");
      return;
    }
    setPending(status);
    try {
      const headers = await buildWalletActionAuthHeaders({
        walletAddress: actorWallet,
        sessionToken: sessionShape?.token ?? null,
        sessionWallet,
        action: "venue-event:rsvp",
        resource: `venue-event:${event.slug}`,
        signMessageAsync,
      });
      const response = await fetch(
        `/api/events/${encodeURIComponent(event.slug)}/rsvp`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", ...headers },
          body: JSON.stringify({ walletAddress: actorWallet, status }),
        }
      );
      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.success)
        throw new Error(payload?.error || "Could not save that.");
      setEvent((current) => ({
        ...current,
        viewerStatus: status,
        counts: payload.data.counts,
      }));
      setMessage(
        status === "GOING"
          ? "You’re going. Bring a mate."
          : "Saved. Share it with your crew."
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save that."
      );
    } finally {
      setPending(null);
    }
  };

  const mapHref = `/map?place=${encodeURIComponent(
    event.venue.slug
  )}&source=island-pulse`;
  return (
    <main className="relative min-h-screen overflow-hidden px-4 pb-24 pt-28 text-white sm:px-6">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_0%,rgba(245,197,24,0.16),transparent_34%),radial-gradient(circle_at_84%_28%,rgba(34,211,238,0.11),transparent_30%)]" />
      <div className="relative mx-auto max-w-xl">
        <Link
          href="/events"
          className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.16em] text-white/48 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" /> Island Pulse
        </Link>
        <section className="mt-5 overflow-hidden rounded-[2rem] border border-[#f5c518]/20 bg-[linear-gradient(155deg,rgba(38,27,15,0.94),rgba(7,7,15,0.99))] p-5 shadow-[0_28px_90px_rgba(0,0,0,0.54),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-7">
          <div className="flex items-center justify-between gap-3 text-[9px] font-black uppercase tracking-[0.18em]">
            <span className="text-[#f8dd72]">
              {event.liveNow ? "Live now" : event.category}
            </span>
            <span className="text-emerald-100/64">{event.trustLabel}</span>
          </div>
          <h1 className="mt-3 text-4xl font-black leading-[0.96] sm:text-5xl">
            {event.title}
          </h1>
          <div className="mt-5 space-y-2 text-sm font-bold text-white/64">
            <p className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-[#f8dd72]" />{" "}
              {formatWhen(event)}
            </p>
            <p className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-cyan-200" /> {event.venue.name}
              {event.venue.city ? ` · ${event.venue.city}` : ""}
            </p>
            <p className="flex items-center gap-2">
              <Users className="h-4 w-4 text-violet-200" /> {event.counts.going}{" "}
              going · {event.counts.interested} interested
            </p>
          </div>
          {event.summary ? (
            <p className="mt-5 rounded-2xl border border-white/9 bg-black/24 p-4 text-sm font-bold leading-6 text-white/72">
              {event.summary}
            </p>
          ) : null}
          {event.priceLabel ? (
            <p className="mt-4 text-sm font-black text-[#fff0a0]">
              {event.priceLabel}
            </p>
          ) : null}
          <div className="mt-5 grid grid-cols-2 gap-2">
            <button
              onClick={() => void rsvp("INTERESTED")}
              disabled={Boolean(pending)}
              className={`min-h-12 rounded-full border text-[10px] font-black uppercase tracking-[0.14em] ${
                event.viewerStatus === "INTERESTED"
                  ? "border-violet-200/35 bg-violet-300/15 text-violet-100"
                  : "border-white/12 bg-white/[0.04] text-white/64"
              }`}
            >
              {pending === "INTERESTED" ? "Saving…" : "Interested"}
            </button>
            <button
              onClick={() => void rsvp("GOING")}
              disabled={Boolean(pending)}
              className={`min-h-12 rounded-full text-[10px] font-black uppercase tracking-[0.14em] ${
                event.viewerStatus === "GOING"
                  ? "bg-emerald-200 text-[#04231a]"
                  : "bg-[#f5c518] text-[#171006]"
              }`}
            >
              {pending === "GOING" ? "Saving…" : "I’m going"}
            </button>
          </div>
          {message ? (
            <p
              role="status"
              className="mt-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs font-bold text-white/65"
            >
              {message}
            </p>
          ) : null}
          <PlanShareButton
            title={event.title}
            text={`${event.title} at ${event.venue.name} · ${formatWhen(
              event
            )}`}
            href={event.href}
            label="Invite mates"
            className="mt-3 w-full"
          />
          <Link
            href={mapHref}
            className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-white/62"
          >
            <MapPin className="h-4 w-4 text-cyan-200" /> Open venue on map
          </Link>
          {event.sourceUrl ? (
            <a
              href={event.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 text-[9px] font-black uppercase tracking-[0.13em] text-cyan-100/60"
            >
              Check {event.sourceLabel} <ExternalLink className="h-3.5 w-3.5" />
            </a>
          ) : null}
        </section>
        <p className="mt-4 flex items-start gap-2 px-2 text-[10px] leading-4 text-white/34">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> Sourced event
          listing—not a BaseDare-hosted event or venue partnership. Details can
          change; confirm with the linked source.
        </p>
      </div>
    </main>
  );
}
