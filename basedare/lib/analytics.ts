'use client';

import posthog from 'posthog-js';

type AnalyticsPayloadValue = string | number | boolean | null | undefined;

export type AnalyticsPayload = Record<string, AnalyticsPayloadValue>;

export function trackClientEvent(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  // PostHog is only initialized when NEXT_PUBLIC_POSTHOG_KEY is set
  // (see components/PostHogProvider.tsx). Until then this safely no-ops.
  if (posthog.__loaded) {
    posthog.capture(event, payload);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[analytics] ${event}`, payload);
  }
}
