import { hasContentRightsAcceptance } from '@/lib/content-rights-server';
import { readContentDelivery } from '@/lib/content-delivery';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { getAuthorizedProofSubmitterWallet } from '@/lib/proof-submit-auth-server';
import {
  MediaUploadError,
  uploadPublicMediaFile,
  validateSupportedMediaFile,
} from '@/lib/media-upload';

export const config = {
  api: {
    bodyParser: false,
  },
};

const PROOF_UPLOADABLE_STATUSES = new Set(['PENDING']);

export async function POST(request: NextRequest) {
  try {
    const isInternalAuthorized = isInternalApiAuthorized(request);

    const formData = await request.formData();
    const receivedAt = new Date();
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
      const status =
        mediaValidationError.startsWith('Unsupported media type') ||
        mediaValidationError.startsWith('Unsupported file extension')
          ? 415
          : mediaValidationError.startsWith('Media file is too large')
            ? 413
            : 400;

      return NextResponse.json(
        { error: mediaValidationError },
        { status }
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
        status: true,
        videoUrl: true,
        proofCid: true,
        outcomeContractSnapshot: true,
        stakerAddress: true,
        targetWalletAddress: true,
        claimedBy: true,
      },
    });

    if (!dare) {
      return NextResponse.json({ error: 'Dare not found' }, { status: 404 });
    }

    const authorizedWallet = isInternalAuthorized
      ? null
      : await getAuthorizedProofSubmitterWallet(request, {
          dareId,
          authorizedWallets: [
            dare.stakerAddress,
            dare.targetWalletAddress,
            dare.claimedBy,
          ],
        });

    if (!authorizedWallet && !isInternalAuthorized) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const isAuthorized =
      isInternalAuthorized ||
      dare.stakerAddress?.toLowerCase() === authorizedWallet ||
      dare.targetWalletAddress?.toLowerCase() === authorizedWallet ||
      dare.claimedBy?.toLowerCase() === authorizedWallet;

    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (!(await hasContentRightsAcceptance(dare))) {
      return NextResponse.json({ error: 'The assigned contributor must accept this mission’s content usage terms first.' }, { status: 409 });
    }
    const content = readContentDelivery(dare.outcomeContractSnapshot);
    if (content && !isInternalAuthorized && authorizedWallet !== (dare.claimedBy || dare.targetWalletAddress)?.toLowerCase()) {
      return NextResponse.json({ error: 'Only the assigned contributor can deliver this content.' }, { status: 403 });
    }
    if (content && file && !file.type.startsWith(content.assetType === 'PHOTO' ? 'image/' : 'video/')) {
      return NextResponse.json({ error: `This brief requires one ${content.assetType.toLowerCase()}.` }, { status: 400 });
    }

    if (!PROOF_UPLOADABLE_STATUSES.has(dare.status)) {
      return NextResponse.json(
        { error: `Proof upload is only allowed while a dare is pending. Current status: ${dare.status}.` },
        { status: 409 }
      );
    }

    if (dare.videoUrl || dare.proofCid) {
      if (dare.status === 'PENDING') {
        return NextResponse.json(
          {
            success: true,
            cid: dare.proofCid,
            url: dare.videoUrl,
            status: dare.status,
            existingProof: true,
          },
          { status: 200 }
        );
      }

      return NextResponse.json(
        { error: 'Proof already uploaded for this dare. Review or verification is already in progress.' },
        { status: 409 }
      );
    }

    if (content && receivedAt.getTime() > Date.parse(content.deadline)) {
      return NextResponse.json({ error: 'The delivery deadline has passed. Contact BaseDare before submitting new work.' }, { status: 409 });
    }

    // Upload to Pinata IPFS
    const upload = await uploadPublicMediaFile({
      file,
      name: `BaseDare_Proof_${dareId}`,
      keyvalues: { dareId, app: 'basedare' },
    });

    const duplicateProof = await prisma.dare.findFirst({
      where: {
        id: { not: dareId },
        OR: [
          { proofCid: upload.cid },
          { videoUrl: upload.url },
        ],
      },
      select: { id: true },
    });

    if (duplicateProof) {
      return NextResponse.json(
        { error: 'This proof has already been attached to another dare. Submit unique evidence.' },
        { status: 409 }
      );
    }

    // Attach proof media but keep the dare in the community-signal lane until
    // verify-proof or moderator flow escalates it.
    const attached = await prisma.dare.updateMany({
      where: { id: dareId, status: 'PENDING', proofCid: null, videoUrl: null, ...(content ? { claimedBy: dare.claimedBy, targetWalletAddress: dare.targetWalletAddress } : {}) },
      data: {
        proofCid: upload.cid,
        videoUrl: upload.url,
        ...(content ? { contentSubmittedAt: receivedAt } : {}),
        status: 'PENDING',
      },
    });

    if (attached.count !== 1) return NextResponse.json({ error: 'The mission or its proof changed during upload. Reload the mission to recover the saved submission.' }, { status: 409 });

    return NextResponse.json({ success: true, cid: upload.cid, url: upload.url, status: 'PENDING' }, { status: 200 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to upload file';
    const status =
      error instanceof MediaUploadError
        ? error.statusCode
        : message.includes('Dare not found')
          ? 404
          : 500;

    console.error('Pinata upload error:', message);
    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
