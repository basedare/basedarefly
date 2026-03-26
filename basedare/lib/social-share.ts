type DareShareInput = {
  title: string;
  bounty?: number | string | null;
  streamerTag?: string | null;
  shortId?: string | null;
  placeName?: string | null;
  inviteUrl?: string | null;
  verified?: boolean;
  amountWon?: number | string | null;
  status?: 'live' | 'invite' | 'verified';
};

function normalizeHandle(handle?: string | null) {
  if (!handle) return null;
  return handle.startsWith('@') ? handle : `@${handle}`;
}

function formatAmount(amount?: number | string | null) {
  if (amount === null || amount === undefined || amount === '') return null;
  const numeric = typeof amount === 'number' ? amount : Number(amount);
  if (!Number.isFinite(numeric)) return null;
  return `$${numeric.toLocaleString()} USDC`;
}

export function getBaseDareUrl(path?: string | null) {
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';

  if (!path) {
    return origin;
  }

  return `${origin}${path.startsWith('/') ? path : `/${path}`}`;
}

export function buildXSharePayload(input: DareShareInput) {
  const bounty = formatAmount(input.bounty);
  const amountWon = formatAmount(input.amountWon);
  const handle = normalizeHandle(input.streamerTag);
  const placeLine = input.placeName ? ` at ${input.placeName}` : '';
  const shareUrl =
    input.inviteUrl ||
    getBaseDareUrl(input.shortId ? `/dare/${input.shortId}` : undefined);

  if (input.status === 'invite') {
    const headline = `${handle || 'A creator'} has a live BaseDare waiting to be claimed.`;
    const context = [bounty, input.title ? `"${input.title}"` : null].filter(Boolean).join(' · ');
    const text = [headline, context, shareUrl].filter(Boolean).join('\n\n');

    return {
      text,
      shareUrl,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    };
  }

  if (input.status === 'verified') {
    const headline = `${amountWon || bounty || 'This dare'} just cleared on BaseDare${placeLine}.`;
    const context = [input.title ? `"${input.title}"` : null, handle ? `Target ${handle}` : null, 'Verified on the grid.'].filter(Boolean).join('\n');
    const text = [headline, context, shareUrl].filter(Boolean).join('\n\n');

    return {
      text,
      shareUrl,
      url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
    };
  }

  const headline = `${bounty || 'Live'} challenge on BaseDare${placeLine}.`;
  const context = [input.title ? `"${input.title}"` : null, handle ? `Target ${handle}` : 'Open on the grid'].filter(Boolean).join('\n');
  const cta = 'Pile onto the dare or run it back on the map.';
  const text = [headline, context, cta, shareUrl].filter(Boolean).join('\n\n');

  return {
    text,
    shareUrl,
    url: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
  };
}
