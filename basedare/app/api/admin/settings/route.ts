import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getAppSettings, updateAppSettings } from '@/lib/app-settings';
import { trackServerEvent } from '@/lib/server-analytics';
import { formatSentinelPausedMessage } from '@/lib/sentinel';
import { alertSentinelHardPauseToggled } from '@/lib/telegram';
import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';

const UpdateSettingsSchema = z.object({
  sentinelEnabled: z.boolean(),
  sentinelPausedReason: z.string().max(160).optional().nullable(),
  sentinelPendingAlertThreshold: z.number().int().min(1).max(100).optional(),
  venueLeadAlertThreshold: z.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const settings = await getAppSettings();
    return NextResponse.json({
      success: true,
      data: {
        sentinelEnabled: settings.sentinelEnabled,
        sentinelPausedReason: settings.sentinelPausedReason,
        sentinelPendingAlertThreshold: settings.sentinelPendingAlertThreshold,
        lastSentinelQueueAlertSent: settings.lastSentinelQueueAlertSent,
        venueLeadAlertThreshold: settings.venueLeadAlertThreshold,
        lastVenueLeadAlertSent: settings.lastVenueLeadAlertSent,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_SETTINGS] Fetch failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const body = await request.json();
    const parsed = UpdateSettingsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid request' },
        { status: 400 }
      );
    }

    const previousSettings = await getAppSettings();
    const settings = await updateAppSettings(parsed.data);

    if (previousSettings.sentinelEnabled !== settings.sentinelEnabled) {
      const pendingCount = await prisma.dare.count({
        where: {
          requireSentinel: true,
          sentinelVerified: false,
          manualReviewNeeded: true,
          status: 'PENDING_REVIEW',
        },
      });

      const eventName = settings.sentinelEnabled
        ? 'sentinel_hard_pause_deactivated'
        : 'sentinel_hard_pause_activated';
      const formattedReason = settings.sentinelEnabled
        ? null
        : formatSentinelPausedMessage(settings.sentinelPausedReason);

      trackServerEvent(eventName, {
        reason: formattedReason,
        pendingCount,
        threshold: settings.sentinelPendingAlertThreshold,
        source: 'admin_settings',
      });

      await alertSentinelHardPauseToggled({
        enabled: settings.sentinelEnabled,
        reason: formattedReason,
        pendingCount,
        threshold: settings.sentinelPendingAlertThreshold,
      }).catch((telegramError) => {
        console.error('[ADMIN_SETTINGS] Failed to send Sentinel pause alert:', telegramError);
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        sentinelEnabled: settings.sentinelEnabled,
        sentinelPausedReason: settings.sentinelPausedReason,
        sentinelPendingAlertThreshold: settings.sentinelPendingAlertThreshold,
        lastSentinelQueueAlertSent: settings.lastSentinelQueueAlertSent,
        venueLeadAlertThreshold: settings.venueLeadAlertThreshold,
        lastVenueLeadAlertSent: settings.lastVenueLeadAlertSent,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_SETTINGS] Update failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
