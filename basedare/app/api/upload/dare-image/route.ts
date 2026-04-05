import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import {
  MediaUploadError,
  uploadPublicMediaFile,
  validateSupportedImageFile,
} from '@/lib/media-upload';
import { getAuthorizedDareImageWallet } from '@/lib/dare-image-auth-server';

export const config = {
  api: {
    bodyParser: false,
  },
};

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const walletAddress = formData.get('walletAddress') as string | null;

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

    if (!walletAddress || !isAddress(walletAddress)) {
      return NextResponse.json({ success: false, error: 'Wallet address is required.' }, { status: 400 });
    }

    const authorizedWallet = await getAuthorizedDareImageWallet(request, walletAddress);
    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const upload = await uploadPublicMediaFile({
      file,
      name: `BaseDare_Cover_${authorizedWallet.slice(0, 10)}`,
      keyvalues: {
        app: 'basedare',
        kind: 'dare-cover',
        walletAddress: authorizedWallet,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        url: upload.url,
        cid: upload.cid,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload dare image';
    const status = error instanceof MediaUploadError ? error.statusCode : 500;
    console.error('[DARE_IMAGE_UPLOAD] Failed:', message);
    return NextResponse.json({ success: false, error: message }, { status });
  }
}
