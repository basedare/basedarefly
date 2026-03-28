import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';

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
  const title = `${dare.title} — ${dare.bounty} USDC | BaseDare`;
  const description = venueName
    ? `${dare.title} is live for ${dare.bounty} USDC at ${venueName}. Track proof, status, and funding on BaseDare.`
    : `${dare.title} is live for ${dare.bounty} USDC on BaseDare. Track proof, status, and funding in real time.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://basedare.xyz/dare/${displayId}`,
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
