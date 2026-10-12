'use client';

import Link from 'next/link';
import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import AdventurePreferenceControls from './AdventurePreferenceControls';
import { useRecommendationClock } from '@/hooks/useRecommendationClock';
import { DEFAULT_ADVENTURE_PREFERENCES, matchingAdventureSuggestions, type ActivityArea } from '@/lib/home-activities';
import { adventureHref } from '@/lib/adventure-progress';
import { trackClientEvent } from '@/lib/analytics';

/** Authored ideas stay separate from published events, attendance and paid inventory. */
export default function AdventureSuggestions({ area }: { area: ActivityArea }) {
  const now = useRecommendationClock();
  const [preferences, setPreferences] = useState(DEFAULT_ADVENTURE_PREFERENCES);
  const [rotation, setRotation] = useState(0);
  const matches = matchingAdventureSuggestions(area, now, preferences, rotation);
  const suggestions = matches.slice(0, 3);
  return <section className="mt-6" aria-label="Free adventures to try">
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div><p className="text-[10px] font-black uppercase tracking-[0.2em] text-violet-200">BaseDare suggestions · {area.label}</p>
        <h2 className="mt-2 text-xl font-black text-white">What fits right now?</h2>
        <p className="mt-2 text-xs leading-5 text-white/55">Choose your time and mood. These are free ideas you can try yourself, not scheduled events or paid work.</p></div>
      <Link href={adventureHref(undefined, undefined, area, preferences)} className="inline-flex min-h-11 items-center text-xs font-bold text-cyan-100">All adventures &amp; your journal →</Link>
    </div>
    <div className="mt-4"><AdventurePreferenceControls value={preferences} onChange={(next) => {
      setPreferences(next); setRotation(0);
      trackClientEvent('adventure_preferences_changed', { ...next, source: 'suggestions' });
    }} /></div>
    <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
      <p role="status" className="text-xs text-white/55">{suggestions.length ? `${suggestions.length} ${suggestions.length === 1 ? 'idea that fits' : 'ideas that fit'} · activity time excludes travel` : 'No ideas fit right now. Try another mood or a little more time.'}</p>
      {matches.length > 3 ? <button type="button" onClick={() => setRotation((value) => value + 1)} className="inline-flex min-h-11 items-center gap-2 text-xs font-bold text-white/70"><RefreshCw size={13} aria-hidden="true" />Another idea</button> : null}
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-3">{suggestions.map((activity) => <Link key={activity.id} href={adventureHref(activity.id, undefined, area, preferences)} className="bd-card p-5 transition hover:border-violet-200/35">
      <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Free · about {activity.minutes} min</p>
      <h3 className="mt-3 text-lg font-black text-white">{activity.title}</h3><p className="mt-2 text-sm leading-6 text-white/55">{activity.summary}</p>
      <span className="mt-4 inline-flex min-h-11 items-center text-xs font-bold text-cyan-100">Try this adventure →</span>
    </Link>)}</div>
  </section>;
}
