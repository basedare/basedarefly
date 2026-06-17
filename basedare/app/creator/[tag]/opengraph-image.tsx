import { prisma } from '@/lib/prisma';
import { buildCreatorHandleVariants, toDisplayCreatorHandle } from '@/lib/creator-stats';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderProofCard } from '@/lib/og-proof-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OG_ALT;
export const runtime = 'nodejs';

function formatAmount(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}

// Online-surface share card: a creator profile unfurls as their proof record —
// reputation becomes shareable.
export default async function Image({ params }: { params: Promise<{ tag: string }> }) {
  const { tag } = await params;
  const decoded = decodeURIComponent(tag);
  const variants = buildCreatorHandleVariants(decoded);

  const creator = variants.length
    ? await prisma.streamerTag.findFirst({
        where: { OR: variants.map((value) => ({ tag: { equals: value, mode: 'insensitive' as const } })) },
        select: { tag: true, completedDares: true, totalEarned: true },
      })
    : null;

  const display = toDisplayCreatorHandle(creator?.tag || decoded) || 'BaseDare creator';
  const proofs = creator?.completedDares ?? 0;
  const earned = creator?.totalEarned ?? 0;

  // Fresh or unknown creators get the evergreen card (no zeros).
  if (!creator || proofs <= 0) {
    return renderProofCard({
      eyebrow: 'BASEDARE CREATOR',
      title: display,
      stats: [
        { value: '#HumanOnly', label: 'verified human' },
        { value: 'Base', label: 'onchain proof' },
      ],
      badge: 'CREATOR',
      badgeTone: 'gold',
      footerNote: 'Verified human action · BaseDare',
    });
  }

  const stats = [
    { value: String(proofs), label: proofs === 1 ? 'proof' : 'proofs' },
    ...(earned > 0 ? [{ value: formatAmount(earned), label: 'USDC earned' }] : []),
    { value: '#HumanOnly', label: 'verified' },
  ];

  return renderProofCard({
    eyebrow: 'VERIFIED CREATOR',
    title: display,
    stats,
    badge: 'VERIFIED',
    badgeTone: 'emerald',
    footerNote: 'Verified human action · BaseDare',
  });
}
