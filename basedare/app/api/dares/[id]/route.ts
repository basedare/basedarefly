import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';

type DareAuthSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const ADMIN_SECRET = process.env.ADMIN_SECRET;

const DarePatchSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(100, 'Title too long')
      .transform((value) => value.replace(/<[^>]*>/g, ''))
      .optional(),
    locationLabel: z.string().max(100, 'Location label too long').optional(),
    expiresAt: z.string().datetime().optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one editable field is required',
  });

function hasValidAdminSecret(request: NextRequest): boolean {
  if (!ADMIN_SECRET || ADMIN_SECRET.length < 32) return false;
  const authHeader = request.headers.get('x-admin-secret');
  if (!authHeader || authHeader.length !== ADMIN_SECRET.length) return false;

  let result = 0;
  for (let i = 0; i < authHeader.length; i++) {
    result |= authHeader.charCodeAt(i) ^ ADMIN_SECRET.charCodeAt(i);
  }
  return result === 0;
}

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as DareAuthSession | null;
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

function canMutateDare(
  wallet: string,
  dare: { stakerAddress: string | null; targetWalletAddress: string | null; claimedBy: string | null },
): boolean {
  return (
    dare.stakerAddress?.toLowerCase() === wallet ||
    dare.targetWalletAddress?.toLowerCase() === wallet ||
    dare.claimedBy?.toLowerCase() === wallet
  );
}

/**
 * GET /api/dares/[id]
 * Get a single dare by ID
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    const dare = await prisma.dare.findUnique({
      where: { id },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: dare,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch dare';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/dares/[id]
 * Update a dare (strict allowlist + owner/admin auth)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const isAdmin = hasValidAdminSecret(request);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    const dare = await prisma.dare.findUnique({
      where: { id },
      select: {
        id: true,
        stakerAddress: true,
        targetWalletAddress: true,
        claimedBy: true,
      },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    if (!isAdmin) {
      const wallet = await getVerifiedSessionWallet(request);
      if (!wallet) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (!canMutateDare(wallet, dare)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const parsed = DarePatchSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const updateData: {
      title?: string;
      locationLabel?: string | null;
      expiresAt?: Date;
    } = {};

    if (parsed.data.title !== undefined) {
      updateData.title = parsed.data.title;
    }
    if (parsed.data.locationLabel !== undefined) {
      updateData.locationLabel = parsed.data.locationLabel.trim() || null;
    }
    if (parsed.data.expiresAt !== undefined) {
      updateData.expiresAt = new Date(parsed.data.expiresAt);
    }

    const updatedDare = await prisma.dare.update({
      where: { id },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      data: updatedDare,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update dare';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/dares/[id]
 * Delete a dare (owner/admin auth required)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const isAdmin = hasValidAdminSecret(request);

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    const dare = await prisma.dare.findUnique({
      where: { id },
      select: {
        id: true,
        stakerAddress: true,
        targetWalletAddress: true,
        claimedBy: true,
      },
    });

    if (!dare) {
      return NextResponse.json(
        { success: false, error: 'Dare not found' },
        { status: 404 }
      );
    }

    if (!isAdmin) {
      const wallet = await getVerifiedSessionWallet(request);
      if (!wallet) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized' },
          { status: 401 }
        );
      }

      if (!canMutateDare(wallet, dare)) {
        return NextResponse.json(
          { success: false, error: 'Forbidden' },
          { status: 403 }
        );
      }
    }

    await prisma.dare.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: 'Dare deleted successfully',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to delete dare';
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
