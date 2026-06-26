import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { prisma } from '@/lib/prisma';
import ClaimMarkFlow from './ClaimMarkFlow';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Claim your mark | BaseDare Pack' };

export default async function MarkPage({ params }: { params: Promise<{ pack: string; mark: string }> }) {
  const { pack: packSlug, mark: markSlug } = await params;

  let pack: { id: string; name: string } | null = null;
  let mark: { name: string; artUrl: string | null } | null = null;
  try {
    pack = await prisma.pack.findUnique({ where: { slug: packSlug }, select: { id: true, name: true } });
    if (pack) {
      mark = await prisma.mark.findUnique({
        where: { packId_slug: { packId: pack.id, slug: markSlug } },
        select: { name: true, artUrl: true },
      });
    }
  } catch {
    // tables not migrated yet — falls through to notFound
  }
  if (!pack || !mark) notFound();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 sm:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dd72]">
            <Sparkles className="h-3.5 w-3.5" />
            {pack.name}
          </div>
          <h1 className="mt-4 text-3xl font-black uppercase italic leading-[1.05] tracking-tight text-white sm:text-4xl">
            You found {mark.name}
          </h1>
          <p className="mt-3 text-sm font-bold leading-6 text-white/55">
            Claim your Baretag, enter the word on the card, and land on the {pack.name} board.
          </p>
        </div>

        <ClaimMarkFlow packSlug={packSlug} markSlug={markSlug} markName={mark.name} packName={pack.name} />

        <p className="text-center text-[11px] font-semibold leading-5 text-white/35">
          No wallet, no app. Just claim your spot.
        </p>
      </div>
    </main>
  );
}
