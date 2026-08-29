'use client';

import Link from 'next/link';
import {
  Anchor,
  CalendarClock,
  ChevronRight,
  CircleDollarSign,
  Map,
  MapPin,
  Navigation,
  Radio,
  Sparkles,
  Users,
} from 'lucide-react';

import PlanShareButton from '@/components/community/PlanShareButton';
import { trackClientEvent } from '@/lib/analytics';
import {
  getLivePlanDirectionsHref,
  getLivePlanCrewRoomHref,
  getLivePlanMapHref,
  livePlanHasCrewRoom,
  type LivePlan,
} from '@/lib/live-plans';

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
  context = 'now',
}: {
  plan: LivePlan;
  compact?: boolean;
  context?: 'now' | 'board';
}) {
  const style = PLAN_STYLE[plan.type];
  const Icon = style.icon;
  const peopleLabel = getPeopleLabel(plan);
  const participant = plan.viewer.isNextMove;
  const showSparkHook = plan.type === 'community_spark' && Boolean(plan.summary);
  const crewProgress = plan.people?.minimum
    ? Math.min(100, Math.round((plan.people.going / plan.people.minimum) * 100))
    : null;
  const mapHref = getLivePlanMapHref(plan, context);
  const directionsHref = getLivePlanDirectionsHref(plan);
  const crewRoomReady = livePlanHasCrewRoom(plan);

  const recordDirections = () => {
    trackClientEvent('live_plan_directions_opened', {
      plan_id: plan.id,
      plan_type: plan.type,
      source: context,
    });
    if (context !== 'board') return;
    const clientEventId = window.crypto?.randomUUID?.();
    if (!clientEventId) return;
    void fetch('/api/places/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clientEventId,
        placeId: plan.place.venueId ?? plan.id,
        destinationVenueId: plan.place.venueId,
        placeSlug: plan.place.venueSlug,
        activeDareId:
          plan.type === 'paid_dare' || plan.type === 'community_spark'
            ? plan.sourceId
            : null,
        sourceSurface: 'board_live_plan',
      }),
      keepalive: true,
    }).catch(() => undefined);
  };

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

      {showSparkHook ? (
        <p className={`${compact ? 'mt-2 text-xs' : 'mt-3 text-sm'} line-clamp-2 font-bold leading-5 text-emerald-50/66`}>
          {plan.summary}
        </p>
      ) : null}

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

      {crewProgress != null ? (
        <div className="mt-3" aria-label={`${plan.people?.going ?? 0} of ${plan.people?.minimum ?? 0} people confirmed`}>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={plan.people?.minimum ?? 0}
            aria-valuenow={Math.min(plan.people?.going ?? 0, plan.people?.minimum ?? 0)}
            className="h-1.5 overflow-hidden rounded-full border border-white/7 bg-black/34"
          >
            <span
              className={`block h-full rounded-full transition-[width] duration-500 ${plan.people?.unlocked ? 'bg-emerald-300' : 'bg-[#f5c518]'}`}
              style={{ width: `${crewProgress}%` }}
            />
          </div>
        </div>
      ) : null}

      {plan.value?.indicativePerPersonPhp ? (
        <p className="mt-3 text-sm font-black text-cyan-100">~₱{plan.value.indicativePerPersonPhp} each</p>
      ) : plan.value?.rewardUsdc ? (
        <p className="mt-3 text-sm font-black text-yellow-100">{plan.value.rewardUsdc} USDC reward</p>
      ) : null}

      {!compact && plan.type !== 'community_spark' && (plan.summary || plan.trust.label) ? (
        <details className="mt-4 rounded-2xl border border-white/8 bg-black/20 px-4 py-3 text-xs text-white/46">
          <summary className="cursor-pointer list-none font-black uppercase tracking-[0.12em] text-white/56">Details</summary>
          {plan.summary ? <p className="mt-2 leading-5">{plan.summary}</p> : null}
          <p className="mt-2 text-[10px] leading-4 text-white/34">{plan.trust.label}{plan.trust.sourceLabel ? ` · ${plan.trust.sourceLabel}` : ''}</p>
        </details>
      ) : null}

      {context === 'board' ? (
        <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/7 pt-3">
          <Link
            href={mapHref}
            prefetch={false}
            onClick={() => trackClientEvent('live_plan_map_opened', {
              plan_id: plan.id,
              plan_type: plan.type,
              source: context,
            })}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-violet-200/16 bg-violet-300/[0.06] px-3 text-[9px] font-black uppercase tracking-[0.11em] text-violet-100/78 transition hover:border-violet-100/32 hover:text-white"
          >
            <Map className="h-3.5 w-3.5" aria-hidden="true" /> On map
          </Link>
          <a
            href={directionsHref}
            target="_blank"
            rel="noreferrer"
            onClick={recordDirections}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.065] px-3 text-[9px] font-black uppercase tracking-[0.11em] text-cyan-100 transition hover:border-cyan-100/36 hover:text-white"
          >
            <Navigation className="h-3.5 w-3.5" aria-hidden="true" /> Directions
          </a>
        </div>
      ) : null}

      <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 pt-4">
        <Link
          href={crewRoomReady ? getLivePlanCrewRoomHref(plan) : plan.action.href}
          prefetch={false}
          onClick={() => trackClientEvent('live_plan_action_opened', {
            action_kind: plan.action.kind,
            plan_id: plan.id,
            plan_type: plan.type,
            source: context,
          })}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-[#f5c518] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-[#171006] transition hover:bg-[#ffe36e] active:scale-[0.985]"
        >
          {crewRoomReady ? 'Open crew' : participant ? 'Open plan' : plan.action.label}
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </Link>
        <PlanShareButton
          title={plan.share.title}
          text={plan.share.text}
          href={plan.share.href}
          label="Share"
          compact
          analyticsSource={context}
          className="min-w-20"
        />
      </div>
    </article>
  );
}
