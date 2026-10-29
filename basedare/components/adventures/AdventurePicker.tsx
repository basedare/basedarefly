'use client';

import { ChevronDown } from 'lucide-react';
import AdventureCard from './AdventureCard';
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
    {suggested ? <AdventureCard activity={suggested} href={href(suggested.id)} featured /> : <div className="bd-well p-5" role="status">
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
      <div className="grid gap-3 pb-4 sm:grid-cols-2">{alternatives.map((activity) => <AdventureCard key={activity.id} activity={activity} href={href(activity.id)} />)}</div>
    </details> : null}
  </div>;
}
