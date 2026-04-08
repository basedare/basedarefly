import 'server-only';

import { prisma } from '@/lib/prisma';
import { DEFAULT_SENTINEL_PAUSED_REASON } from '@/lib/sentinel';

const APP_SETTINGS_ID = 'singleton';
const DEFAULT_SENTINEL_PENDING_ALERT_THRESHOLD = 5;

export async function getAppSettings() {
  return prisma.appSettings.upsert({
    where: { id: APP_SETTINGS_ID },
    update: {},
    create: {
      id: APP_SETTINGS_ID,
      sentinelEnabled: true,
      sentinelPendingAlertThreshold: DEFAULT_SENTINEL_PENDING_ALERT_THRESHOLD,
    },
  });
}

export async function getPublicAppSettings() {
  const settings = await getAppSettings();

  return {
    sentinelEnabled: settings.sentinelEnabled,
    sentinelPausedReason: settings.sentinelPausedReason,
  };
}

export async function updateAppSettings(input: {
  sentinelEnabled?: boolean;
  sentinelPausedReason?: string | null;
  sentinelPendingAlertThreshold?: number;
}) {
  const current = await getAppSettings();
  const nextSentinelEnabled = input.sentinelEnabled ?? current.sentinelEnabled;
  const nextPausedReason =
    nextSentinelEnabled
      ? null
      : input.sentinelPausedReason?.trim() || current.sentinelPausedReason || DEFAULT_SENTINEL_PAUSED_REASON;
  const nextSentinelPendingAlertThreshold = Math.max(
    1,
    Math.round(input.sentinelPendingAlertThreshold ?? current.sentinelPendingAlertThreshold)
  );

  return prisma.appSettings.update({
    where: { id: current.id },
    data: {
      sentinelEnabled: nextSentinelEnabled,
      sentinelPausedReason: nextPausedReason,
      sentinelPendingAlertThreshold: nextSentinelPendingAlertThreshold,
    },
  });
}
