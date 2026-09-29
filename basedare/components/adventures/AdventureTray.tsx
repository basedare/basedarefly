'use client';
import Link from 'next/link';
import { Compass, ArrowRight } from 'lucide-react';
import { useAdventureProgress } from '@/hooks/useAdventureProgress';
import { activeAdventure, adventureHref } from '@/lib/adventure-progress';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';

export default function AdventureTray({ className = '' }: { className?: string }) {
  const { progress } = useAdventureProgress();
  const run = activeAdventure(progress);
  const activity = ACTIVITY_SUGGESTIONS.find((a) => a.id === run?.activityId);
  if (!run || !activity) return null;
  return <aside className={`fixed inset-x-3 bottom-3 z-40 mx-auto max-w-xl rounded-2xl border border-violet-200/25 bg-[#100d20]/95 p-3 shadow-xl backdrop-blur ${className}`} aria-label="Your adventure">
    <Link href={adventureHref(activity.id, run.placeSlug, run.area)} className="flex min-h-11 items-center gap-3">
      <Compass className="shrink-0 text-violet-200" size={22} />
      <div className="min-w-0 flex-1"><p className="text-[10px] font-black uppercase tracking-widest text-violet-200">Your adventure · {run.steps.length}/{activity.steps.length} steps</p><p className="truncate text-sm font-bold text-white">{activity.title}</p></div>
      <ArrowRight className="shrink-0 text-yellow-200" size={18} />
    </Link>
  </aside>;
}
