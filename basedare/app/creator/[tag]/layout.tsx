import type { Metadata } from 'next';
import { prisma } from '@/lib/prisma';
import {
  buildCreatorHandleVariants,
  normalizeCreatorHandle,
  toDisplayCreatorHandle,
} from '@/lib/creator-stats';

export async function generateMetadata(
  { params }: { params: Promise<{ tag: string }> }
): Promise<Metadata> {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const variants = buildCreatorHandleVariants(decoded);

  const creator = variants.length
    ? await prisma.streamerTag.findFirst({
        where: { OR: variants.map((value) => ({ tag: { equals: value, mode: 'insensitive' as const } })) },
        select: { tag: true, completedDares: true },
      })
    : null;

  const display = toDisplayCreatorHandle(creator?.tag || decoded) || 'BaseDare creator';
  const normalized = normalizeCreatorHandle(creator?.tag || decoded);
  const canonical = `/creator/${encodeURIComponent(normalized ?? decoded.replace(/^@/, ''))}`;
  const proofs = creator?.completedDares ?? 0;

  const title =
    creator && proofs > 0
      ? `${display} — ${proofs} verified proof${proofs === 1 ? '' : 's'} | BaseDare`
      : `${display} | BaseDare`;
  const description =
    creator && proofs > 0
      ? `${display} has ${proofs} verified proof${proofs === 1 ? '' : 's'} on BaseDare — #HumanOnly, unfakeable. See the proof record.`
      : `${display} on BaseDare — verified human action. Proof, not promises.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `https://www.basedare.xyz${canonical}`,
      siteName: 'BaseDare',
      type: 'profile',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
    alternates: {
      canonical,
    },
  };
}

export default function CreatorLayout({ children }: { children: React.ReactNode }) {
  return children;
}
