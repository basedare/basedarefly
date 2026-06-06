'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, BadgeCheck, Camera, MapPin, ShieldCheck, Trophy } from 'lucide-react';

/**
 * Founding Creators rail — a supply-side invitation (NOT a dashboard).
 * Job: show venues/backers there's creator supply forming, and give creators a
 * clear front door. Two honest states:
 *  - cold (< ROUTE_READY_THRESHOLD route-ready creators): founding-program role cards.
 *  - live (>= threshold): real route-ready creators.
 */

const ROUTE_READY_THRESHOLD = 6;

type ApiCreator = {
  tag: string;
  status: string;
  completedDares: number;
  trust?: { label?: string; score?: number };
  businessMetrics?: { venueReach?: number; firstMarks?: number };
};

type CreatorsResponse = { success: boolean; data?: ApiCreator[] };

type LiveCreator = {
  tag: string;
  plainTag: string;
  verified: boolean;
  proofs: number;
};

const ROLE_CARDS = [
  {
    key: 'proof-runners',
    icon: Camera,
    title: 'Proof runners',
    detail: 'Show up, capture the receipt.',
  },
  {
    key: 'venue-scouts',
    icon: MapPin,
    title: 'Venue scouts',
    detail: 'Wake quiet spots first.',
  },
  {
    key: 'mission-closers',
    icon: Trophy,
    title: 'Mission closers',
    detail: 'Complete paid dares.',
  },
] as const;

function normalizeTag(tag: string) {
  return tag.startsWith('@') ? tag : `@${tag}`;
}

function isRouteReady(creator: ApiCreator) {
  return (
    creator.status === 'VERIFIED' ||
    creator.completedDares > 0 ||
    (creator.businessMetrics?.venueReach ?? 0) > 0
  );
}

function toLiveCreators(creators: ApiCreator[]): LiveCreator[] {
  return [...creators]
    .filter(isRouteReady)
    .sort(
      (left, right) =>
        (right.trust?.score ?? 0) - (left.trust?.score ?? 0) ||
        right.completedDares - left.completedDares
    )
    .slice(0, 3)
    .map((creator) => {
      const tag = normalizeTag(creator.tag);
      return {
        tag,
        plainTag: tag.replace('@', '').toLowerCase(),
        verified: creator.status === 'VERIFIED',
        proofs: creator.completedDares,
      };
    });
}

export default function ReadyCreatorsRail() {
  const [liveCreators, setLiveCreators] = useState<LiveCreator[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 1400);

    async function load() {
      try {
        const response = await fetch('/api/creators', { cache: 'no-store', signal: controller.signal });
        const payload = (await response.json()) as CreatorsResponse;
        if (response.ok && payload.success && payload.data) {
          const routeReady = payload.data.filter(isRouteReady);
          if (routeReady.length >= ROUTE_READY_THRESHOLD) {
            setLiveCreators(toLiveCreators(payload.data));
          }
        }
      } catch (error) {
        if (!controller.signal.aborted) console.error('Failed to load founding creators', error);
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void load();
    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const showLive = liveCreators !== null && liveCreators.length > 0;

  return (
    <section id="founding-creators" className="w-full px-4 pb-20 pt-4 md:px-6">
      <div className="mx-auto w-full max-w-[1680px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(30,22,52,0.42),rgba(5,8,14,0.94))] px-5 py-8 shadow-[14px_18px_48px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:px-8 md:py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_1.05fr] lg:items-center">
          {/* Left: the invitation */}
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/24 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100">
              <ShieldCheck className="h-3.5 w-3.5" />
              Creator Supply
            </div>
            <h3 className="mt-4 text-2xl font-black italic tracking-tight text-white md:text-3xl">
              Founding creators ready for paid missions.
            </h3>
            <p className="mt-3 max-w-xl text-sm font-semibold leading-6 text-white/56">
              Claim your tag, tune your mission radar, and get routed when venues fund real-world proof.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/claim-tag?source=home-founding-creator"
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300 px-5 text-xs font-black uppercase tracking-[0.14em] text-black transition hover:bg-yellow-200"
              >
                Join as founding creator
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/creators"
                className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/12 bg-white/[0.05] px-5 text-xs font-black uppercase tracking-[0.14em] text-white/70 transition hover:bg-white/[0.09] hover:text-white"
              >
                View creators
              </Link>
            </div>
          </div>

          {/* Right: role cards (cold) or real creators (live) */}
          <div className="grid gap-3 sm:grid-cols-3">
            {showLive
              ? liveCreators!.map((creator) => (
                  <Link
                    key={creator.tag}
                    href={`/creator/${creator.plainTag}`}
                    className="group relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(7,8,16,0.95)_100%)] p-4 shadow-[0_16px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.07)] transition hover:-translate-y-0.5 hover:border-white/16"
                  >
                    <div className="flex items-center gap-2">
                      <span className="truncate text-base font-black tracking-[-0.02em] text-white">{creator.tag}</span>
                      {creator.verified ? <BadgeCheck className="h-4 w-4 shrink-0 text-emerald-300" /> : null}
                    </div>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-emerald-200/70">Route-ready</p>
                    <p className="mt-3 text-sm font-black text-white">{creator.proofs} proofs</p>
                    <span className="mt-3 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-[0.14em] text-white/56 transition group-hover:text-white">
                      View profile
                      <ArrowRight className="h-3.5 w-3.5" />
                    </span>
                  </Link>
                ))
              : ROLE_CARDS.map(({ key, icon: Icon, title, detail }) => (
                  <div
                    key={key}
                    className="relative overflow-hidden rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(7,8,16,0.95)_100%)] p-4 shadow-[0_16px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.07)]"
                  >
                    <div className="grid h-10 w-10 place-items-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/72">
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="mt-3 text-base font-black tracking-[-0.02em] text-white">{title}</p>
                    <p className="mt-1 text-xs font-semibold leading-5 text-white/52">{detail}</p>
                  </div>
                ))}
          </div>
        </div>
      </div>
    </section>
  );
}
