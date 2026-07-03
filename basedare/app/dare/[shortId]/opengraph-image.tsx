import { prisma } from '@/lib/prisma';
import { OG_ALT, OG_CONTENT_TYPE, OG_SIZE, renderProofCard } from '@/lib/og-proof-card';

export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;
export const alt = OG_ALT;
export const runtime = 'nodejs';

function formatAmount(value: number | null | undefined): string {
  if (!value || !Number.isFinite(value)) return '0';
  return Math.round(value).toLocaleString('en-US');
}

// Online-surface share card: a dare unfurls as "dare @X to do Y for $Z" so the
// post itself recruits funders + provers.
export default async function Image({ params }: { params: Promise<{ shortId: string }> }) {
  const { shortId } = await params;

  const dare = await prisma.dare.findFirst({
    where: { OR: [{ shortId }, { id: shortId }] },
    select: {
      title: true,
      bounty: true,
      streamerHandle: true,
      status: true,
      locationLabel: true,
      venue: { select: { name: true } },
    },
  });

  if (!dare) {
    return renderProofCard({
      eyebrow: 'VERIFIED HUMAN ACTION',
      title: 'BaseDare',
      stats: [
        { value: '#HumanOnly', label: 'unfakeable' },
        { value: 'Base', label: 'onchain proof' },
        { value: '0', label: 'middlemen' },
      ],
      badge: 'LIVE',
      badgeTone: 'gold',
    });
  }

  const status = (dare.status || '').toUpperCase();
  const verified = ['VERIFIED', 'PAID', 'COMPLETED'].includes(status);
  const target = dare.streamerHandle ? `@${dare.streamerHandle.replace(/^@/, '')}` : null;
  const amount = formatAmount(dare.bounty);
  const venueName = dare.venue?.name ?? dare.locationLabel ?? null;

  return renderProofCard({
    venueStamp: venueName ? { name: venueName } : null,
    eyebrow: verified ? 'VERIFIED DARE' : target ? 'OPEN DARE' : 'OPEN BOUNTY',
    title: dare.title,
    location: target ? `Target: ${target}` : 'Open to anyone',
    stats: verified
      ? [
          { value: amount, label: 'USDC paid out' },
          { value: '#HumanOnly', label: 'verified' },
        ]
      : [
          { value: amount, label: 'USDC bounty' },
          { value: '#HumanOnly', label: 'unfakeable' },
        ],
    badge: verified ? 'VERIFIED' : 'LIVE',
    badgeTone: verified ? 'emerald' : 'gold',
    footerNote: verified ? 'Receipt by BaseDare' : 'Fund it · prove it · get paid',
  });
}
