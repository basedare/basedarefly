'use client';
import Link from '@/components/DiscoveryLink';
import { useDiscovery } from '@/components/DiscoveryProvider';
import { useRecommendationClock } from '@/hooks/useRecommendationClock';
import { suggestionsForArea } from '@/lib/home-activities';
import { adventureHref } from '@/lib/adventure-progress';
import { PERSONAL_COLLECTION } from '@/lib/adventure-passport';
import { trackClientEvent } from '@/lib/analytics';
export default function HomeFirstAdventure() {
  const { area } = useDiscovery();
  const now = useRecommendationClock();
  const eligible = suggestionsForArea(area, now);
  const activity = eligible.filter((item) => PERSONAL_COLLECTION.activities.some((id) => id === item.id)).sort((a,b) => a.minutes - b.minutes)[0] ?? eligible[0];
  if (!activity) return null;
  return <div className="bd-card mx-auto mt-4 max-w-sm p-4 text-left" aria-label="Your first free adventure">
    <p className="text-[10px] font-bold uppercase tracking-widest text-violet-200">Try one now · free · about {activity.minutes} min</p>
    <p className="mt-1 text-base font-black text-white">{activity.title}</p>
    <Link className="bd-action bd-action--gold mt-3 w-full !text-xs" href={adventureHref(activity.id, undefined, area)} onClick={() => trackClientEvent('home_first_adventure_opened', { activity_id: activity.id })}>Start an adventure →</Link>
    <p className="mt-2 text-xs leading-5 text-white/60">Solo or with friends. No sign-in, filming or payment required.</p>
  </div>;
}
