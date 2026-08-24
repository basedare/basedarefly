'use client';

import { CalendarPlus } from 'lucide-react';
import { useState } from 'react';

import { triggerHaptic } from '@/lib/mobile-haptics';
import { buildPlanCalendarFile } from '@/lib/plan-calendar';
import { getBaseDareUrl } from '@/lib/social-share';

export default function PlanCalendarButton({
  plan,
  label = 'Calendar',
  compact = false,
  className = '',
}: {
  plan: {
    id: string;
    title: string;
    placeLabel: string;
    startsAt: string | null;
    endsAt?: string | null;
    href: string;
    description?: string | null;
  };
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const [saved, setSaved] = useState(false);
  if (!plan.startsAt || !Number.isFinite(new Date(plan.startsAt).getTime())) return null;

  const addToCalendar = () => {
    const file = buildPlanCalendarFile({
      id: plan.id,
      title: plan.title,
      placeLabel: plan.placeLabel,
      startsAt: plan.startsAt,
      endsAt: plan.endsAt,
      detailsUrl: getBaseDareUrl(plan.href),
      description: plan.description,
    });
    if (!file) return;

    const url = URL.createObjectURL(new Blob([file.content], { type: 'text/calendar;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = file.filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    triggerHaptic('selection');
    setSaved(true);
    window.setTimeout(() => setSaved(false), 1600);
  };

  return (
    <button
      type="button"
      onClick={addToCalendar}
      className={`${compact ? 'min-h-10 rounded-full px-3 text-[9px]' : 'min-h-11 rounded-2xl px-4 text-[10px]'} inline-flex items-center justify-center gap-2 border border-violet-200/20 bg-violet-300/[0.07] font-black uppercase tracking-[0.13em] text-violet-100 transition hover:border-violet-100/38 hover:bg-violet-300/[0.12] ${className}`.trim()}
    >
      <CalendarPlus className="h-4 w-4" />
      {saved ? 'Added' : label}
    </button>
  );
}
