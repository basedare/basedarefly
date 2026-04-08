import { NextResponse } from 'next/server';
import { getPublicAppSettings } from '@/lib/app-settings';

export async function GET() {
  try {
    const settings = await getPublicAppSettings();

    return NextResponse.json({
      success: true,
      data: settings,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SETTINGS] Public settings fetch failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to load app settings' },
      { status: 500 }
    );
  }
}
