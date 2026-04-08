import 'server-only';

import { getAppSettings } from '@/lib/app-settings';
import { prisma } from '@/lib/prisma';
import { trackServerEvent } from '@/lib/server-analytics';
import { alertSentinelQueueThreshold } from '@/lib/telegram';

const SENTINEL_QUEUE_ALERT_COOLDOWN_MS = 45 * 60 * 1000;

export async function checkAndSendSentinelQueueAlert() {
  const settings = await getAppSettings();
  const pendingCount = await prisma.dare.count({
    where: {
      requireSentinel: true,
      sentinelVerified: false,
      manualReviewNeeded: true,
      status: 'PENDING_REVIEW',
    },
  });

  if (pendingCount < settings.sentinelPendingAlertThreshold) {
    return { alerted: false, pendingCount, threshold: settings.sentinelPendingAlertThreshold, reason: 'BELOW_THRESHOLD' as const };
  }

  const now = new Date();
  const lastAlert = settings.lastSentinelQueueAlertSent;
  if (lastAlert && now.getTime() - lastAlert.getTime() < SENTINEL_QUEUE_ALERT_COOLDOWN_MS) {
    return { alerted: false, pendingCount, threshold: settings.sentinelPendingAlertThreshold, reason: 'COOLDOWN' as const };
  }

  const sent = await alertSentinelQueueThreshold({
    pendingCount,
    threshold: settings.sentinelPendingAlertThreshold,
  });

  if (!sent) {
    return { alerted: false, pendingCount, threshold: settings.sentinelPendingAlertThreshold, reason: 'SEND_FAILED' as const };
  }

  await prisma.appSettings.update({
    where: { id: settings.id },
    data: { lastSentinelQueueAlertSent: now },
  });

  trackServerEvent('sentinel_queue_alert_sent', {
    pendingCount,
    threshold: settings.sentinelPendingAlertThreshold,
    source: 'verify_proof',
  });

  return { alerted: true, pendingCount, threshold: settings.sentinelPendingAlertThreshold, reason: 'ALERT_SENT' as const };
}
