import { getMeetupPlan } from '@/lib/meetup-plan-server';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderProofCard } from '@/lib/og-proof-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OG_ALT;
export const runtime = 'nodejs';

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getMeetupPlan(id).catch(() => null);
  if (!plan) {
    return renderProofCard({
      eyebrow: 'MEET ME HERE',
      title: 'Make a local plan',
      stats: [
        { value: '1 place', label: 'to meet' },
        { value: '1 time', label: 'to show up' },
        { value: '1 link', label: 'to join' },
      ],
      badge: 'OPEN',
      badgeTone: 'gold',
    });
  }
  const when = new Intl.DateTimeFormat('en-PH', {
    timeZone: 'Asia/Manila',
    weekday: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(plan.startTime));
  return renderProofCard({
    eyebrow: 'MEET ME HERE',
    title: plan.placeLabel,
    location: when,
    stats: [
      { value: String(Math.max(1, plan.rsvpCount)), label: 'going' },
      { value: 'Public', label: 'meeting place' },
      { value: '1 tap', label: 'to join' },
    ],
    badge: plan.status === 'ENDED' ? 'ENDED' : 'JOIN PLAN',
    badgeTone: plan.status === 'ENDED' ? 'emerald' : 'gold',
  });
}
