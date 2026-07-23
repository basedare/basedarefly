import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';

import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'Playable route receipt | BaseDare', robots: { index: false, follow: false } };

export default async function RouteReceiptPage({ params }: { params: Promise<{ receiptCode: string }> }) {
  const { receiptCode } = await params;
  const run = await prisma.playableRouteRun.findUnique({
    where: { receiptCode },
    include: {
      route: true,
      progress: { orderBy: { completedAt: 'asc' }, include: { stop: { include: { venue: { select: { slug: true, name: true } } } } } },
    },
  });
  if (!run || run.status !== 'COMPLETE' || !run.completedAt) notFound();
  return <main className="min-h-screen bg-[#07070b] px-4 py-16 text-white sm:px-6"><div className="mx-auto max-w-3xl">
    <header className="rounded-[32px] border border-emerald-300/20 bg-gradient-to-br from-emerald-300/[0.09] to-[#101018] p-7">
      <p className="text-[10px] font-black uppercase tracking-[0.24em] text-emerald-200">Verified route receipt</p>
      <h1 className="mt-4 text-4xl font-black sm:text-5xl">{run.route.title}</h1>
      <p className="mt-3 text-sm text-white/50">Completed {run.completedAt.toLocaleString()} · {run.progress.length} secure place check-ins</p>
    </header>
    <section className="mt-6 grid gap-3">{run.progress.map((item, index) => <article key={item.id} className="rounded-2xl border border-white/10 bg-white/[0.035] p-5"><p className="text-[9px] font-black uppercase tracking-[0.18em] text-[#ffe36a]">Stop {index + 1} · verified presence</p><h2 className="mt-2 text-xl font-black">{item.stop.venue.name}</h2><p className="mt-2 text-sm text-white/55">{item.stop.loreTitle}</p></article>)}</section>
    <div className="mt-6 flex gap-3"><Link href={`/routes/${run.route.slug}`} className="inline-flex min-h-12 flex-1 items-center justify-center rounded-2xl bg-[#f5c518] px-4 text-sm font-black text-[#15120c]">Open route</Link><Link href="/map" className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-white/10 px-4 text-sm font-black text-white/65">Map</Link></div>
    <p className="mt-5 text-xs leading-5 text-white/35">This receipt confirms secure place check-ins. It does not prove a purchase, endorse a venue, or expose the player&apos;s wallet or precise device coordinates.</p>
  </div></main>;
}
