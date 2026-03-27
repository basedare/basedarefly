type IdentityTagShape = {
  tag: string;
  status?: string | null;
  verificationMethod?: string | null;
  identityPlatform?: string | null;
  identityHandle?: string | null;
  identityVerificationCode?: string | null;
  twitterHandle?: string | null;
  twitchHandle?: string | null;
  youtubeHandle?: string | null;
  kickHandle?: string | null;
  kickVerificationCode?: string | null;
  verifiedAt?: Date | string | null;
  updatedAt?: Date | string | null;
  createdAt?: Date | string | null;
};

export function deriveIdentityPlatform(tag: IdentityTagShape): string | null {
  if (tag.identityPlatform) return tag.identityPlatform;

  const method = tag.verificationMethod?.toLowerCase() ?? null;

  if (method === 'twitter' || method === 'x') return 'twitter';
  if (method === 'twitch') return 'twitch';
  if (method === 'youtube' || method === 'google') return 'youtube';
  if (method === 'instagram' || method === 'tiktok' || method === 'other' || method === 'kick') {
    return method;
  }

  if (tag.twitterHandle) return 'twitter';
  if (tag.twitchHandle) return 'twitch';
  if (tag.youtubeHandle) return 'youtube';
  if (tag.kickHandle) return 'other';
  return null;
}

export function deriveIdentityHandle(tag: IdentityTagShape): string | null {
  if (tag.identityHandle) return tag.identityHandle;
  return tag.twitterHandle || tag.twitchHandle || tag.youtubeHandle || tag.kickHandle || null;
}

export function deriveIdentityVerificationCode(tag: IdentityTagShape): string | null {
  if (tag.identityVerificationCode) return tag.identityVerificationCode;
  return tag.kickVerificationCode || null;
}

function toTimestamp(value?: Date | string | null) {
  if (!value) return 0;
  if (value instanceof Date) return value.getTime();
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? 0 : parsed.getTime();
}

function getStatusWeight(status?: string | null) {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
    case 'VERIFIED':
      return 400;
    case 'PENDING':
      return 300;
    case 'REJECTED':
    case 'REVOKED':
    case 'SUSPENDED':
      return 100;
    default:
      return 0;
  }
}

function getPrimaryScore(tag: IdentityTagShape) {
  const identityHandle = deriveIdentityHandle(tag)?.replace(/^@/, '').toLowerCase() ?? null;
  const normalizedTag = tag.tag.replace(/^@/, '').toLowerCase();
  const statusWeight = getStatusWeight(tag.status);
  const handleAligned = identityHandle && identityHandle === normalizedTag ? 20 : 0;
  const hasIdentity = identityHandle ? 10 : 0;

  return (
    statusWeight +
    handleAligned +
    hasIdentity +
    toTimestamp(tag.verifiedAt) / 1_000_000_000_000 +
    toTimestamp(tag.updatedAt) / 1_000_000_000_000_000 +
    toTimestamp(tag.createdAt) / 1_000_000_000_000_000_000
  );
}

export function selectPrimaryTag<T extends IdentityTagShape>(tags: T[]): T | null {
  if (!tags.length) return null;

  const sorted = [...tags].sort((left, right) => getPrimaryScore(right) - getPrimaryScore(left));
  return sorted[0] ?? null;
}

export function annotatePrimaryTags<T extends IdentityTagShape>(tags: T[]) {
  const primary = selectPrimaryTag(tags);
  return tags.map((tag) => ({
    ...tag,
    identityPlatform: deriveIdentityPlatform(tag),
    identityHandle: deriveIdentityHandle(tag),
    identityVerificationCode: deriveIdentityVerificationCode(tag),
    isPrimary: primary ? primary.tag === tag.tag : false,
  }));
}
