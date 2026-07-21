import { NextRequest, NextResponse } from 'next/server';

import {
  clearAttributionCookies,
  forgetSavedMissions,
  listSavedMissions,
} from '@/lib/creator-attribution-server';

export async function GET(request: NextRequest) {
  try {
    const missions = await listSavedMissions(request);
    return NextResponse.json(
      { success: true, data: { missions } },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  } catch (error: unknown) {
    console.error('[MISSION_PASS] Mission list failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Unable to load saved missions.' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const result = await forgetSavedMissions(request);
    const response = NextResponse.json(
      { success: true, data: result },
      { headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
    clearAttributionCookies(response);
    return response;
  } catch (error: unknown) {
    console.error('[MISSION_PASS] Forget failed:', error instanceof Error ? error.message : error);
    return NextResponse.json(
      { success: false, error: 'Unable to forget saved missions.' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store, max-age=0' } },
    );
  }
}
