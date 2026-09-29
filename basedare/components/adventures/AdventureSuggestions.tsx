'use client';
import Link from 'next/link';
import { useRecommendationClock } from '@/hooks/useRecommendationClock';
import { suggestionsForArea, type ActivityArea } from '@/lib/home-activities';
import { adventureHref } from '@/lib/adventure-progress';

/** Authored ideas stay separate from published events, attendance and paid inventory. */
export default function AdventureSuggestions({ area }: { area: ActivityArea }) {
  const now = useRecommendationClock();
  const suggestions = suggestionsForArea(area, now).slice(0, 3);
  return <section className="mt-6" aria-label="Free adventures to try">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">BaseDare suggestions · {area.label}</p>
        <h2 className="mt-2 text-xl font-black text-white">Make your own next move.</h2>
        <p className="mt-2 text-xs leading-5 text-white/55">Free activities you can start yourself, suited to the local time now. These are ideas, not scheduled events or paid work.</p></div>
      <Link href={adventureHref(undefined, undefined, area)} className="inline-flex min-h-11 items-center text-xs font-bold text-cyan-100">All adventures &amp; your journal →</Link>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{suggestions.map((activity) => <Link key={activity.id} href={adventureHref(activity.id, undefined, area)} className="rounded-[1.5rem] border border-violet-200/15 bg-[linear-gradient(145deg,rgba(39,26,64,0.8),rgba(7,8,16,0.95))] p-5 transition hover:border-violet-200/35">
      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Free · {activity.minutes} min</p>
      <h3 className="mt-3 text-lg font-black text-white">{activity.title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{activity.summary}</p>
      <span className="mt-4 inline-flex min-h-11 items-center text-xs font-bold text-cyan-100">Try this adventure →</span>
    </Link>)}</div>
  </section>;
}
