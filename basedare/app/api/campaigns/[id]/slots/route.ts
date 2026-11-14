import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authorizeBuyerWallet, buyerJson, creatorRoutingPaused } from '@/lib/buyer-workspace-auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const viewer = await authorizeBuyerWallet(request, request.nextUrl.searchParams.get('brandWallet'));
  if (!viewer) return buyerJson({ success: false, error: 'Verify your account to view this work.' }, 401);
  try {
    const { id } = await params;
    const campaign = await prisma.campaign.findFirst({ where: { id, brand: { walletAddress: viewer } }, include: { slots: { orderBy: { createdAt: 'asc' } } } });
    return campaign ? buyerJson({ success: true, data: campaign }) : buyerJson({ success: false, error: 'This work is unavailable.' }, 404);
  } catch { return buyerJson({ success: false, error: 'Responses could not load. Please retry.' }, 503); }
}

// Canonical PLACE missions use linked-Dare claim/proof/review and payment guards.
// Dormant CREATOR routing must not be writable through a legacy endpoint.
export async function POST() { return creatorRoutingPaused(); }
export async function PUT() { return creatorRoutingPaused(); }
