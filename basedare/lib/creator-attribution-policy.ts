export const JOURNEY_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const INTENT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
export const MISSION_PASS_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export const ATTRIBUTION_TARGET_TYPES = ['DARE', 'MEETUP', 'DROP', 'PAGE'] as const;
export type AttributionTargetType = (typeof ATTRIBUTION_TARGET_TYPES)[number];

const TARGET_TYPE_SET = new Set<string>(ATTRIBUTION_TARGET_TYPES);
const CODE_PATTERN = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?$/;

export function normalizeAttributionCode(value: string, field: string): string {
  const normalized = value.trim().toLowerCase().replace(/^@/, '');
  if (!CODE_PATTERN.test(normalized)) {
    throw new Error(`${field} must be 1-64 lowercase letters, numbers, dashes, or underscores.`);
  }
  return normalized;
}

export function normalizeTargetType(value: string): AttributionTargetType {
  const normalized = value.trim().toUpperCase();
  if (!TARGET_TYPE_SET.has(normalized)) {
    throw new Error('Unsupported attribution target type.');
  }
  return normalized as AttributionTargetType;
}

export function normalizeTargetId(value: string): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > 191 || /[\u0000-\u001f]/.test(normalized)) {
    throw new Error('Invalid attribution target.');
  }
  return normalized;
}

export function normalizeTargetHref(value: string): string {
  const normalized = value.trim();
  if (!normalized.startsWith('/') || normalized.startsWith('//') || normalized.length > 1024) {
    throw new Error('Mission links must use a local BaseDare path.');
  }

  const parsed = new URL(normalized, 'https://basedare.local');
  if (parsed.origin !== 'https://basedare.local' || parsed.pathname.startsWith('/api/')) {
    throw new Error('Mission links must use a public BaseDare path.');
  }

  return `${parsed.pathname}${parsed.search}${parsed.hash}`;
}

export function normalizeMissionTitle(value: string | null | undefined): string | null {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  return normalized ? normalized.slice(0, 160) : null;
}

export function normalizeEmail(value: string): string {
  const normalized = value.trim().toLowerCase();
  if (normalized.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error('Enter a valid email address.');
  }
  return normalized;
}

export function participantKeyForWallet(walletAddress: string): string {
  return `wallet:${walletAddress.trim().toLowerCase()}`;
}

export function participantKeyForEmailHmac(emailHmac: string): string {
  return `email:${emailHmac}`;
}

export function isUnexpired(expiresAt: Date, now = new Date()): boolean {
  return Number.isFinite(expiresAt.getTime()) && expiresAt.getTime() > now.getTime();
}

export function verifiedCompletionEventType(hasLockedCreatorTouch: boolean) {
  return hasLockedCreatorTouch ? 'PATH_VERIFIED_COMPLETION' as const : 'DIRECT_VERIFIED_COMPLETION' as const;
}

export function isPerformanceEligibleAttributionEvent(eventType: string): boolean {
  return eventType === 'PATH_VERIFIED_COMPLETION';
}
