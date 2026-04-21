export type VenueReportAudience = 'venue' | 'sponsor';
export type VenueReportEventType =
  | 'OPEN'
  | 'SHARE'
  | 'COPY_BRIEF'
  | 'COPY_LINK'
  | 'EMAIL_BRIEF'
  | 'CLAIM_STARTED'
  | 'ACTIVATION_LAUNCHED'
  | 'REPEAT_LAUNCHED';

const SESSION_PREFIX = 'basedare:venue-report-session';

export function getVenueReportSessionKey(venueSlug: string, audience: VenueReportAudience) {
  if (typeof window === 'undefined') return null;
  const storageKey = `${SESSION_PREFIX}:${venueSlug}:${audience}`;
  const existing = window.localStorage.getItem(storageKey);
  if (existing) return existing;

  const generated =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  window.localStorage.setItem(storageKey, generated);
  return generated;
}

export function buildTrackedVenueReportHref(input: {
  href: string;
  venueSlug: string;
  audience: VenueReportAudience;
}) {
  if (typeof window === 'undefined') return input.href;
  const sessionKey = getVenueReportSessionKey(input.venueSlug, input.audience);
  const url = new URL(input.href, window.location.origin);
  url.searchParams.set('source', 'venue-report');
  url.searchParams.set('reportSource', 'venue-report');
  url.searchParams.set('reportAudience', input.audience);
  if (sessionKey) {
    url.searchParams.set('reportSessionKey', sessionKey);
  }

  if (url.origin === window.location.origin) {
    return `${url.pathname}${url.search}${url.hash}`;
  }

  return url.toString();
}

export async function trackVenueReportEvent(input: {
  venueSlug: string;
  audience: VenueReportAudience;
  eventType: VenueReportEventType;
  channel?: string | null;
}) {
  if (typeof window === 'undefined') return;
  const sessionKey = getVenueReportSessionKey(input.venueSlug, input.audience);
  try {
    await fetch(`/api/venues/${encodeURIComponent(input.venueSlug)}/report`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify({
        type: 'event',
        audience: input.audience,
        eventType: input.eventType,
        sessionKey,
        channel: input.channel ?? null,
      }),
    });
  } catch {
    // Do not block the user on analytics.
  }
}
