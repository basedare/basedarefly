'use client';

import { CHAOS_QUESTS } from '@/lib/chaos-quests';
import { useState } from 'react';
import { Sparkles } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import AdventureCard from '@/components/adventures/AdventureCard';
import AdventurePreferenceControls from '@/components/adventures/AdventurePreferenceControls';
import { DEFAULT_ADVENTURE_PREFERENCES, matchingAdventureSuggestions, type ActivityArea } from '@/lib/home-activities';
import { adventureHref } from '@/lib/adventure-progress';

/** Anywhere prompts are browsed here, never attached to invented map pins. */
export default function MapFreeAdventures({ area, now }: { area: ActivityArea; now: Date }) {
  const [preferences, setPreferences] = useState(DEFAULT_ADVENTURE_PREFERENCES);
  const [chaosOnly, setChaosOnly] = useState(true);
  const eligible = matchingAdventureSuggestions(area, now, preferences);
  const matches = chaosOnly ? CHAOS_QUESTS.filter((item) => eligible.some((match) => match.id === item.id)) : eligible;
  return <Dialog>
    <DialogTrigger asChild><button type="button" className="pointer-events-auto inline-flex min-h-11 items-center gap-2 rounded-2xl border border-violet-200/25 bg-[#161024]/95 px-3 text-xs font-black text-violet-100 shadow-lg"><Sparkles size={15} aria-hidden="true" />Play · Free adventures</button></DialogTrigger>
    <DialogContent className="z-[250] flex max-h-[88dvh] w-[calc(100%-1rem)] max-w-3xl flex-col overflow-hidden rounded-3xl border-white/15 bg-[#0b0b14] p-4 text-white sm:p-6 [&>button:last-child]:right-2 [&>button:last-child]:top-2 [&>button:last-child]:grid [&>button:last-child]:h-11 [&>button:last-child]:w-11 [&>button:last-child]:place-items-center">
      <div className="shrink-0 pr-10"><DialogTitle className="text-2xl font-black">A little chaos. Zero cost.</DialogTitle><DialogDescription className="mt-2 text-sm leading-6 text-white/65">Pick a free adventure. No account, upload or public post needed.</DialogDescription></div>
      <div className="min-h-0 overflow-y-auto overscroll-contain pb-3">
        <div className="flex flex-wrap gap-2" aria-label="Adventure collection">{[{ label: 'Chaos Quests', chaos: true }, { label: 'All free adventures', chaos: false }].map((tab) => <button key={tab.label} type="button" aria-pressed={chaosOnly === tab.chaos} onClick={() => setChaosOnly(tab.chaos)} className={`min-h-11 rounded-full border px-4 text-sm font-bold ${chaosOnly === tab.chaos ? 'border-amber-200/40 bg-amber-200/10 text-amber-100' : 'border-white/15 text-white/65'}`}>{tab.label}</button>)}</div>
        <details className="my-3 rounded-xl border border-white/10 px-3"><summary className="min-h-11 cursor-pointer py-3 text-sm font-bold text-white/75">Adjust time & mood</summary><AdventurePreferenceControls value={preferences} onChange={setPreferences} /></details>
        <p className="mb-3 text-sm leading-6 text-white/60">{chaosOnly ? 'Play anywhere suitable. Choose a safe spot; these aren’t scheduled events.' : `Exploring ${area.label}. These are self-guided ideas, with no host or cash reward.`}</p>
        {matches.length ? <div className="grid gap-4 sm:grid-cols-2">{matches.map((activity) => <AdventureCard key={activity.id} activity={activity} href={`${adventureHref(activity.id, undefined, area, preferences)}${adventureHref(activity.id, undefined, area, preferences).includes('?') ? '&' : '?'}from=map`} />)}</div> : <p role="status" className="bd-well p-4 text-sm leading-6">Nothing fits these choices. Try more time or another mood.</p>}
      </div>
    </DialogContent>
  </Dialog>;
}
