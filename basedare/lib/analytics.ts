'use client';

type AnalyticsPayloadValue = string | number | boolean | null | undefined;

export type AnalyticsPayload = Record<string, AnalyticsPayloadValue>;

declare global {
  interface Window {
    posthog?: {
      capture: (event: string, properties?: Record<string, unknown>) => void;
    };
  }
}

export function trackClientEvent(event: string, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') {
    return;
  }

  if (window.posthog?.capture) {
    window.posthog.capture(event, payload);
    return;
  }

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[analytics] ${event}`, payload);
  }
}
