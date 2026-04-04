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

const ALLOWED_MEDIA_EXTENSIONS = new Set([
  '.mp4',
  '.mov',
  '.webm',
  '.mkv',
  '.3gp',
  '.3g2',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
]);

const DEFAULT_PINATA_GATEWAY = 'purple-void-gateway.pinata.cloud';

export class MediaUploadError extends Error {
  statusCode: number;
  code: string;

  constructor(message: string, statusCode = 500, code = 'MEDIA_UPLOAD_ERROR') {
    super(message);
    this.name = 'MediaUploadError';
    this.statusCode = statusCode;
    this.code = code;
  }
}

function getNormalizedExtension(fileName: string): string | null {
  const lastDot = fileName.lastIndexOf('.');
  if (lastDot === -1) return null;
  const extension = fileName.slice(lastDot).trim().toLowerCase();
  return extension.length > 1 ? extension : null;
}

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT!,
  pinataGateway: process.env.PINATA_GATEWAY || DEFAULT_PINATA_GATEWAY,
});

export function validateSupportedMediaFile(file: File): string | null {
  if (!file || typeof file.arrayBuffer !== 'function') {
    return 'No file provided.';
  }

  if (file.size <= 0) {
    return 'Media file is empty. Please choose a valid video or image.';
  }

  if (file.size > MAX_MEDIA_SIZE_BYTES) {
    return 'Media file is too large. Max size is 120MB.';
  }

  const normalizedMimeType = file.type.toLowerCase();
  const normalizedExtension = getNormalizedExtension(file.name);

  if (!ALLOWED_MEDIA_MIME_TYPES.has(normalizedMimeType)) {
    return 'Unsupported media type. Upload a video (MP4, WebM, MOV) or image (JPEG, PNG, GIF).';
  }

  if (!normalizedExtension || !ALLOWED_MEDIA_EXTENSIONS.has(normalizedExtension)) {
    return 'Unsupported file extension. Upload a video (MP4, WebM, MOV) or image (JPEG, PNG, GIF).';
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
    throw new MediaUploadError('Proof uploads are not configured yet. Please try again later.', 503, 'PINATA_MISSING_JWT');
  }

  try {
    const upload = await pinata.upload.public
      .file(input.file)
      .name(input.name)
      .keyvalues(input.keyvalues ?? {});

    const gateway = process.env.PINATA_GATEWAY || DEFAULT_PINATA_GATEWAY;
    const url = `https://${gateway}/ipfs/${upload.cid}`;

    return {
      cid: upload.cid,
      url,
      proofType: getProofTypeFromMimeType(input.file.type),
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown upload error';
    throw new MediaUploadError(
      `Proof upload failed upstream. ${message}`,
      502,
      'PINATA_UPLOAD_FAILED'
    );
  }
}
