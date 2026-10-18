'use client';

import { useId } from 'react';
import { ChevronDown } from 'lucide-react';
import { ADVENTURE_MOODS, ADVENTURE_TIME_OPTIONS, type AdventurePreferences } from '@/lib/home-activities';

/** Two optional choices, scoped to free authored adventures rather than event inventory. */
export default function AdventurePreferenceControls({ value, onChange }: {
  value: AdventurePreferences;
  onChange: (value: AdventurePreferences) => void;
}) {
  const id = useId();
  const field = 'bd-field min-h-11 w-full appearance-none py-3 pl-3 pr-9 text-sm font-bold text-white';
  return (
    <div className="bd-well grid grid-cols-2 gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      <div>
        <label htmlFor={id + '-time'} className="mb-2 block text-sm font-bold text-white/65">Time available</label>
        <div className="relative">
          <select id={id + '-time'} className={field} value={value.minutes} onChange={(event) => onChange({ ...value, minutes: Number(event.target.value) as AdventurePreferences['minutes'] })}>
            {ADVENTURE_TIME_OPTIONS.map((minutes) => <option key={minutes} value={minutes} className="bg-[#15131e]">{minutes < 60 ? minutes + ' min' : minutes === 60 ? '1 hour' : '2 hours'}</option>)}
          </select>
          <ChevronDown aria-hidden="true" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50" />
        </div>
      </div>
      <div>
        <label htmlFor={id + '-mood'} className="mb-2 block text-sm font-bold text-white/65">Mood</label>
        <div className="relative">
          <select id={id + '-mood'} className={field} value={value.mood} onChange={(event) => onChange({ ...value, mood: event.target.value as AdventurePreferences['mood'] })}>
            {ADVENTURE_MOODS.map((mood) => <option key={mood.id} value={mood.id} className="bg-[#15131e]">{mood.label}</option>)}
          </select>
          <ChevronDown aria-hidden="true" size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-white/50" />
        </div>
      </div>
      <p className="col-span-2 text-sm leading-6 text-white/60 sm:col-span-1 sm:pb-3">Free to try · solo or with friends</p>
    </div>
  );
}
