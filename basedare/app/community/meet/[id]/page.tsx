import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import MeetupPlanClient from '@/components/community/MeetupPlanClient';
import { getMeetupSharePath } from '@/lib/meetup-plan';
import { getMeetupPlan } from '@/lib/meetup-plan-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const plan = await getMeetupPlan(id).catch(() => null);
  if (!plan) return { title: 'Meetup | BaseDare' };
  return {
    title: `Meet at ${plan.placeLabel} | BaseDare`,
    description: `${Math.max(1, plan.rsvpCount)} going. Open the plan, join and invite a mate.`,
    alternates: { canonical: getMeetupSharePath(plan.id) },
  };
}

export default async function MeetupPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getMeetupPlan(id).catch(() => null);
  if (!plan) notFound();
  return <MeetupPlanClient initialPlan={plan} />;
}
