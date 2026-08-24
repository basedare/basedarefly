import type { Metadata } from 'next';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { getActionSportsCommunitySparkByStreamId } from '@/lib/action-sports-community-sparks';
import { getCreatorMissionByShortId } from '@/lib/creator-missions-server';

export async function generateMetadata(
  { params }: { params: Promise<{ shortId: string }> }
): Promise<Metadata> {
  const { shortId } = await params;
  const creatorMission = await getCreatorMissionByShortId(shortId);

  if (creatorMission?.isFunnelCandidate) {
    const displayId = creatorMission.shortId;
    const title = `${creatorMission.title} | BaseDare Paid Mission`;
    const description = `${creatorMission.typeLabel}. ${creatorMission.creatorPayout.toLocaleString('en-US', { maximumFractionDigits: 2 })} USDC when the work is approved.`;
    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: `https://www.basedare.xyz/earn/${displayId}`,
        siteName: 'BaseDare',
        type: 'article',
      },
      twitter: { card: 'summary_large_image', title, description },
      alternates: { canonical: `/earn/${displayId}` },
    };
  }

  const dare = await prisma.dare.findFirst({
    where: {
      OR: [{ shortId }, { id: shortId }],
    },
    select: {
      shortId: true,
      title: true,
      bounty: true,
      tag: true,
      streamId: true,
      streamerHandle: true,
      status: true,
      venue: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!dare) {
    return {
      title: 'BaseDare Challenge',
      description: 'View live BaseDare challenge details and proof status.',
    };
  }

  const displayId = dare.shortId ?? shortId;
  const venueName = dare.venue?.name;
  const communitySpark = dare.bounty <= 0 && dare.tag === 'community'
    ? getActionSportsCommunitySparkByStreamId(dare.streamId)
    : null;
  const displayTitle = communitySpark?.title ?? dare.title;
  const title = communitySpark
    ? `${displayTitle} · Free Spark | BaseDare`
    : `${displayTitle} — ${dare.bounty} USDC | BaseDare`;
  const description = communitySpark
    ? `${communitySpark.hook}${venueName ? ` Play it at ${venueName}.` : ''} Free to play on BaseDare.`
    : venueName
      ? `${displayTitle} is live for ${dare.bounty} USDC at ${venueName}. Track proof, status, and funding on BaseDare.`
      : `${displayTitle} is live for ${dare.bounty} USDC on BaseDare. Track proof, status, and funding in real time.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.basedare.xyz/dare/${displayId}`,
      siteName: 'BaseDare',
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical: `/dare/${displayId}`,
    },
  };
}

export default async function DareLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ shortId: string }>;
}) {
  const { shortId } = await params;
  const creatorMission = await getCreatorMissionByShortId(shortId);
  if (creatorMission?.isFunnelCandidate) {
    redirect(`/earn/${encodeURIComponent(creatorMission.shortId)}`);
  }
  return children;
}
