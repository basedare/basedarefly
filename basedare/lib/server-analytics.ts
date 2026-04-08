import 'server-only';

type AnalyticsPayloadValue = string | number | boolean | null | undefined;
type AnalyticsPayload = Record<string, AnalyticsPayloadValue>;

export function trackServerEvent(event: string, payload: AnalyticsPayload = {}) {
  console.info(`[analytics] ${event}`, payload);
}
