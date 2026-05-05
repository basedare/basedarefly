'use client';

type PublicActivationFunnelEvent =
  | 'ACTIVATION_PAGE_VIEW'
  | 'ACTIVATION_CTA_CLICK'
  | 'ACTIVATION_SPARK_AUDIT_USED'
  | 'ACTIVATION_FORM_START'
  | 'ACTIVATION_FORM_SUBMIT'
  | 'ACTIVATION_CLOSE_ROOM_OPEN'
  | 'ACTIVATION_CLOSE_ROOM_PAYMENT_CLICK'
  | 'ACTIVATION_CLOSE_ROOM_REPLY_CLICK';

type ActivationFunnelPayloadValue = string | number | boolean | null | undefined;

const SESSION_STORAGE_KEY = 'basedare:activation-funnel-session';

function clean(value: string | null | undefined) {
  return value?.trim() || null;
}

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getActivationFunnelSessionKey() {
  if (typeof window === 'undefined') return null;

  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const generated = randomId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return randomId();
  }
}

export function getActivationFunnelAttribution(extra: Record<string, string | null | undefined> = {}) {
  if (typeof window === 'undefined') return extra;

  const params = new URLSearchParams(window.location.search);
  const creator = clean(params.get('creator')) || clean(params.get('streamer')) || extra.creator || null;

  return {
    source: clean(params.get('source')) || clean(params.get('reportSource')) || extra.source || 'activations',
    routedSource: clean(params.get('source')) || clean(params.get('reportSource')) || extra.routedSource || null,
    venueSlug: clean(params.get('venueSlug')) || clean(params.get('venue')) || extra.venueSlug || null,
    venueId: clean(params.get('venueId')) || extra.venueId || null,
    venueName: clean(params.get('venueName')) || clean(params.get('venue')) || extra.venueName || null,
    creator,
    packageId: clean(params.get('packageId')) || extra.packageId || null,
    budgetRange: clean(params.get('budgetRange')) || extra.budgetRange || null,
    goal: clean(params.get('goal')) || extra.goal || null,
    buyerType: clean(params.get('buyerType')) || extra.buyerType || null,
    utmSource: clean(params.get('utm_source')) || extra.utmSource || null,
    utmMedium: clean(params.get('utm_medium')) || extra.utmMedium || null,
    utmCampaign: clean(params.get('utm_campaign')) || extra.utmCampaign || null,
    utmContent: clean(params.get('utm_content')) || extra.utmContent || null,
    utmTerm: clean(params.get('utm_term')) || extra.utmTerm || null,
    referrer: document.referrer || extra.referrer || null,
  };
}

export async function trackActivationFunnelEvent(input: {
  eventType: PublicActivationFunnelEvent;
  target?: string | null;
  channel?: string | null;
  attribution?: Record<string, string | null | undefined>;
  metadata?: Record<string, ActivationFunnelPayloadValue>;
}) {
  if (typeof window === 'undefined') return;

  const sessionKey = getActivationFunnelSessionKey();
  const eventId = `${input.eventType}:${Date.now()}:${Math.random().toString(36).slice(2, 8)}`;

  try {
    await fetch('/api/activation-funnel', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify({
        eventType: input.eventType,
        sessionKey,
        eventId,
        pagePath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
        target: input.target ?? null,
        channel: input.channel ?? null,
        attribution: getActivationFunnelAttribution(input.attribution),
        metadata: input.metadata ?? {},
      }),
    });
  } catch {
    // Revenue tracking should never block the buyer path.
  }
}
