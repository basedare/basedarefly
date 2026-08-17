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
    title: `${plan.title} | BaseDare Rally`,
    description: `${plan.placeLabel} · ${Math.max(1, plan.rsvpCount)} going${plan.minimumPeople ? ` · ${Math.max(0, plan.minimumPeople - plan.rsvpCount)} more needed` : ''}.`,
    alternates: { canonical: getMeetupSharePath(plan.id) },
  };
}

export default async function MeetupPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const plan = await getMeetupPlan(id).catch(() => null);
  if (!plan) notFound();
  return <MeetupPlanClient initialPlan={plan} />;
}
