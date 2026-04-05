import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { z } from 'zod';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { getRankedCampaignMatches } from '@/lib/campaign-matching';

const TargetingCriteriaSchema = z.object({
  niche: z.string().optional(),
  minFollowers: z.number().min(0).optional(),
  maxFollowers: z.number().optional(),
  location: z.string().optional(),
  platforms: z.array(z.string()).optional(),
});

const RecommendationsSchema = z.object({
  brandWallet: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  venueId: z.string().min(1).optional(),
  venueCity: z.string().optional(),
  venueCountry: z.string().optional(),
  targetingCriteria: TargetingCriteriaSchema.optional(),
  limit: z.number().min(1).max(8).optional().default(4),
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

function normalizeWallet(value: string | null | undefined): string | null {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RecommendationsSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { brandWallet, venueId, venueCity, venueCountry, targetingCriteria, limit } = validation.data;
    const sessionWallet = await getVerifiedSessionWallet(request);
    const isInternalAuthorized = isInternalApiAuthorized(request);
    const normalizedBrandWallet = normalizeWallet(brandWallet);
    const actingWallet = sessionWallet ?? (isInternalAuthorized ? normalizedBrandWallet : null);

    if (!actingWallet || !normalizedBrandWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (normalizedBrandWallet !== actingWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use the connected brand wallet.' },
        { status: 401 }
      );
    }

    const brand = await prisma.brand.findUnique({
      where: { walletAddress: normalizedBrandWallet },
      select: { id: true },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found. Please register first.' },
        { status: 404 }
      );
    }

    const matches = await getRankedCampaignMatches(prisma, {
      targeting: targetingCriteria ?? {},
      venueId: venueId ?? null,
      venueCity: venueCity ?? null,
      venueCountry: venueCountry ?? null,
      limit,
    });

    return NextResponse.json({
      success: true,
      data: { matches },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load creator recommendations';
    console.error('[CAMPAIGN_RECOMMENDATIONS] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
