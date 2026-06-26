import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getPackBoard } from '@/lib/pack-server';

export const dynamic = 'force-dynamic';

export async function GET(_req: NextRequest, { params }: { params: Promise<{ pack: string }> }) {
  const { pack: packSlug } = await params;
  try {
    const pack = await prisma.pack.findUnique({ where: { slug: packSlug }, select: { id: true, name: true } });
    if (!pack) return NextResponse.json({ success: false, error: 'Unknown pack' }, { status: 404 });
    const board = await getPackBoard(pack.id);
    return NextResponse.json({ success: true, data: { pack: pack.name, board } });
  } catch (error) {
    console.error('[PACK_BOARD] failed:', error);
    return NextResponse.json({ success: false, error: 'Board is warming up' }, { status: 500 });
  }
}
