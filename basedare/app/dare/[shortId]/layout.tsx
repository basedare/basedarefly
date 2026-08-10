import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import { getActionSportsCommunitySparkByStreamId } from '@/lib/action-sports-community-sparks';

export async function generateMetadata(
  { params }: { params: Promise<{ shortId: string }> }
): Promise<Metadata> {
  const { shortId } = await params;

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

export default function DareLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
