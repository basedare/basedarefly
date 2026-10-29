import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { ActivitySuggestion } from '@/lib/home-activities';
import AdventureCover from './AdventureCover';

export default function AdventureCard({ activity, href, featured = false }: { activity: ActivitySuggestion; href: string; featured?: boolean }) {
  return <article className="bd-card min-w-0 overflow-hidden !p-0">
    <AdventureCover activity={activity} hero={featured} />
    <div className="p-4 sm:p-5">
      <p className="text-xs font-bold text-amber-100">{activity.collection ?? 'Free adventure'} · About {activity.minutes} min · Free</p>
      <h2 className={`mt-3 font-black tracking-tight text-white ${featured ? 'text-2xl sm:text-3xl' : 'text-xl'}`}>{activity.title}</h2>
      <p className="mt-2 text-base leading-7 text-white/75">{activity.hook ?? activity.summary}</p>
      <p className="mt-3 text-sm leading-6 text-cyan-100">{activity.company ?? 'Solo or with friends'} · {activity.collection === 'Chaos Quests' ? 'Play anywhere suitable' : 'At your own pace'}</p>
      <Link href={href} className={`mt-4 w-full !text-sm ${featured ? 'bd-action bd-action--gold' : 'bd-action'}`}>See adventure <ArrowRight size={16} aria-hidden="true" /></Link>
    </div>
  </article>;
}
