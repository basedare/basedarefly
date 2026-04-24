import { NextRequest, NextResponse } from 'next/server';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { buildProductionSafetyReport } from '@/lib/production-safety';

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) {
    return unauthorizedAdminResponse(auth);
  }

  const report = await buildProductionSafetyReport();

  return NextResponse.json({
    success: true,
    data: report,
  });
}
