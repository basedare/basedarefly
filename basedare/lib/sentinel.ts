export type SentinelRecommendationReason =
  | 'none'
  | 'brand'
  | 'venue'
  | 'high_value'
  | 'manual';

export type SentinelAnalyticsSource = 'create_form' | 'verify_proof' | 'admin_review';

export const DEFAULT_SENTINEL_PAUSED_REASON =
  'Sentinel is temporarily paused while manual review catches up.';

export function getSentinelRecommendation(input: {
  amount?: number | null;
  missionTag?: string | null;
  venueId?: string | null;
}) {
  const normalizedMissionTag = input.missionTag?.trim().toLowerCase() ?? '';

  if (normalizedMissionTag === 'brand-campaign' || normalizedMissionTag.startsWith('brand')) {
    return { recommended: true, reason: 'brand' as const };
  }

  if (input.venueId) {
    return { recommended: true, reason: 'venue' as const };
  }

  if ((input.amount ?? 0) >= 200) {
    return { recommended: true, reason: 'high_value' as const };
  }

  return { recommended: false, reason: 'none' as const };
}

export function getSentinelReasonForSelection(input: {
  recommendedReason: SentinelRecommendationReason;
  selected: boolean;
}) {
  if (!input.selected) {
    return input.recommendedReason;
  }

  return input.recommendedReason === 'none' ? 'manual' : input.recommendedReason;
}

export function getSentinelAnalyticsSource(sourceContext: string): SentinelAnalyticsSource {
  const normalizedSource = sourceContext.trim().toUpperCase();

  if (normalizedSource === 'VERIFY_PROOF') {
    return 'verify_proof';
  }

  return normalizedSource.includes('ADMIN') || normalizedSource.includes('TELEGRAM')
    ? 'admin_review'
    : 'verify_proof';
}

export function formatSentinelPausedMessage(reason?: string | null) {
  const normalizedReason = reason?.trim();
  if (!normalizedReason) {
    return DEFAULT_SENTINEL_PAUSED_REASON;
  }

  if (normalizedReason.toLowerCase().startsWith('sentinel')) {
    return normalizedReason;
  }

  return `Sentinel is temporarily paused: ${normalizedReason}`;
}
