import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { getAppSettings, updateAppSettings } from '@/lib/app-settings';
import { trackServerEvent } from '@/lib/server-analytics';
import { formatSentinelPausedMessage } from '@/lib/sentinel';
import { alertSentinelHardPauseToggled } from '@/lib/telegram';

const ADMIN_SECRET = process.env.ADMIN_SECRET;
const MODERATOR_WALLETS = (process.env.MODERATOR_WALLETS || '')
  .split(',')
  .map((wallet) => wallet.trim().toLowerCase())
  .filter(Boolean);

function isAuthorized(request: NextRequest) {
  const authHeader = request.headers.get('x-admin-secret');
  if (authHeader && ADMIN_SECRET && ADMIN_SECRET.length >= 32) {
    if (authHeader.length === ADMIN_SECRET.length) {
      let result = 0;
      for (let index = 0; index < authHeader.length; index += 1) {
        result |= authHeader.charCodeAt(index) ^ ADMIN_SECRET.charCodeAt(index);
      }
      if (result === 0) {
        return true;
      }
    }
  }

  const walletHeader = request.headers.get('x-moderator-wallet');
  return Boolean(walletHeader && isAddress(walletHeader) && MODERATOR_WALLETS.includes(walletHeader.toLowerCase()));
}

const UpdateSettingsSchema = z.object({
  sentinelEnabled: z.boolean(),
  sentinelPausedReason: z.string().max(160).optional().nullable(),
  sentinelPendingAlertThreshold: z.number().int().min(1).max(100).optional(),
});

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_SETTINGS] Fetch failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_SETTINGS] Update failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
