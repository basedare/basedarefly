import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { getBrandVenueRadar } from '@/lib/venues';

// ============================================================================
// BRANDS API
// For brand registration and management in Control Mode
// ============================================================================

// Zod schemas
const RegisterBrandSchema = z.object({
  name: z.string().min(2).max(100),
  logo: z.string().url().optional(),
  walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid wallet address'),
});

const PRIVATE_RESPONSE_HEADERS = {
  'Cache-Control': 'private, no-store, max-age=0',
  Pragma: 'no-cache',
};

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

// ============================================================================
// GET /api/brands - Get brand by wallet address
// ============================================================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const walletAddress = searchParams.get('wallet');

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Wallet address required' },
        { status: 400, headers: PRIVATE_RESPONSE_HEADERS }
      );
    }

    if (!isAddress(walletAddress)) {
      return NextResponse.json(
        { success: false, error: 'Invalid wallet address' },
        { status: 400, headers: PRIVATE_RESPONSE_HEADERS }
      );
    }

    const normalizedWallet = walletAddress.toLowerCase();

    const brand = await prisma.brand.findUnique({
      where: { walletAddress: normalizedWallet },
      include: {
        campaigns: {
          select: {
            id: true,
            type: true,
            status: true,
            venueId: true,
            linkedDareId: true,
            settledAt: true,
            liveAt: true,
            createdAt: true,
            linkedDare: {
              select: {
                status: true,
                videoUrl: true,
                targetWalletAddress: true,
                claimedBy: true,
                claimRequestStatus: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found', code: 'NOT_FOUND' },
        { status: 404, headers: PRIVATE_RESPONSE_HEADERS }
      );
    }

    const [venueRadar, latestCompletedSprint] = await Promise.all([
      getBrandVenueRadar({
        brandWallet: normalizedWallet,
        limit: 6,
      }),
      prisma.verifiedFieldSprint.findFirst({
        where: {
          buyerWalletAddress: normalizedWallet,
          status: 'COMPLETE',
          completedAt: { not: null },
        },
        select: { receiptCode: true },
        orderBy: { completedAt: 'desc' },
      }),
    ]);

    const liveCampaigns = brand.campaigns.filter((campaign) => ['LIVE', 'RECRUITING'].includes(campaign.status));
    const creatorMovement = brand.campaigns.filter(
      (campaign) =>
        campaign.linkedDare?.claimRequestStatus === 'PENDING' ||
        Boolean(campaign.linkedDare?.claimedBy || campaign.linkedDare?.targetWalletAddress)
    );
    const claimRequestsPending = brand.campaigns.filter(
      (campaign) => campaign.linkedDare?.claimRequestStatus === 'PENDING'
    );
    const creatorsAttached = brand.campaigns.filter(
      (campaign) => Boolean(campaign.linkedDare?.claimedBy || campaign.linkedDare?.targetWalletAddress)
    );
    const proofsSubmitted = brand.campaigns.filter((campaign) => Boolean(campaign.linkedDare?.videoUrl));
    const inReview = brand.campaigns.filter((campaign) => campaign.linkedDare?.status === 'PENDING_REVIEW');
    const payoutQueued = brand.campaigns.filter((campaign) => campaign.linkedDare?.status === 'PENDING_PAYOUT');
    const paid = brand.campaigns.filter((campaign) => campaign.linkedDare?.status === 'VERIFIED');

    return NextResponse.json({
      success: true,
      data: {
        ...brand,
        latestCompletedSprintReceiptHref: latestCompletedSprint
          ? `/field-sprints/${encodeURIComponent(latestCompletedSprint.receiptCode)}`
          : '/field-sprints/example',
        campaignSummary: {
          total: brand.campaigns.length,
          live: liveCampaigns.length,
          settled: brand.campaigns.filter((campaign) => campaign.status === 'SETTLED').length,
          place: brand.campaigns.filter((campaign) => campaign.type === 'PLACE').length,
          creator: brand.campaigns.filter((campaign) => campaign.type === 'CREATOR').length,
          creatorMovement: creatorMovement.length,
          claimRequestsPending: claimRequestsPending.length,
          creatorsAttached: creatorsAttached.length,
          proofsSubmitted: proofsSubmitted.length,
          inReview: inReview.length,
          payoutQueued: payoutQueued.length,
          paid: paid.length,
        },
        venueRadar,
      },
    }, { headers: PRIVATE_RESPONSE_HEADERS });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BRANDS] Failed to fetch brand:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500, headers: PRIVATE_RESPONSE_HEADERS }
    );
  }
}

// ============================================================================
// POST /api/brands - Register a new brand
// ============================================================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = RegisterBrandSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues[0].message },
        { status: 400 }
      );
    }

    const { name, logo, walletAddress } = validation.data;
    const normalizedWallet = walletAddress.toLowerCase();
    const sessionWallet = await getVerifiedSessionWallet(request);
    const isInternalAuthorized = isInternalApiAuthorized(request);

    if (!isInternalAuthorized && !sessionWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (sessionWallet && sessionWallet !== normalizedWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Use the connected brand wallet.' },
        { status: 401 }
      );
    }

    // Check if brand already exists
    const existing = await prisma.brand.findUnique({
      where: { walletAddress: normalizedWallet },
    });

    if (existing) {
      return NextResponse.json(
        { success: false, error: 'Brand already registered with this wallet' },
        { status: 409 }
      );
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        logo,
        walletAddress: normalizedWallet,
      },
    });

    console.log(`[BRANDS] New brand registered: ${name} (${walletAddress})`);

    return NextResponse.json({
      success: true,
      data: brand,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BRANDS] Failed to register brand:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
