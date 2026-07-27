import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  isActionSportsCommunitySparkKey,
} from '@/lib/action-sports-community-sparks';
import {
  listActionSportsCommunitySparks,
  seedActionSportsCommunitySpark,
} from '@/lib/action-sports-community-sparks-server';

const SeedSchema = z.object({ key: z.string().min(1).max(64) });

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  return NextResponse.json(
    { success: true, data: await listActionSportsCommunitySparks() },
    { headers: { 'Cache-Control': 'no-store' } }
  );
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);
  try {
    const { key } = SeedSchema.parse(await request.json());
    if (!isActionSportsCommunitySparkKey(key)) {
      return NextResponse.json(
        { success: false, error: 'Unknown Community Spark preset.' },
        { status: 400 }
      );
    }
    const data = await seedActionSportsCommunitySpark(key, auth.walletAddress);
    return NextResponse.json(
      { success: true, data },
      { status: data.created ? 201 : 200, headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to seed Community Spark.';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
