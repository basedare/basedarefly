import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { calculateDistance, isValidCoordinates } from '@/lib/geo';
import { isPlaceTagTableMissingError } from '@/lib/place-tags';
import {
  uploadPublicMediaFile,
  validateSupportedMediaFile,
} from '@/lib/media-upload';

type WalletSession = {
  token?: string;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

const MAX_CAPTION_LENGTH = 280;
const MAX_VIBE_TAGS = 6;
const MAX_DAILY_PLACE_TAGS = 3;

function getSessionWallet(session: WalletSession | null) {
  const wallet = session?.walletAddress ?? session?.user?.walletAddress ?? null;
  if (!wallet || !isAddress(wallet)) {
    return null;
  }

  return wallet.toLowerCase();
}

function parseOptionalString(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseOptionalFloat(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function parseVibeTags(value: FormDataEntryValue | null) {
  if (typeof value !== 'string') {
    return [];
  }

  const normalized = value
    .split(',')
    .map((item) => item.trim().toLowerCase().replace(/^#/, ''))
    .filter(Boolean);

  return Array.from(new Set(normalized)).slice(0, MAX_VIBE_TAGS);
}

async function getAuthenticatedWallet(request: NextRequest) {
  const session = (await getServerSession(authOptions)) as WalletSession | null;
  if (!session) return null;

  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.replace(/^Bearer\s+/i, '').trim();
  if (session.token && (!bearerToken || bearerToken !== session.token)) {
    return null;
  }

  return getSessionWallet(session);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const place = await prisma.venue.findUnique({
      where: { id },
      select: { id: true },
    });

    if (!place) {
      return NextResponse.json(
        { success: false, error: 'Place not found' },
        { status: 404 }
      );
    }

    const tags = await prisma.placeTag.findMany({
      where: {
        venueId: id,
        status: 'APPROVED',
      },
      orderBy: { submittedAt: 'desc' },
      take: 12,
      select: {
        id: true,
        creatorTag: true,
        walletAddress: true,
        caption: true,
        vibeTags: true,
        proofMediaUrl: true,
        proofType: true,
        source: true,
        firstMark: true,
        submittedAt: true,
      },
    });

    const [approvedCount, heatAggregate] = await Promise.all([
      prisma.placeTag.count({
        where: {
          venueId: id,
          status: 'APPROVED',
        },
      }),
      prisma.placeTag.aggregate({
        where: {
          venueId: id,
          status: 'APPROVED',
        },
        _sum: {
          heatContribution: true,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        approvedCount,
        heatScore: heatAggregate._sum.heatContribution ?? 0,
        tags: tags.map((tag) => ({
          id: tag.id,
          creatorTag: tag.creatorTag,
          walletAddress: tag.walletAddress,
          caption: tag.caption,
          vibeTags: tag.vibeTags,
          proofMediaUrl: tag.proofMediaUrl,
          proofType: tag.proofType,
          source: tag.source,
          firstMark: tag.firstMark,
          submittedAt: tag.submittedAt.toISOString(),
        })),
      },
    });
  } catch (error) {
    if (isPlaceTagTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Place tags are not available yet. Apply the latest migration first.' },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PLACE_TAGS_GET] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch place tags' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const walletAddress = await getAuthenticatedWallet(request);
    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Sign in with a wallet-backed session to tag a place' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const formData = await request.formData();
    const file = formData.get('file');
    const caption = parseOptionalString(formData.get('caption'));
    const linkedDareId = parseOptionalString(formData.get('linkedDareId'));
    const lat = parseOptionalFloat(formData.get('lat'));
    const lng = parseOptionalFloat(formData.get('lng'));
    const vibeTags = parseVibeTags(formData.get('vibeTags'));

    if (!(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: 'Proof media is required' },
        { status: 400 }
      );
    }

    const mediaValidationError = validateSupportedMediaFile(file);
    if (mediaValidationError) {
      return NextResponse.json(
        { success: false, error: mediaValidationError },
        { status: mediaValidationError.startsWith('Unsupported media type') ? 415 : 413 }
      );
    }

    if (caption && caption.length > MAX_CAPTION_LENGTH) {
      return NextResponse.json(
        { success: false, error: `Caption must be ${MAX_CAPTION_LENGTH} characters or less` },
        { status: 400 }
      );
    }

    if (lat === null || lng === null || !isValidCoordinates(lat, lng)) {
      return NextResponse.json(
        { success: false, error: 'Valid location coordinates are required to tag a place' },
        { status: 400 }
      );
    }

    const place = await prisma.venue.findUnique({
      where: { id },
      select: {
        id: true,
        slug: true,
        name: true,
        status: true,
        latitude: true,
        longitude: true,
        checkInRadiusMeters: true,
      },
    });

    if (!place || place.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Place not found or inactive' },
        { status: 404 }
      );
    }

    const geoDistanceMeters = Math.round(
      calculateDistance(place.latitude, place.longitude, lat, lng) * 1000
    );
    const allowedRadiusMeters = Math.max(place.checkInRadiusMeters, 150);

    if (geoDistanceMeters > allowedRadiusMeters) {
      return NextResponse.json(
        {
          success: false,
          error: 'You need to be physically near this place to leave a verified mark',
          distanceMeters: geoDistanceMeters,
          allowedRadiusMeters,
        },
        { status: 403 }
      );
    }

    const windowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const recentSubmissionCount = await prisma.placeTag.count({
      where: {
        venueId: id,
        walletAddress,
        createdAt: { gte: windowStart },
      },
    });

    if (recentSubmissionCount >= MAX_DAILY_PLACE_TAGS) {
      return NextResponse.json(
        {
          success: false,
          error: 'You have reached the daily limit for tags at this place. Try again tomorrow.',
        },
        { status: 429 }
      );
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer());
    const proofHash = createHash('sha256').update(fileBuffer).digest('hex');

    const duplicateProof = await prisma.placeTag.findFirst({
      where: {
        venueId: id,
        walletAddress,
        proofHash,
      },
      select: { id: true },
    });

    if (duplicateProof) {
      return NextResponse.json(
        { success: false, error: 'This proof was already submitted for this place' },
        { status: 409 }
      );
    }

    const creatorProfile = await prisma.streamerTag.findFirst({
      where: {
        walletAddress,
        status: { in: ['ACTIVE', 'VERIFIED'] },
      },
      select: {
        tag: true,
      },
      orderBy: { verifiedAt: 'desc' },
    });

    const upload = await uploadPublicMediaFile({
      file,
      name: `BaseDare_PlaceTag_${place.slug}_${Date.now()}`,
      keyvalues: {
        app: 'basedare',
        type: 'place-tag',
        venueId: place.id,
        venueSlug: place.slug,
        walletAddress,
      },
    });

    const approvedTagCount = await prisma.placeTag.count({
      where: {
        venueId: id,
        status: 'APPROVED',
      },
    });

    const tag = await prisma.placeTag.create({
      data: {
        venueId: id,
        walletAddress,
        creatorTag: creatorProfile?.tag ?? null,
        status: 'PENDING',
        caption,
        vibeTags,
        proofMediaUrl: upload.url,
        proofCid: upload.cid,
        proofHash,
        proofType: upload.proofType,
        source: linkedDareId ? 'DARE_LINKED_TAG' : 'DIRECT_TAG',
        linkedDareId,
        latitude: lat,
        longitude: lng,
        geoDistanceMeters,
        heatContribution: linkedDareId ? 15 : 10,
        firstMark: approvedTagCount === 0,
        metadataJson: {
          fileName: file.name,
          mimeType: file.type,
          fileSize: file.size,
        },
      },
      select: {
        id: true,
        status: true,
        proofMediaUrl: true,
        creatorTag: true,
        firstMark: true,
      },
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          tagId: tag.id,
          status: tag.status,
          proofMediaUrl: tag.proofMediaUrl,
          creatorTag: tag.creatorTag,
          firstMark: tag.firstMark,
          message: 'Tag submitted. It is now waiting for referee review.',
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (isPlaceTagTableMissingError(error)) {
      return NextResponse.json(
        { success: false, error: 'Place tags are not available yet. Apply the latest migration first.' },
        { status: 503 }
      );
    }

    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[PLACE_TAGS_POST] Failed:', message);
    return NextResponse.json(
      { success: false, error: 'Failed to submit place tag' },
      { status: 500 }
    );
  }
}
