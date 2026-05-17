'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ArrowRight, Briefcase, CheckCircle2, MapPin, Radio, ShieldCheck, Sparkles } from 'lucide-react';
import { buildCreatorMissionActivationHref } from '@/lib/mission-routing';

type CreatorFromApi = {
  tag: string;
  completedDares: number;
  totalEarned: number;
  tags?: string[];
  stats?: {
    approved: number;
    live: number;
    acceptRate: number;
  };
  businessMetrics?: {
    venueReach: number;
    firstMarks: number;
  };
  trust?: {
    label: string;
    score: number;
  };
};

type ReadyCreatorCard = {
  key: string;
  name: string;
  area: string;
  availability: string;
  metric: string;
  skills: string[];
  tone: 'cyan' | 'gold' | 'emerald';
  passportHref: string;
  inviteHref: string;
};

type CreatorsResponse = {
  success: boolean;
  data?: CreatorFromApi[];
};

const fallbackCreators: ReadyCreatorCard[] = [
  {
    key: 'founding-captains',
    name: 'Founding captains',
    area: 'Siargao / city pilots',
    availability: 'Apply now',
    metric: 'Captain intake open',
    skills: ['Nightlife', 'Food', 'Beach proof'],
    tone: 'gold',
    passportHref: '/captains?source=home-ready-creators',
    inviteHref: buildCreatorMissionActivationHref({
      creator: '@founding-captain',
      source: 'home-ready-creators',
      city: 'Siargao / city pilots',
      skills: ['Nightlife', 'Food', 'Beach proof'],
    }),
  },
  {
    key: 'venue-scouts',
    name: 'Venue scouts',
    area: 'Local radius',
    availability: 'Open this week',
    metric: 'Mark places first',
    skills: ['Venue scout', 'First spark', 'QR proof'],
    tone: 'cyan',
    passportHref: '/creators',
    inviteHref: buildCreatorMissionActivationHref({
      creator: '@venue-scout',
      source: 'home-ready-creators',
      city: 'Local radius',
      skills: ['Venue scout', 'First spark', 'QR proof'],
    }),
  },
  {
    key: 'proof-creators',
    name: 'Proof creators',
    area: 'Area shared after invite',
    availability: 'Mission-ready',
    metric: 'Proof, receipt, recap',
    skills: ['UGC', 'Fast clips', 'Check-ins'],
    tone: 'emerald',
    passportHref: '/creators',
    inviteHref: buildCreatorMissionActivationHref({
      creator: '@proof-creator',
      source: 'home-ready-creators',
      city: 'Area shared after invite',
      skills: ['UGC', 'Fast clips', 'Check-ins'],
    }),
  },
];

const toneClasses = {
  cyan: {
    badge: 'border-cyan-300/28 bg-cyan-400/10 text-cyan-100',
    dot: 'bg-cyan-300 shadow-[0_0_16px_rgba(103,232,249,0.62)]',
    cta: 'border-cyan-300/28 bg-cyan-400/10 text-cyan-100 hover:border-cyan-200/45',
  },
  gold: {
    badge: 'border-[#f5c518]/30 bg-[#f5c518]/12 text-[#f9e27a]',
    dot: 'bg-[#f5c518] shadow-[0_0_16px_rgba(245,197,24,0.65)]',
    cta: 'border-[#f5c518]/30 bg-[#f5c518]/12 text-[#f9e27a] hover:border-[#f5c518]/50',
  },
  emerald: {
    badge: 'border-emerald-300/28 bg-emerald-400/10 text-emerald-100',
    dot: 'bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,0.62)]',
    cta: 'border-emerald-300/28 bg-emerald-400/10 text-emerald-100 hover:border-emerald-200/45',
  },
};

function normalizeTag(tag: string) {
  return tag.startsWith('@') ? tag : `@${tag}`;
}

function plainTag(tag: string) {
  return tag.replace('@', '').toLowerCase();
}

function getAreaLabel(creator: CreatorFromApi) {
  const tags = creator.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const area = tags.find((tag) =>
    ['siargao', 'general luna', 'catangnan', 'sydney', 'bondi', 'manila', 'bali'].some((known) => tag.includes(known))
  );

  if (area) return area.replace(/\b\w/g, (letter) => letter.toUpperCase());
  if ((creator.businessMetrics?.venueReach ?? 0) > 0) return 'Venue circuit';
  return 'Area shared after invite';
}

function getSkills(creator: CreatorFromApi) {
  const tags = creator.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const skills = new Set<string>();

  tags.forEach((tag) => {
    if (tag.includes('food') || tag.includes('cafe') || tag.includes('coffee')) skills.add('Food');
    if (tag.includes('beach') || tag.includes('surf')) skills.add('Beach');
    if (tag.includes('night') || tag.includes('bar')) skills.add('Nightlife');
    if (tag.includes('event')) skills.add('Events');
  });

  if ((creator.businessMetrics?.venueReach ?? 0) > 0) skills.add('Venue scout');
  if ((creator.businessMetrics?.firstMarks ?? 0) > 0) skills.add('First spark');
  if ((creator.stats?.acceptRate ?? 0) >= 70) skills.add('Reliable');
  skills.add('Proof');

  return Array.from(skills).slice(0, 3);
}

