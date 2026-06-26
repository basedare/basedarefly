import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, Trophy } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { prisma } from '@/lib/prisma';
import { getPackBoard } from '@/lib/pack-server';
import { displayHandle, type BoardRow } from '@/lib/pack';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Pack Board | BaseDare' };

export default async function PackBoardPage({ params }: { params: Promise<{ pack: string }> }) {
  const { pack: packSlug } = await params;

  let pack: { id: string; name: string } | null = null;
  let board: BoardRow[] = [];
  try {
    pack = await prisma.pack.findUnique({ where: { slug: packSlug }, select: { id: true, name: true } });
    if (pack) board = await getPackBoard(pack.id);
  } catch {
    // tables not migrated yet
  }
  if (!pack) notFound();

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-md flex-col gap-6 px-4 py-16 sm:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/24 bg-[#f5c518]/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dd72]">
            <Trophy className="h-3.5 w-3.5" />
            {pack.name} Board
          </div>
          <h1 className="mt-4 text-3xl font-black uppercase italic tracking-tight text-[#f5c518] sm:text-4xl">
            The Pack
          </h1>
        </div>

        {board.length === 0 ? (
          <p className="rounded-[20px] border border-white/10 bg-black/40 p-6 text-center text-sm font-bold leading-6 text-white/55">
            No one&apos;s on the board yet. Find a mark, claim your Baretag, and be Founding Pack #1.
          </p>
        ) : (
          <div className="grid gap-1.5">
            {board.map((row) => (
              <div
                key={row.handle + row.rank}
                className="flex items-center justify-between rounded-[12px] border border-white/8 bg-white/[0.04] px-3 py-2.5 text-sm font-bold text-white/75"
              >
                <span className="flex items-center gap-2">
                  <span className="w-6 text-white/40">#{row.rank}</span>
                  {displayHandle(row.handle)}
                  {row.founding ? (
                    <span className="rounded-full border border-[#f5c518]/30 bg-[#f5c518]/[0.1] px-1.5 py-0.5 text-[8px] font-black uppercase tracking-[0.12em] text-[#f8dd72]">
                      founding
                    </span>
                  ) : null}
                </span>
                <span>{row.points} pts</span>
              </div>
            ))}
          </div>
        )}

        <Link
          href="/drops/hideaway-games-night?src=pack-board"
          className="inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[16px] border border-emerald-300/30 bg-[linear-gradient(180deg,rgba(52,211,153,0.22),rgba(16,122,87,0.32))] px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-emerald-50 transition hover:-translate-y-[1px]"
        >
          Join Hideaway Games Night
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </main>
  );
}
