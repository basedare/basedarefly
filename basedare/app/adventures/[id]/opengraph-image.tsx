import { adventureOg } from '@/lib/adventure-og';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import { OG_CONTENT_TYPE, OG_SIZE, renderProofCard } from '@/lib/og-proof-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = 'BaseDare — a free adventure to try yourself';
export const runtime = 'nodejs';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = ACTIVITY_SUGGESTIONS.find((item) => item.id === id);
  if (activity?.collection) return adventureOg({ title: activity.title, eyebrow: activity.collection.toUpperCase(), invitation: activity.hook ?? activity.summary, footer: `Free · about ${activity.minutes} min · ${activity.company ?? 'solo or with friends'} · sharing is optional` });
  return renderProofCard({
    eyebrow: activity?.collection === 'Chaos Quests' ? `CHAOS QUESTS · ${activity.category?.toUpperCase()}` : 'SOMETHING WORTH TRYING',
    title: activity?.title ?? 'Find your next adventure',
    stats: [{ value: activity ? `${activity.minutes} min` : 'Your pace', label: 'activity time · travel extra' }, { value: activity?.company ?? 'Solo or together', label: 'sharing is optional' }],
    badge: 'TRY THIS',
    badgeTone: 'gold',
    footerNote: 'Free activity · no cash reward · your own attempt',
  });
}
