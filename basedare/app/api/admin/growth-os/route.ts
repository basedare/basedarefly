import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { buildGrowthOsAdminReport } from '@/lib/growth-os';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    return NextResponse.json(
      { success: true, data: await buildGrowthOsAdminReport() },
      { headers: { 'Cache-Control': 'private, no-store' } }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[GROWTH_OS] Build failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to build Growth OS' },
      { status: 500, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}
