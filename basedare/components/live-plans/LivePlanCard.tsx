'use client';

import Link from 'next/link';
import {
  Anchor,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  MapPin,
  Radio,
  Sparkles,
  Users,
} from 'lucide-react';

import PlanShareButton from '@/components/community/PlanShareButton';
import type { LivePlan } from '@/lib/live-plans';

const PLAN_STYLE: Record<LivePlan['type'], {
  eyebrow: string;
  icon: typeof Anchor;
  accent: string;
  surface: string;
}> = {
  boat: {
    eyebrow: 'Crew forming',
    icon: Anchor,
    accent: 'text-cyan-100 border-cyan-200/24 bg-cyan-300/[0.09]',
    surface: 'from-cyan-300/[0.11] via-[#0b1420] to-[#06070d]',
  },
  meetup: {
    eyebrow: 'Rally',
    icon: Users,
    accent: 'text-violet-100 border-violet-200/24 bg-violet-300/[0.09]',
    surface: 'from-violet-400/[0.12] via-[#151022] to-[#06070d]',
  },
  venue_event: {
    eyebrow: 'Island Pulse',
    icon: Radio,
    accent: 'text-amber-100 border-amber-200/24 bg-amber-300/[0.09]',
    surface: 'from-amber-300/[0.11] via-[#17120c] to-[#06070d]',
  },
  community_spark: {
    eyebrow: 'Free Spark',
    icon: Sparkles,
    accent: 'text-emerald-100 border-emerald-200/24 bg-emerald-300/[0.09]',
    surface: 'from-emerald-300/[0.11] via-[#091812] to-[#06070d]',
  },
  paid_dare: {
    eyebrow: 'Paid Dare',
    icon: CircleDollarSign,
    accent: 'text-yellow-100 border-yellow-200/24 bg-yellow-300/[0.09]',
    surface: 'from-yellow-300/[0.11] via-[#171308] to-[#06070d]',
  },
};

function formatPlanTime(plan: LivePlan) {
  if (!plan.startsAt) return plan.endsAt ? 'Open now' : 'Live';
  const start = new Date(plan.startsAt);
  if (!Number.isFinite(start.getTime())) return 'Soon';
  const delta = start.getTime() - Date.now();
  if (delta <= 30 * 60 * 1000 && delta > -4 * 60 * 60 * 1000) return 'Happening now';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(start);
}

function getPeopleLabel(plan: LivePlan) {
  if (!plan.people) return null;
  if (plan.people.spotsNeeded && plan.people.spotsNeeded > 0) {
    return `${plan.people.going}/${plan.people.minimum} · ${plan.people.spotsNeeded} more needed`;
  }
  if (plan.people.minimum && plan.people.unlocked) return `${plan.people.going} going · unlocked`;
  if (plan.people.going || plan.people.interested) {
    return `${plan.people.going} going${plan.people.interested ? ` · ${plan.people.interested} interested` : ''}`;
  }
  return 'Be first in';
}

export default function LivePlanCard({
  plan,
  compact = false,
}: {
  plan: LivePlan;
  compact?: boolean;
}) {
  const style = PLAN_STYLE[plan.type];
  const Icon = style.icon;
  const peopleLabel = getPeopleLabel(plan);
  const participant = plan.viewer.isNextMove;

  return (
    <article
      className={`group flex min-w-0 flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-gradient-to-br ${style.surface} shadow-[0_18px_45px_rgba(0,0,0,0.4),inset_0_1px_0_rgba(255,255,255,0.08)] ${compact ? 'p-4' : 'p-5'}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 text-[9px] font-black uppercase tracking-[0.15em] ${style.accent}`}>
          <Icon className="h-3.5 w-3.5" aria-hidden="true" />
          {style.eyebrow}
        </span>
        <span className={`rounded-full border px-2.5 py-1 text-[8px] font-black uppercase tracking-[0.12em] ${participant ? 'border-emerald-200/25 bg-emerald-300/[0.1] text-emerald-100' : 'border-white/10 bg-black/22 text-white/42'}`}>
          {participant ? 'Your next move' : plan.status.label}
        </span>
      </div>

      <h3 className={`${compact ? 'mt-4 text-lg' : 'mt-5 text-2xl'} line-clamp-2 font-black leading-[1.02] text-white`}>
        {plan.title}
      </h3>

      <div className="mt-4 space-y-2 text-xs font-bold text-white/54">
        <p className="flex items-center gap-2">
          <MapPin className="h-4 w-4 shrink-0 text-cyan-200/74" aria-hidden="true" />
          <span className="truncate">{plan.place.label}</span>
          {plan.distanceKm != null ? <span className="ml-auto shrink-0 text-white/30">{plan.distanceKm < 1 ? `${Math.max(1, Math.round(plan.distanceKm * 1000))}m` : `${plan.distanceKm.toFixed(1)}km`}</span> : null}
        </p>
        <p className="flex items-center gap-2">
          <CalendarClock className="h-4 w-4 shrink-0 text-violet-200/74" aria-hidden="true" />
          <span>{formatPlanTime(plan)}</span>
        </p>
        {peopleLabel ? (
          <p className="flex items-center gap-2">
            <Users className="h-4 w-4 shrink-0 text-amber-200/76" aria-hidden="true" />
            <span>{peopleLabel}</span>
          </p>
        ) : null}
      </div>

      {plan.value?.indicativePerPersonPhp ? (
        <p className="mt-3 text-sm font-black text-cyan-100">~₱{plan.value.indicativePerPersonPhp} each</p>
      ) : plan.value?.rewardUsdc ? (
        <p className="mt-3 text-sm font-black text-yellow-100">{plan.value.rewardUsdc} USDC reward</p>
      ) : null}

      {!compact && (plan.summary || plan.trust.label) ? (
        <details className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs text-white/46">
          <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em] text-white/56">Details</summary>
          {plan.summary ? <p className="mt-2 leading-5">{plan.summary}</p> : null}
          <p className="mt-2 text-[10px] leading-4 text-white/34">{plan.trust.label}{plan.trust.sourceLabel ? ` · ${plan.trust.sourceLabel}` : ''}</p>
        </details>
      ) : null}

      <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-4">
        <Link
          href={plan.action.href}
          prefetch={false}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f5c518] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#171006] transition hover:bg-[#ffe36e] active:scale-[0.985]"
        >
          {participant ? 'Open plan' : plan.action.label}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <PlanShareButton
          title={plan.share.title}
          text={plan.share.text}
          href={plan.share.href}
          label="Share"
          compact
          className="min-w-20"
        />
      </div>
    </article>
  );
}
