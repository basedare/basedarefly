import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import AdventureHub from '@/components/adventures/AdventureHub';
import { SIARGAO_CHALLENGE_ID, SIARGAO_VERDICTS, readSiargaoVerdict, siargaoChallengeHref } from '@/lib/siargao-challenge';

type Props = { params: Promise<{ id: string; verdict: string }> };
export function generateStaticParams() {
  return SIARGAO_VERDICTS.map(({ id }) => ({ id: SIARGAO_CHALLENGE_ID, verdict: id }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id, verdict } = await params;
  const choice = id === SIARGAO_CHALLENGE_ID && SIARGAO_VERDICTS.find((item) => item.id === verdict);
  if (!choice) return {};
  const title = `${choice.headline} | BaseDare`;
  const description = `${choice.invitation} A personal take on a free Siargao adventure. Explore, decide for yourself, and invite a friend. No sign-in required.`;
  const path = siargaoChallengeHref(choice.id);
  return { title, description, alternates: { canonical: path },
    openGraph: { title, description, url: path, images: [{ url: `${path}/card`, width: 1200, height: 630, alt: choice.headline }] },
    twitter: { card: 'summary_large_image', title, description, images: [`${path}/card`] },
  };
}
export default async function VerdictPage({ params }: Props) {
  const { id, verdict } = await params;
  const choice = readSiargaoVerdict(verdict);
  if (id !== SIARGAO_CHALLENGE_ID || !choice) notFound();
  // A shared opinion never imports someone else's completion or progress.
  return <Suspense fallback={<p className="p-12 text-white">Opening the Siargao challenge…</p>}><AdventureHub activityId={id} invitedVerdict={choice} /></Suspense>;
}
