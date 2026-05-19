import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import {
  isMissingBaseCashTableError,
  listBaseCashAdminSettlements,
  listBaseCashRecentCredits,
  mapBaseCashCredit,
} from '@/lib/basecash';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  try {
    const [settlements, recentCredits] = await Promise.all([
      listBaseCashAdminSettlements(),
      listBaseCashRecentCredits({ limit: 48 }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        settlements,
        recentCredits: recentCredits.map(mapBaseCashCredit),
      },
    });
  } catch (error) {
    if (isMissingBaseCashTableError(error)) {
      return NextResponse.json({
        success: true,
        data: {
          settlements: [],
          recentCredits: [],
          setupRequired: true,
        },
      });
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_BASECASH] Load failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load BaseCash settlements' }, { status: 500 });
  }
}
