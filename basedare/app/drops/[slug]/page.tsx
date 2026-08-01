import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sparkles } from 'lucide-react';

import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';
import { normalizeTargetType } from '@/lib/creator-attribution-policy';
import { parseCreatorDropMetadata } from '@/lib/creator-drops';
import { getDrop, type RosterView } from '@/lib/drops';
import { getRosterView } from '@/lib/drops-server';
import { prisma } from '@/lib/prisma';
import CreatorDropLanding from './CreatorDropLanding';
import JoinDropForm from './JoinDropForm';

export const dynamic = 'force-dynamic';

type DropPageProps = {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export async function generateMetadata({ params }: DropPageProps): Promise<Metadata> {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) {
    const creatorDrop = await getCreatorDropLink(slug);
    if (!creatorDrop) return { title: 'Creator Drop | BaseDare' };
    return {
      title: `${creatorDrop.metadata.title} | BaseDare`,
      description: creatorDrop.metadata.hook,
      openGraph: {
        title: `${creatorDrop.metadata.title} | BaseDare`,
        description: creatorDrop.metadata.hook,
        type: 'website',
      },
    };
  }
  const title = `${drop.title} — ${drop.tagline}`;
  const description = `${drop.capacity} spots · ${drop.details} Claim yours.`;
  return {
    title,
    description,
    openGraph: { title, description, type: 'website' },
  };
}

const EMPTY_ROSTER = (capacity: number, unlockAt: number): RosterView => ({
  joined: 0,
  capacity,
  spotsLeft: capacity,
  waitlist: 0,
  unlocked: false,
  toUnlock: unlockAt,
  roster: [],
});

async function getCreatorDropLink(slug: string) {
  const link = await prisma.creatorAttributionLink.findUnique({
    where: { slug },
    select: {
      slug: true,
      creatorCode: true,
      contentCode: true,
      campaignCode: true,
      targetType: true,
      targetId: true,
      targetHref: true,
      active: true,
      metadataJson: true,
    },
  });
  if (!link || !link.active || link.targetHref !== `/drops/${slug}`) return null;
  const metadata = parseCreatorDropMetadata(link.metadataJson);
  if (!metadata) return null;

  try {
    return {
      ...link,
      targetType: normalizeTargetType(link.targetType),
      metadata,
    };
  } catch {
    return null;
  }
}

export default async function DropInvitePage({ params, searchParams }: DropPageProps) {
  const { slug } = await params;
  const drop = getDrop(slug);
  if (!drop) {
    const creatorDrop = await getCreatorDropLink(slug);
    if (!creatorDrop) notFound();
    return (
      <CreatorDropLanding
        creatorCode={creatorDrop.creatorCode}
        contentCode={creatorDrop.contentCode}
        campaignCode={creatorDrop.campaignCode}
        targetType={creatorDrop.targetType}
        targetId={creatorDrop.targetId}
        publicPath={`/go/${creatorDrop.slug}`}
        metadata={creatorDrop.metadata}
      />
    );
  }

  const sp = (await searchParams) || {};
  const src = typeof sp.src === 'string' ? sp.src : '';

  // Resilient: if the table isn't migrated yet, render with an empty roster.
  let roster: RosterView;
  try {
    roster = await getRosterView(slug);
  } catch {
    roster = EMPTY_ROSTER(drop.capacity, drop.unlockAt);
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <LiquidBackground />
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="relative z-20 mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-16 sm:py-20">
        <div className="text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-2 text-[11px] font-black uppercase tracking-[0.24em] text-cyan-100">
            <Sparkles className="h-4 w-4" />
            {drop.venue} · {drop.whenLabel}
          </div>
          <h1 className="mt-5 text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl">
            {drop.title}
          </h1>
          <p className="mt-4 text-lg font-bold leading-7 text-white/80">{drop.tagline}</p>
          <p className="mt-2 text-sm font-semibold leading-6 text-white/55">
            {drop.capacity} spots · {drop.details}
          </p>
        </div>

        <JoinDropForm slug={slug} drop={drop} initialRoster={roster} src={src} />

        <p className="text-center text-[11px] font-semibold leading-5 text-white/35">
          No wallet, no crypto. Just claim your spot. Proof happens at the venue.
        </p>
      </div>
    </main>
  );
}
