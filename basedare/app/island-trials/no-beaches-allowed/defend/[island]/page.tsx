import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import AdventureHub from '@/components/adventures/AdventureHub';
import { ISLAND_TRIAL_ID, TRIAL_ISLANDS } from '@/lib/island-trials';

export function generateStaticParams() { return TRIAL_ISLANDS.map(({ id }) => ({ island: id })); }
export async function generateMetadata({ params }: { params: Promise<{ island: string }> }) {
  const { island } = await params;
  const choice = TRIAL_ISLANDS.find((item) => item.id === island);
  if (!choice) return {};
  const title = `I defended ${choice.label} — now pick your island | BaseDare`;
  const description = 'Island Trial #001: No Beaches Allowed. A self-reported adventure, not a verified visit or winner. Your turn to find something beyond the beach.';
  const url = `/island-trials/no-beaches-allowed/defend/${island}`;
  return { title, description, alternates: { canonical: url }, openGraph: { title, description, url, images: [{ url: url + '/card', width: 1200, height: 630 }] }, twitter: { card: 'summary_large_image' as const, title, description, images: [url + '/card'] } };
}
export default async function Page({ params }: { params: Promise<{ island: string }> }) {
  const { island } = await params;
  const choice = TRIAL_ISLANDS.find((item) => item.id === island);
  if (!choice) notFound();
  return <Suspense fallback={<p className="bd-page-top p-6 text-white">Opening your own attempt…</p>}><AdventureHub activityId={ISLAND_TRIAL_ID} invitedIsland={choice.id} /></Suspense>;
}
