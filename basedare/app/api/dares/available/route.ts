import { NextResponse } from 'next/server';
import { getCreatorMissions } from '@/lib/creator-missions-server';
import { getBaseCashPhpPerUsdc } from '@/lib/basecash-shared';
import { buildDareLoopPresentation } from '@/lib/dare-loop-presentation';

export const dynamic = 'force-dynamic';

/** Read-only public projection of the same eligible list shown by /earn. */
export async function GET() {
  const dares = await getCreatorMissions();
  const headers = { 'Cache-Control': 'no-store' };
  if (dares === null) {
    return NextResponse.json({ available: false }, { status: 503, headers });
  }
  return NextResponse.json({
    available: true,
    ...buildDareLoopPresentation(dares),
    phpPerUsdc: getBaseCashPhpPerUsdc(),
  }, { headers });
}
