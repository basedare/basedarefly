import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { prisma } from '@/lib/prisma';
import { authOptions } from '@/lib/auth-options';
import {
  MediaUploadError,
  uploadPublicMediaFile,
  validateSupportedImageFile,
} from '@/lib/media-upload';

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

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const sessionWallet = await getVerifiedSessionWallet(request);
    if (!sessionWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tagId = formData.get('tagId') as string | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No image provided.' }, { status: 400 });
    }

    const validationError = validateSupportedImageFile(file);
    if (validationError) {
      const status = validationError.startsWith('Image file is too large')
        ? 413
        : validationError.startsWith('Unsupported')
          ? 415
          : 400;
      return NextResponse.json({ success: false, error: validationError }, { status });
    }

    if (!tagId) {
      return NextResponse.json({ success: false, error: 'Tag ID is required.' }, { status: 400 });
    }

    const tag = await prisma.streamerTag.findUnique({
      where: { id: tagId },
      select: {
        id: true,
        tag: true,
        walletAddress: true,
      },
    });

    if (!tag) {
      return NextResponse.json({ success: false, error: 'Creator tag not found.' }, { status: 404 });
    }

    if (tag.walletAddress.toLowerCase() !== sessionWallet) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    const upload = await uploadPublicMediaFile({
      file,
      name: `BaseDare_Avatar_${tag.tag.replace(/^@/, '')}`,
      keyvalues: {
        app: 'basedare',
        kind: 'creator-avatar',
        tagId,
        tag: tag.tag,
      },
    });

    const updated = await prisma.streamerTag.update({
      where: { id: tagId },
      data: {
        pfpUrl: upload.url,
      },
      select: {
        id: true,
        tag: true,
        pfpUrl: true,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        ...updated,
        cid: upload.cid,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload avatar';
    const status = error instanceof MediaUploadError ? error.statusCode : 500;
    console.error('[TAG_AVATAR] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
