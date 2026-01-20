import { NextResponse } from 'next/server';
import { PinataSDK } from 'pinata';

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

    if (!process.env.PINATA_JWT) {
      return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 });
    }

    const upload = await pinata.upload.public
      .file(file)
      .name(`BaseDare_Proof_${dareId || 'anonymous'}`)
      .keyvalues({ dareId: dareId || 'unknown', app: 'basedare' });

    const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
    const url = `https://${gateway}/ipfs/${upload.cid}`;

    return NextResponse.json({ cid: upload.cid, url }, { status: 200 });
  } catch (error: any) {
    console.error('Pinata upload error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to upload file' },
      { status: 500 }
    );
  }
}
