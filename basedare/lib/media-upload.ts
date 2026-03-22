import 'server-only';

import { PinataSDK } from 'pinata';

export const MAX_MEDIA_SIZE_BYTES = 120 * 1024 * 1024; // 120MB

export const ALLOWED_MEDIA_MIME_TYPES = new Set([
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
  'video/3gpp',
  'video/3gpp2',
  'image/jpeg',
  'image/png',
  'image/gif',
]);

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY || 'purple-void-gateway.pinata.cloud',
});

export function validateSupportedMediaFile(file: File): string | null {
  const normalizedMimeType = file.type.toLowerCase();

  if (!ALLOWED_MEDIA_MIME_TYPES.has(normalizedMimeType)) {
    return 'Unsupported media type. Upload a video (MP4, WebM, MOV) or image (JPEG, PNG, GIF).';
  }

  if (file.size <= 0 || file.size > MAX_MEDIA_SIZE_BYTES) {
    return 'Media file is too large. Max size is 120MB.';
  }

  return null;
}

export function getProofTypeFromMimeType(mimeType: string): 'IMAGE' | 'VIDEO' {
  return mimeType.toLowerCase().startsWith('image/') ? 'IMAGE' : 'VIDEO';
}

export async function uploadPublicMediaFile(input: {
  file: File;
  name: string;
  keyvalues?: Record<string, string>;
}) {
  if (!process.env.PINATA_JWT) {
    throw new Error('Server misconfigured');
  }

  const upload = await pinata.upload.public
    .file(input.file)
    .name(input.name)
    .keyvalues(input.keyvalues ?? {});

  const gateway = process.env.PINATA_GATEWAY || 'gateway.pinata.cloud';
  const url = `https://${gateway}/ipfs/${upload.cid}`;

  return {
    cid: upload.cid,
    url,
    proofType: getProofTypeFromMimeType(input.file.type),
  };
}
