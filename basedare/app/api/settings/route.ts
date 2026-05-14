import { NextResponse } from 'next/server';
import { getPublicAppSettings } from '@/lib/app-settings';

const PUBLIC_SETTINGS_TIMEOUT_MS = 700;
const PUBLIC_SETTINGS_FALLBACK_COOLDOWN_MS = 30_000;
const PUBLIC_SETTINGS_FALLBACK = {
  sentinelEnabled: true,
  sentinelPausedReason: null,
};
let publicSettingsFallbackUntil = 0;

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  const timeout = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error('Public settings query timed out')), timeoutMs);
  });

  return Promise.race([promise, timeout]).finally(() => {
    if (timeoutId) clearTimeout(timeoutId);
  });
}

export async function GET() {
  if (Date.now() < publicSettingsFallbackUntil) {
    const response = NextResponse.json({
      success: true,
      data: PUBLIC_SETTINGS_FALLBACK,
      source: 'fallback',
      warning: 'Default public settings served while live settings recover.',
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }

  try {
    const settings = await withTimeout(getPublicAppSettings(), PUBLIC_SETTINGS_TIMEOUT_MS);

    return NextResponse.json({
      success: true,
      data: settings,
      source: 'database',
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SETTINGS] Falling back:', message);
    publicSettingsFallbackUntil = Date.now() + PUBLIC_SETTINGS_FALLBACK_COOLDOWN_MS;
    const response = NextResponse.json({
      success: true,
      data: PUBLIC_SETTINGS_FALLBACK,
      source: 'fallback',
      warning: 'Default public settings shown while live settings warm up.',
    });
    response.headers.set('Cache-Control', 'no-store, max-age=0');
    return response;
  }
}
