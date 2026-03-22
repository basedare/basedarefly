import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import {
  uploadPublicMediaFile,
  validateSupportedMediaFile,
} from '@/lib/media-upload';

type UploadSession = {
  token?: string;
  walletAddress?: string;
  user?: {
    walletAddress?: string | null;
  } | null;
};

async function getVerifiedSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as UploadSession | null;
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

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const sessionWallet = await getVerifiedSessionWallet(request);
    const isInternalAuthorized = isInternalApiAuthorized(request);
    if (!sessionWallet && !isInternalAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const dareId = formData.get('dareId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    const mediaValidationError = validateSupportedMediaFile(file);
    if (mediaValidationError) {
      return NextResponse.json(
        { error: mediaValidationError },
        { status: mediaValidationError.startsWith('Unsupported media type') ? 415 : 413 }
      );
    }

    if (!dareId) {
      return NextResponse.json(
        { error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    // Check if Dare exists before uploading
    const dare = await prisma.dare.findUnique({
      where: { id: dareId },
      select: {
        id: true,
        stakerAddress: true,
        targetWalletAddress: true,
        claimedBy: true,
      },
    });

    if (!dare) {
      return NextResponse.json({ error: 'Dare not found' }, { status: 404 });
    }

    const isAuthorized =
      isInternalAuthorized ||
      dare.stakerAddress?.toLowerCase() === sessionWallet ||
      dare.targetWalletAddress?.toLowerCase() === sessionWallet ||
      dare.claimedBy?.toLowerCase() === sessionWallet;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Upload to Pinata IPFS
    const upload = await uploadPublicMediaFile({
      file,
      name: `BaseDare_Proof_${dareId}`,
      keyvalues: { dareId, app: 'basedare' },
    });

    // Update the database with the IPFS CID and video URL, and change status to PENDING_REVIEW
    await prisma.dare.update({
      where: { id: dareId },
      data: {
        proofCid: upload.cid,
        videoUrl: upload.url,
        status: 'PENDING_REVIEW', // Ready for TruthOracle voting
      },
    });

    return NextResponse.json({ success: true, cid: upload.cid, url: upload.url, status: 'PENDING_REVIEW' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload file';
    console.error('Pinata upload error:', message);
    return NextResponse.json(
      { error: message },
      { status: 500 }
    );
  }
}
