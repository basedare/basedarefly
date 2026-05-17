'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, MapPin, QrCode, Sparkles, UsersRound } from 'lucide-react';

import { cloneActiveVenueFallbacks, type ActiveVenueCard, type ActiveVenueTone } from '@/lib/home-active-venues';

const toneClasses: Record<ActiveVenueTone, { badge: string; glow: string; cta: string; dot: string }> = {
  gold: {
    badge: 'border-[#f5c518]/30 bg-[#f5c518]/12 text-[#f9e27a]',
    glow: 'from-[#f5c518]/18 via-transparent to-transparent',
    cta: 'border-[#f5c518]/30 bg-[#f5c518]/12 text-[#f9e27a] hover:border-[#f5c518]/50',
    dot: 'bg-[#f5c518] shadow-[0_0_16px_rgba(245,197,24,0.65)]',
  },
  cyan: {
    badge: 'border-cyan-300/28 bg-cyan-400/10 text-cyan-100',
    glow: 'from-cyan-300/16 via-transparent to-transparent',
    cta: 'border-cyan-300/28 bg-cyan-400/10 text-cyan-100 hover:border-cyan-200/45',
    dot: 'bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.62)]',
  },
  emerald: {
    badge: 'border-emerald-300/28 bg-emerald-400/10 text-emerald-100',
    glow: 'from-emerald-300/14 via-transparent to-transparent',
    cta: 'border-emerald-300/28 bg-emerald-400/10 text-emerald-100 hover:border-emerald-200/45',
    dot: 'bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.62)]',
  },
  purple: {
    badge: 'border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100',
    glow: 'from-fuchsia-300/14 via-transparent to-transparent',
    cta: 'border-fuchsia-300/25 bg-fuchsia-400/10 text-fuchsia-100 hover:border-fuchsia-200/42',
    dot: 'bg-fuchsia-300 shadow-[0_0_16px_rgba(217,70,239,0.62)]',
  },
};

type ActiveVenueResponse = {
  success: boolean;
  data?: {
    venues?: ActiveVenueCard[];
  };
};

export default function ActiveVenueRail() {
  const [venues, setVenues] = useState<ActiveVenueCard[]>(() => cloneActiveVenueFallbacks());
  const [usingFallback, setUsingFallback] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 1400);

    async function loadVenues() {
      try {
        const response = await fetch('/api/venues/active', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = (await response.json()) as ActiveVenueResponse;
        if (response.ok && data.success && data.data?.venues?.length) {
          setVenues(data.data.venues.slice(0, 4));
          setUsingFallback(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load active venues', error);
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void loadVenues();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return (
    <section id="active-venues" className="w-full px-4 pb-4 md:px-6">
      <div className="mx-auto w-full max-w-[1680px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(12,23,32,0.58),rgba(8,8,18,0.94))] px-4 py-8 shadow-[14px_18px_48px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:px-6 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/24 bg-cyan-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-cyan-100">
              <Sparkles className="h-3.5 w-3.5" />
              Active Venues
            </div>
            <h3 className="mt-4 text-2xl font-black italic tracking-tight text-white md:text-3xl">
              Places ready for action.
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/55">
              Open a venue, start a guest loop, or sponsor a reward.
            </p>
          </div>
          <Link
            href="/map?source=active-venues"
            prefetch={false}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-white/10 bg-white/[0.05] px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.16em] text-white/72 transition hover:border-cyan-300/28 hover:text-cyan-100"
          >
            Open map
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {venues.map((venue) => {
            const tone = toneClasses[venue.tone];
            return (
              <article
                key={venue.slug}
                className="relative flex min-h-[18rem] flex-col overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.018)_18%,rgba(7,8,16,0.95)_100%)] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <div className={`pointer-events-none absolute inset-x-0 top-0 h-36 bg-gradient-to-b ${tone.glow}`} />
                <div className="relative flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${tone.badge}`}>
                      {venue.statusLabel}
                    </div>
                    <h4 className="mt-3 text-xl font-black tracking-tight text-white">
                      {venue.name}
                    </h4>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/48">
                      <MapPin className="h-3.5 w-3.5 text-cyan-100/70" />
                      {venue.area}
                    </p>
                  </div>
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${tone.dot}`} />
                </div>

                <div className="relative mt-5 rounded-[20px] border border-white/[0.08] bg-black/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/34">Guest loop</p>
                  <p className="mt-2 text-sm font-black leading-5 text-white">{venue.missionTitle}</p>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold leading-5 text-white/56">{venue.guestMission}</p>
                </div>

                <div className="relative mt-3 grid grid-cols-2 gap-2">
                  <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.035] px-3 py-2">
                    <UsersRound className="h-3.5 w-3.5 text-cyan-100/70" />
                    <p className="mt-2 text-lg font-black text-white tabular-nums">{venue.checkInsToday}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/32">Checks</p>
                  </div>
                  <div className="rounded-[16px] border border-white/[0.07] bg-white/[0.035] px-3 py-2">
                    <QrCode className="h-3.5 w-3.5 text-[#f9e27a]/80" />
                    <p className="mt-2 text-lg font-black text-white tabular-nums">{venue.proofCount}</p>
                    <p className="text-[8px] font-black uppercase tracking-[0.13em] text-white/32">Proofs</p>
                  </div>
                </div>

                <div className="relative mt-3 flex flex-wrap gap-2">
                  <span className="rounded-full border border-white/[0.07] bg-black/24 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
                    {venue.perkLabel}
                  </span>
                  <span className="rounded-full border border-white/[0.07] bg-black/24 px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.14em] text-white/42">
                    {venue.activityLabel}
                  </span>
                </div>

                <div className="relative mt-auto grid grid-cols-2 gap-2 pt-4">
                  <Link
                    href={venue.primaryHref}
                    prefetch={false}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:border-white/20 hover:text-white"
                  >
                    Open
                  </Link>
                  <Link
                    href={venue.missionHref}
                    className={`inline-flex min-h-11 items-center justify-center rounded-full px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] transition ${tone.cta}`}
                  >
                    Mission
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {usingFallback ? (
          <p className="mt-4 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/32">
            Venue seeds shown while live data warms up.
          </p>
        ) : null}
      </div>
    </section>
  );
}
