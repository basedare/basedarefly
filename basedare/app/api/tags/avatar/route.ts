import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  MediaUploadError,
  uploadPublicMediaFile,
  validateSupportedImageFile,
} from '@/lib/media-upload';
import { getAuthorizedCreatorProfileWallet } from '@/lib/creator-profile-auth-server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
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

    const sessionWallet = await getAuthorizedCreatorProfileWallet(request, tagId);
    if (!sessionWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
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
