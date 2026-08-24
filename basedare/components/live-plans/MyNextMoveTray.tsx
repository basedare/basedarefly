'use client';

import Link from 'next/link';
import { ChevronRight, MapPin, Sparkles, Users } from 'lucide-react';

import PlanShareButton from '@/components/community/PlanShareButton';
import PlanCalendarButton from '@/components/live-plans/PlanCalendarButton';
import { getLivePlanMapHref, isLivePlanCalendarReady, type LivePlan } from '@/lib/live-plans';

function formatTime(value: string | null) {
  if (!value) return 'Open now';
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'Soon';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

function commitmentLabel(plan: LivePlan) {
  if (!plan.people) return plan.status.label;
  if (plan.people.spotsNeeded && plan.people.spotsNeeded > 0) {
    return `${plan.people.spotsNeeded} more ${plan.people.spotsNeeded === 1 ? 'makes it' : 'needed'}`;
  }
  if (plan.people.minimum && plan.people.unlocked) return 'Crew unlocked';
  if (plan.people.going) return `${plan.people.going} going`;
  return plan.status.label;
}

export default function MyNextMoveTray({ plans }: { plans: LivePlan[] }) {
  const plan = plans[0];
  if (!plan) return null;
  const calendarReady = isLivePlanCalendarReady(plan);

  return (
    <aside
      id="my-next-move"
      className="fixed inset-x-3 bottom-3 z-40 mx-auto max-w-2xl overflow-hidden rounded-[1.35rem] border border-emerald-200/20 bg-[linear-gradient(150deg,rgba(10,35,30,0.97),rgba(5,8,14,0.99))] p-3 shadow-[0_20px_70px_rgba(0,0,0,0.62),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl"
      aria-label="My next move"
    >
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-emerald-200/18 bg-emerald-300/[0.08] text-emerald-100">
          <Sparkles className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[8px] font-black uppercase tracking-[0.2em] text-emerald-100/58">You&apos;re in · My next move</span>
          <strong className="mt-1 block truncate text-sm text-white">{plan.title}</strong>
          <span className="mt-0.5 block truncate text-[10px] font-bold text-white/42">{plan.place.label} · {formatTime(plan.startsAt)}</span>
        </span>
        <span className="hidden shrink-0 items-center gap-1.5 rounded-full border border-amber-200/16 bg-amber-300/[0.06] px-3 py-2 text-[9px] font-black text-amber-100/72 sm:inline-flex">
          <Users className="h-3.5 w-3.5" /> {commitmentLabel(plan)}
        </span>
        <Link href={plan.action.href} className="inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full bg-emerald-300 px-4 text-[9px] font-black uppercase tracking-[0.12em] text-[#032018]">
          Open <ChevronRight className="h-3.5 w-3.5" />
        </Link>
      </div>

      <div className={`mt-2 grid ${calendarReady ? 'grid-cols-3' : 'grid-cols-2'} gap-2 border-t border-white/7 pt-2`}>
        <Link href={getLivePlanMapHref(plan)} prefetch={false} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-full border border-cyan-200/18 bg-cyan-300/[0.065] px-3 text-[9px] font-black uppercase tracking-[0.12em] text-cyan-100">
          <MapPin className="h-4 w-4" /> Map
        </Link>
        {calendarReady ? (
          <PlanCalendarButton plan={{
            id: plan.id,
            title: plan.title,
            placeLabel: plan.place.label,
            startsAt: plan.startsAt,
            endsAt: plan.endsAt,
            href: plan.action.href,
            description: commitmentLabel(plan),
          }} compact />
        ) : null}
        <PlanShareButton title={plan.share.title} text={plan.share.text} href={plan.share.href} label="Invite" compact />
      </div>
    </aside>
  );
}
