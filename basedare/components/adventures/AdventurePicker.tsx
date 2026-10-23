'use client';

import Link from '@/components/DiscoveryLink';
import { ArrowRight, ChevronDown, Compass } from 'lucide-react';
import AdventurePreferenceControls from './AdventurePreferenceControls';
import { ADVENTURE_MOODS, type ActivitySuggestion, type AdventurePreferences } from '@/lib/home-activities';

export default function AdventurePicker({ matches, preferences, onChange, href }: {
  matches: ActivitySuggestion[];
  preferences: AdventurePreferences;
  onChange: (value: AdventurePreferences) => void;
  href: (id: string) => string;
}) {
  const [suggested, ...alternatives] = matches;
  return <div>
    {suggested ? <article className="bd-surface p-5 sm:p-7" aria-label="Suggested adventure">
      <div className="flex items-center gap-2 text-sm font-bold text-violet-200"><Compass size={18} aria-hidden="true" />Up for this?</div>
      <h2 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">{suggested.title}</h2>
      <p className="mt-3 text-base leading-7 text-white/75">{suggested.summary}</p>
      <p className="mt-5 text-sm font-semibold text-cyan-100">About {suggested.minutes} min · Free · Solo or with friends</p>
      <Link href={href(suggested.id)} className="bd-action bd-action--gold mt-5 w-full !text-sm">See adventure <ArrowRight size={17} aria-hidden="true" /></Link>
      <p className="mt-3 text-sm leading-6 text-white/60">Jump in without signing in or paying. Allow a little extra time to get there.</p>
    </article> : <div className="bd-well p-5" role="status">
      <h2 className="text-lg font-bold text-white">Try a different mood or a little more time.</h2>
      <p className="mt-2 text-base leading-7 text-white/65">Nothing fits these choices right now where you’re exploring.</p>
    </div>}

    <details className="bd-well mt-4 p-4 sm:p-5">
      <summary className="flex min-h-11 cursor-pointer list-none flex-wrap items-center justify-between gap-2 text-sm font-bold text-white/85">
        <span>Adjust suggestions</span><span className="flex items-center gap-2 font-normal text-white/60">{preferences.minutes} min · {ADVENTURE_MOODS.find((mood) => mood.id === preferences.mood)?.label}<ChevronDown size={16} aria-hidden="true" /></span>
      </summary>
      <div className="mt-3"><AdventurePreferenceControls value={preferences} onChange={onChange} /></div>
    </details>

    {alternatives.length ? <details className="mt-3 rounded-2xl border border-white/10 px-4 sm:px-5">
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 text-sm font-bold text-white/80">More ideas <ChevronDown size={16} aria-hidden="true" /></summary>
      <div className="grid gap-3 pb-4 sm:grid-cols-2">{alternatives.map((activity) => <article key={activity.id} className="bd-card p-4">
        <h3 className="text-lg font-bold text-white">{activity.title}</h3>
        <p className="mt-2 text-base leading-7 text-white/65">{activity.summary}</p>
        <p className="mt-3 text-sm text-cyan-100">About {activity.minutes} min · Free</p>
        <Link href={href(activity.id)} className="mt-2 inline-flex min-h-11 items-center gap-2 text-sm font-bold text-violet-100">See adventure <ArrowRight size={15} aria-hidden="true" /></Link>
      </article>)}</div>
    </details> : null}
  </div>;
}
