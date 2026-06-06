import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { isAddress } from 'viem';
import { getSpotVaultSnapshot } from '@/lib/spot-vault';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const VaultQuerySchema = z.object({
  walletAddress: z
    .string()
    .refine((value) => isAddress(value), 'Valid walletAddress is required')
    .optional(),
  limit: z.coerce.number().min(4).max(24).default(14),
});

function queryValue(searchParams: URLSearchParams, key: string) {
  return searchParams.has(key) ? searchParams.get(key) ?? undefined : undefined;
}

function getVaultAuthResource(slug: string) {
  return `venue:${slug}:vault`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const parsed = VaultQuerySchema.safeParse({
      walletAddress: queryValue(searchParams, 'walletAddress'),
      limit: queryValue(searchParams, 'limit'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid vault query' },
        { status: 400 }
      );
    }

    const authorizedWallet = parsed.data.walletAddress
      ? await getAuthorizedWalletForRequest(request, {
          walletAddress: parsed.data.walletAddress,
          action: 'spot-vault:read',
          resource: getVaultAuthResource(slug),
        })
      : null;

    const snapshot = await getSpotVaultSnapshot({
      slug,
      walletAddress: authorizedWallet,
      limit: parsed.data.limit,
    });

    if (!snapshot) {
      return NextResponse.json({ success: false, error: 'Venue not found' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: snapshot,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[SPOT_VAULT] Snapshot failed:', message);
    return NextResponse.json(
      { success: false, error: 'Unable to load spot vault right now' },
      { status: 500 }
    );
  }
}
