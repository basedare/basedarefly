export const VENUE_CONTACT_CHANNELS = [
  'WHATSAPP',
  'INSTAGRAM',
  'MESSENGER',
  'PHONE',
  'EMAIL',
  'RESERVATION',
  'WEBSITE',
] as const;

export type VenueContactChannel = (typeof VENUE_CONTACT_CHANNELS)[number];

export type VenueContactRouteSummary = {
  id: string;
  channel: VenueContactChannel;
  label: string;
  purpose: string | null;
  url: string;
  responseHours: string | null;
  source: string;
  lastConfirmedAt: string;
};

export type VenueContactRouteInput = {
  channel: VenueContactChannel;
  label: string;
  purpose?: string | null;
  url: string;
  responseHours?: string | null;
  isPersonal?: boolean;
  consentConfirmed?: boolean;
};

const ALLOWED_HOSTS: Partial<Record<VenueContactChannel, Set<string>>> = {
  INSTAGRAM: new Set(['instagram.com', 'www.instagram.com']),
  WHATSAPP: new Set(['wa.me', 'api.whatsapp.com', 'www.whatsapp.com']),
  MESSENGER: new Set(['m.me', 'www.messenger.com', 'messenger.com']),
};

function compact(value: string | null | undefined, maxLength: number) {
  const normalized = value?.trim().replace(/\s+/g, ' ') ?? '';
  return normalized ? normalized.slice(0, maxLength) : null;
}

export function normalizeVenueContactUrl(channel: VenueContactChannel, input: string): string | null {
  const value = input.trim();
  if (!value || value.length > 600) return null;

  if (channel === 'EMAIL') {
    const emailValue = value.replace(/^mailto:/i, '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue)) return null;
    return `mailto:${emailValue.toLowerCase()}`;
  }

  if (channel === 'PHONE') {
    const phoneValue = value.replace(/^tel:/i, '').replace(/[\s().-]/g, '');
    if (!/^\+?[0-9]{7,15}$/.test(phoneValue)) return null;
    return `tel:${phoneValue}`;
  }

  let candidate = value;
  if (channel === 'INSTAGRAM' && /^@?[a-z0-9._]{1,30}$/i.test(value)) {
    candidate = `https://www.instagram.com/${value.replace(/^@/, '')}/`;
  }

  try {
    const url = new URL(candidate);
    if (url.protocol !== 'https:') return null;
    url.hash = '';

    const allowedHosts = ALLOWED_HOSTS[channel];
    if (allowedHosts && !allowedHosts.has(url.hostname.toLowerCase())) return null;

    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeVenueContactRoute(input: VenueContactRouteInput) {
  const label = compact(input.label, 48);
  const url = normalizeVenueContactUrl(input.channel, input.url);
  if (!label || !url) return null;

  if (input.isPersonal && !input.consentConfirmed) return null;

  return {
    channel: input.channel,
    label,
    purpose: compact(input.purpose, 120),
    url,
    responseHours: compact(input.responseHours, 80),
    isPersonal: Boolean(input.isPersonal),
    consentBasis: input.isPersonal
      ? 'PERSONAL_CONTACT_EXPLICIT_CONSENT'
      : 'VENUE_AUTHORIZED_BUSINESS_CONTACT',
  };
}

export function formatVenueContactConfirmedAt(value: Date | string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return 'Recently confirmed';

  return `Confirmed ${date.toLocaleDateString('en', { month: 'short', year: 'numeric' })}`;
}

export function formatVenueContactSource(source: string) {
  switch (source) {
    case 'PUBLIC_OFFICIAL_PROFILE':
      return 'Public official profile';
    case 'VENUE_OWNER_SUBMISSION':
      return 'Confirmed by venue';
    case 'BASEDARE_ADMIN_REVIEW':
      return 'Reviewed by BaseDare';
    default:
      return 'Verified source';
  }
}
