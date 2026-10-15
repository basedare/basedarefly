import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { ACTIVITY_SUGGESTIONS } from '@/lib/home-activities';
import AdventureHub from '@/components/adventures/AdventureHub';
export function generateStaticParams() { return ACTIVITY_SUGGESTIONS.map(({ id }) => ({ id })); }
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = ACTIVITY_SUGGESTIONS.find((item) => item.id === id);
  if (!activity) return {};
  const title = `${activity.title} | BaseDare`;
  const description = `${activity.summary} Free to try, solo or with friends. About ${activity.minutes} minutes, plus travel. Sharing is optional.`;
  return { title, description, alternates: { canonical: `/adventures/${id}` }, openGraph: { title, description, url: `/adventures/${id}` }, twitter: { card: 'summary_large_image' as const, title, description } };
}
export default async function AdventurePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!ACTIVITY_SUGGESTIONS.some((a) => a.id === id)) notFound();
  return <Suspense fallback={<p className="p-12 text-white">Opening your adventure…</p>}><AdventureHub activityId={id} /></Suspense>;
}
