import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import AdventureHub from '@/components/adventures/AdventureHub';
export function generateStaticParams() { return ACTIVITY_SUGGESTIONS.map(({ id }) => ({ id })); }
export default async function AdventurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ACTIVITY_SUGGESTIONS.some((a) => a.id === id)) notFound();
  return <Suspense fallback={<p className="p-12 text-white">Opening your adventure…</p>}><AdventureHub activityId={id} /></Suspense>;
}
