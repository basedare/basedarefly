import { NextResponse } from 'next/server';
import { PinataSDK } from 'pinata';
import { prisma } from '@/lib/prisma'; // Added prisma integration

export const config = {
  api: {
    bodyParser: false,
  },
};

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY || 'purple-void-gateway.pinata.cloud',
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const dareId = formData.get('dareId') as string | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!dareId) {
      return NextResponse.json(
        { error: 'Dare ID is required' },
        { status: 400 }
      );
    }

    if (!process.env.PINATA_JWT) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    // Check if Dare exists before uploading
    const dare = await prisma.dare.findUnique({
      where: { id: dareId }
    });

    if (!dare) {
      return NextResponse.json({ error: 'Dare not found' }, { status: 404 });
    }

    // Upload to Pinata IPFS
    const upload = await pinata.upload.public
      .file(file)
      .name(`BaseDare_Proof_${dareId}`)
      .keyvalues({ dareId: dareId, app: 'basedare' });

    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    const url = `https://${gateway}/ipfs/${upload.cid}`;

    // Update the database with the IPFS CID and video URL, and change status to PENDING_REVIEW
    await prisma.dare.update({
      where: { id: dareId },
      data: {
        proofCid: upload.cid,
        videoUrl: url,
        status: 'PENDING_REVIEW', // Ready for TruthOracle voting
      },
    });

    return NextResponse.json({ success: true, cid: upload.cid, url, status: 'PENDING_REVIEW' }, { status: 200 });
  } catch (error: any) {
    console.error('Pinata upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
