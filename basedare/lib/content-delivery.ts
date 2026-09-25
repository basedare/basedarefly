// Shared, versioned description. Server creation additionally requires the
// operator's reviewed-terms release gate; a client cannot approve terms.
export const CONTENT_RIGHTS_VERSION = 'content-organic-v1';

export type ContentDeliveryBrief = {
  termsVersion: typeof CONTENT_RIGHTS_VERSION;
  buyerName: string;
  assetType: 'PHOTO' | 'VIDEO';
  format: string;
  acceptanceCriteria: string;
  posting: 'NONE' | 'PUBLIC_POST';
  postingInstructions: string;
  deadline: string;
  revisionLimit: number;
};

export const CONTENT_USAGE_TERMS = 'You keep ownership. BaseDare may store and display your submission for review and its mission receipt. After approval and payment, you grant the named buyer and BaseDare a non-exclusive, worldwide licence for 12 months to display the accepted asset on their own websites and organic social accounts, with cropping, captions and resizing. Paid advertising, sublicensing, resale and AI training are excluded. No positive review, audience size, reach or sales result is promised. You must have permission for people, music and other material included in your asset. Public posting is required only when the brief explicitly says so.';

export function readContentDelivery(value: unknown): ContentDeliveryBrief | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const brief = (value as { contentDelivery?: Partial<ContentDeliveryBrief> }).contentDelivery;
  if (!brief || brief.termsVersion !== CONTENT_RIGHTS_VERSION
    || typeof brief.buyerName !== 'string' || brief.buyerName.trim().length < 2 || brief.buyerName.length > 160
    || !['PHOTO', 'VIDEO'].includes(brief.assetType ?? '')
    || typeof brief.format !== 'string' || brief.format.trim().length < 3 || brief.format.length > 240
    || typeof brief.acceptanceCriteria !== 'string' || brief.acceptanceCriteria.trim().length < 10 || brief.acceptanceCriteria.length > 1000
    || !['NONE', 'PUBLIC_POST'].includes(brief.posting ?? '')
    || typeof brief.postingInstructions !== 'string' || brief.postingInstructions.length > 500
    || (brief.posting === 'PUBLIC_POST' && brief.postingInstructions.trim().length < 10)
    || typeof brief.deadline !== 'string' || !Number.isFinite(Date.parse(brief.deadline))
    || !Number.isInteger(brief.revisionLimit) || brief.revisionLimit! < 0 || brief.revisionLimit! > 0) return null;
  return brief as ContentDeliveryBrief;
}

export function contentDeliverySummary(brief: ContentDeliveryBrief): string[] {
  return [
    `Deliver one ${brief.assetType.toLowerCase()}: ${brief.format}`,
    `Acceptance: ${brief.acceptanceCriteria}`,
    brief.posting === 'NONE' ? 'No posting on your own account required.' : `Publish and supply the public post URL. ${brief.postingInstructions}`,
    `Submit by ${brief.deadline}. Up to ${brief.revisionLimit} revision round(s), limited to the agreed brief.`,
    `Buyer: ${brief.buyerName}. ${CONTENT_USAGE_TERMS}`,
  ];
}

export function validPublicationUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  try {
    const url = new URL(value);
    const domains = ['instagram.com', 'tiktok.com', 'youtube.com', 'youtu.be', 'facebook.com', 'x.com'];
    if (url.protocol !== 'https:' || url.username || url.password || url.port
      || !domains.some((domain) => url.hostname === domain || url.hostname.endsWith(`.${domain}`))
      || url.pathname === '/') return null;
    return url.toString();
  } catch { return null; }
}
