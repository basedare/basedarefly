import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

const UpvoteSchema = z.object({
  walletAddress: z
    .string()
    .regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address format')
    .refine((addr) => isAddress(addr), 'Invalid wallet address')
    .optional(),
});

type WalletSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as WalletSession | null;
  if (!session) return null;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (session.token && (!bearerToken || bearerToken !== session.token)) {
    return null;
  }

  const wallet = session.walletAddress ?? session.user?.walletAddress ?? null;
  if (!wallet || !isAddress(wallet)) return null;
  return wallet.toLowerCase();
}

function normalizeWallet(walletAddress?: string | null): string | null {
  if (!walletAddress || !isAddress(walletAddress)) return null;
  return walletAddress.toLowerCase();
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));

    const validation = UpvoteSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const sessionWallet = await getVerifiedSessionWallet(request);
    const normalizedBodyWallet = normalizeWallet(validation.data.walletAddress);
    const actingWallet = sessionWallet ?? normalizedBodyWallet;

    if (!actingWallet) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          code: 'UNAUTHORIZED',
        },
        { status: 401 }
      );
    }

    if (sessionWallet && normalizedBodyWallet && normalizedBodyWallet !== sessionWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use authenticated session wallet.' },
        { status: 401 }
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
