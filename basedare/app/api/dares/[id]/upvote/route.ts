import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';

const UpvoteSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format')
    .refine((addr) => isAddress(addr), 'Invalid wallet address'),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();

    if (!body?.walletAddress) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized: wallet required to upvote',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    const validation = UpvoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const dare = await prisma.dare.findFirst({
      where: { OR: [{ id }, { shortId: id }] },
      select: { id: true },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    const updated = await prisma.dare.update({
      where: { id: dare.id },
      data: { upvoteCount: { increment: 1 } },
      select: { id: true, upvoteCount: true },
    });

    return NextResponse.json({ success: true, data: updated });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Failed to upvote dare';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