function mapCreators(creators: CreatorFromApi[]) {
  return [...creators]
    .sort((left, right) => {
      const liveDelta = (right.stats?.live ?? 0) - (left.stats?.live ?? 0);
      if (liveDelta !== 0) return liveDelta;
      const venueDelta = (right.businessMetrics?.venueReach ?? 0) - (left.businessMetrics?.venueReach ?? 0);
      if (venueDelta !== 0) return venueDelta;
      return (right.trust?.score ?? 0) - (left.trust?.score ?? 0);
    })
    .slice(0, 3)
    .map((creator, index): ReadyCreatorCard => {
      const tag = normalizeTag(creator.tag);
      const liveCount = creator.stats?.live ?? 0;
      const approved = creator.stats?.approved ?? creator.completedDares;
      const skills = getSkills(creator);
      const area = getAreaLabel(creator);

      return {
        key: tag,
        name: tag,
        area,
        availability: liveCount > 0 ? 'Ready now' : approved > 0 ? 'Available tonight' : 'Open this week',
        metric:
          (creator.businessMetrics?.venueReach ?? 0) > 0
            ? `${creator.businessMetrics?.venueReach ?? 0} venues marked`
            : `${approved} proofs accepted`,
        skills,
        tone: index === 0 ? 'gold' : index === 1 ? 'cyan' : 'emerald',
        passportHref: `/creator/${plainTag(tag)}`,
        inviteHref: buildCreatorMissionActivationHref({
          creator: tag,
          source: 'home-ready-creators',
          city: area,
          skills,
        }),
      };
    });
}

export default function ReadyCreatorsRail() {
  const [creators, setCreators] = useState<ReadyCreatorCard[]>(fallbackCreators);
  const [usingFallback, setUsingFallback] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 1400);

    async function loadCreators() {
      try {
        const response = await fetch('/api/creators', {
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = (await response.json()) as CreatorsResponse;
        if (response.ok && data.success && data.data?.length) {
          setCreators(mapCreators(data.data));
          setUsingFallback(false);
        }
      } catch (error) {
        if (!controller.signal.aborted) {
          console.error('Failed to load ready creators', error);
        }
      } finally {
        window.clearTimeout(timeoutId);
      }
    }

    void loadCreators();

    return () => {
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  return (
    <section id="ready-creators" className="w-full px-4 pb-20 pt-4 md:px-6">
      <div className="mx-auto w-full max-w-[1680px] overflow-hidden rounded-[2rem] border border-white/10 bg-[linear-gradient(160deg,rgba(30,22,52,0.42),rgba(5,8,14,0.94))] px-4 py-8 shadow-[14px_18px_48px_rgba(0,0,0,0.36),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl md:px-6 md:py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/24 bg-emerald-400/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-emerald-100">
              <Radio className="h-3.5 w-3.5" />
              Ready Creators
            </div>
            <h3 className="mt-4 text-2xl font-black italic tracking-tight text-white md:text-3xl">
              People ready to seed proof.
            </h3>
            <p className="mt-2 max-w-2xl text-sm font-semibold leading-6 text-white/55">
              Route creators into missions without exposing exact live location.
            </p>
          </div>
          <Link
            href="/captains?source=home-ready-creators"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#f5c518]/30 bg-[#f5c518]/12 px-4 py-2 text-center text-[11px] font-black uppercase tracking-[0.14em] text-[#f9e27a] transition hover:border-[#f5c518]/50"
          >
            Apply captain
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        <div className="mt-6 grid gap-3 md:grid-cols-3">
          {creators.map((creator) => {
            const tone = toneClasses[creator.tone];
            return (
              <article
                key={creator.key}
                className="relative overflow-hidden rounded-[26px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.018)_18%,rgba(7,8,16,0.95)_100%)] p-4 shadow-[0_18px_30px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08)]"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className={`inline-flex rounded-full border px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${tone.badge}`}>
                      {creator.availability}
                    </div>
                    <h4 className="mt-3 text-xl font-black tracking-tight text-white">{creator.name}</h4>
                    <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-white/48">
                      <MapPin className="h-3.5 w-3.5 text-cyan-100/70" />
                      {creator.area}
                    </p>
                  </div>
                  <span className={`mt-1 h-3 w-3 shrink-0 rounded-full ${tone.dot}`} />
                </div>

                <div className="mt-5 grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-[20px] border border-white/[0.08] bg-black/30 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.05] text-white/72">
                    <ShieldCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black leading-5 text-white">{creator.metric}</p>
                    <p className="mt-1 text-[10px] font-black uppercase tracking-[0.16em] text-white/34">Private radius</p>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {creator.skills.map((skill) => (
                    <span
                      key={`${creator.key}-${skill}`}
                      className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/58"
                    >
                      <CheckCircle2 className="h-3 w-3 text-emerald-100/70" />
                      {skill}
                    </span>
                  ))}
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <Link
                    href={creator.passportHref}
                    className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.05] px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] text-white/72 transition hover:border-white/20 hover:text-white"
                  >
                    Profile
                  </Link>
                  <Link
                    href={creator.inviteHref}
                    aria-label={`Invite ${creator.name} to a mission`}
                    className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-3 py-2 text-center text-[10px] font-black uppercase tracking-[0.12em] transition ${tone.cta}`}
                  >
                    <Briefcase className="h-3.5 w-3.5" />
                    Invite
                  </Link>
                </div>
              </article>
            );
          })}
        </div>

        {usingFallback ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-white/32">
            <Sparkles className="h-3.5 w-3.5" />
            Creator seeds shown while live data warms up.
          </p>
        ) : null}
      </div>
    </section>
  );
}
