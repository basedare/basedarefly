import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';

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
        { status: 400 }
      );
    }

    const brand = await prisma.brand.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
      include: {
        campaigns: {
          orderBy: { createdAt: 'desc' },
          take: 10,
        },
      },
    });

    if (!brand) {
      return NextResponse.json(
        { success: false, error: 'Brand not found', code: 'NOT_FOUND' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: brand,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[BRANDS] Failed to fetch brand:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
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

    // Check if brand already exists
    const existing = await prisma.brand.findUnique({
      where: { walletAddress: walletAddress.toLowerCase() },
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
        walletAddress: walletAddress.toLowerCase(),
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
