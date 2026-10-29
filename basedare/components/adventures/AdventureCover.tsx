import Image from 'next/image';
import type { ActivitySuggestion } from '@/lib/home-activities';

const originals: Record<string, string> = {
  'little-local-loop': 'palm', 'three-details': 'rumor', 'light-hunt': 'wine',
  'one-minute-story': 'cafe', soundtrack: 'rumor', 'tomorrow-pick': 'flag', postcard: 'palm', 'siargao-verdict': 'surf',
};
const tones = { cyan: { ink: '#7de3e8', wash: '#123f49' }, violet: { ink: '#c19bff', wash: '#38214d' }, gold: { ink: '#f7cf4b', wash: '#49371b' } };

/** Owned illustration + print treatment; never presented as a place photo. */
export default function AdventureCover({ activity, hero = false }: { activity: ActivitySuggestion; hero?: boolean }) {
  const tone = tones[activity.cover?.tone ?? 'violet'];
  return <div aria-hidden="true" className={`relative isolate overflow-hidden bg-[#0c0e18] ${hero ? 'aspect-[16/9] sm:aspect-[2/1]' : 'aspect-[16/9]'}`} style={{ backgroundImage: `radial-gradient(ellipse at 65% 45%, ${tone.wash} 0%, #0c0e18 75%)` }}>
    <svg className="absolute inset-0 h-full w-full opacity-25" viewBox="0 0 600 340" preserveAspectRatio="xMidYMid slice"><g fill="none" stroke={tone.ink}><ellipse cx="350" cy="210" rx="210" ry="95" strokeWidth="2" transform="rotate(-20 350 210)"/><ellipse cx="350" cy="210" rx="230" ry="105" strokeWidth="1" transform="rotate(-20 350 210)"/><path d="M-20 260L620 60M-20 282L620 82" strokeWidth="1"/><circle cx="510" cy="70" r="90" strokeDasharray="3 12"/></g></svg>
    <span className="absolute left-4 top-4 z-10 rounded-full border border-white/20 bg-black/40 px-3 py-1.5 text-[11px] font-black uppercase tracking-[0.14em] text-white/90">{activity.category ?? 'A little adventure'}</span>
    <Image src={`/assets/map/graffiti-v1/${activity.cover?.art ?? originals[activity.id] ?? 'flag'}.webp`} alt="" width={320} height={320} sizes="(max-width: 640px) 200px, 280px" className="absolute right-[8%] top-[5%] h-[85%] w-[60%] rotate-[-8deg] object-contain drop-shadow-[0_18px_12px_rgba(0,0,0,0.6)]" />
    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-12">
      <p className="max-w-[20ch] text-lg font-black italic leading-tight tracking-tight sm:text-xl" style={{ color: tone.ink }}>{activity.cover?.line ?? 'GET OUT. FIND A LITTLE STORY.'}</p>
    </div>
  </div>;
}
