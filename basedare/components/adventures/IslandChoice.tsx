'use client';
import Image from 'next/image';
import { TRIAL_ISLANDS, type TrialIsland } from '@/lib/island-trials';

export default function IslandChoice({ value, onChange }: { value?: TrialIsland; onChange: (island: TrialIsland) => void }) {
  return <fieldset className="mt-6"><legend className="text-lg font-black text-white">First, pick your island.</legend><p className="mt-2 text-sm leading-6 text-white/65">Choose the place you can explore or tell a story about. Everyone makes their own attempt.</p><div className="mt-4 grid grid-cols-3 gap-2 sm:gap-3">{TRIAL_ISLANDS.map((island) => <button type="button" key={island.id} aria-pressed={value === island.id} onClick={() => onChange(island.id)} className={`relative min-h-36 overflow-hidden rounded-2xl border p-2.5 text-left sm:p-4 shadow-lg transition ${value === island.id ? 'border-amber-200 bg-[#322717] ring-2 ring-amber-200/30' : 'border-violet-200/20 bg-[#191525] hover:border-violet-200/50'}`}>
    <Image src={`/assets/map/graffiti-v1/${island.art}.webp`} alt="" width={100} height={100} sizes="100px" className="absolute right-0 top-0 h-24 w-24 -rotate-12 object-contain opacity-60" /><span className="relative block pt-9 text-base sm:text-xl font-black text-amber-100">{island.label}</span><span className="relative mt-2 hidden max-w-[22ch] sm:block text-sm leading-5 text-white/75">{island.line}</span><span className="relative mt-3 block text-sm font-bold text-cyan-100">{value === island.id ? 'Selected ✓' : 'Choose →'}</span>
  </button>)}</div></fieldset>;
}
