import { createHash } from 'crypto';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { withReceiptSerial } from '@/lib/receipt-serial';
import { calculateDistance, isValidCoordinates } from '@/lib/geo';
import { isPlaceTagTableMissingError } from '@/lib/place-tags';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import {
  uploadPublicMediaFile,
  validateSupportedMediaFile,
} from '@/lib/media-upload';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';
import { alertPlaceTagSubmission } from '@/lib/telegram';
import { publishVenueRoomReceipt } from '@/lib/venue-room';
import { createWalletNotification } from '@/lib/notifications';
import { composePassport } from '@/lib/creator-passport';

// A proof mark auto-approves when the same wallet has a CONFIRMED venue
// check-in (QR + GPS, replay-protected) at this venue within this window —
// presence is provable, so no referee is needed. Marks with no such backing
// stay PENDING for exception review. This is the IRL instance of
// "verification -> auto-settle": the human performs, the rail clears it.
const PRESENCE_BACKED_WINDOW_MS = 6 * 60 * 60 * 1000; // 6h — one outing

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

function normalizeWallet(value: FormDataEntryValue | string | null | undefined) {
  if (typeof value !== 'string') return null;
  if (!isAddress(value)) return null;
  return value.toLowerCase();
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

function getReadablePlaceTagError(error: unknown) {
  if (!(error instanceof Error)) {
    return 'Failed to submit place tag';
  }

  if (error.message === 'Server misconfigured') {
    return 'Place-tag uploads are not configured yet. Please try again later.';
  }

  if (error.message.toLowerCase().includes('pinata')) {
    return 'Proof upload failed. Please retry in a minute.';
  }

  return error.message || 'Failed to submit place tag';
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
    const { id } = await params;
    const formData = await request.formData();
    const sessionWallet = await getAuthenticatedWallet(request);
    const bodyWallet = normalizeWallet(formData.get('walletAddress'));
    const walletAddress = await getAuthorizedWalletForRequest(request, {
      walletAddress: bodyWallet ?? sessionWallet,
      action: 'place:tag',
      resource: id,
    });
    const file = formData.get('file');
    const caption = parseOptionalString(formData.get('caption'));
    const linkedDareId = parseOptionalString(formData.get('linkedDareId'));
    const lat = parseOptionalFloat(formData.get('lat'));
    const lng = parseOptionalFloat(formData.get('lng'));
    const vibeTags = parseVibeTags(formData.get('vibeTags'));

    if (!walletAddress) {
      return NextResponse.json(
        { success: false, error: 'Connect the wallet tied to your verified BareTag before publishing place proof' },
        { status: 401 }
      );
    }

    if (sessionWallet && bodyWallet && sessionWallet !== bodyWallet) {
      return NextResponse.json(
        { success: false, error: 'Wallet mismatch. Reconnect the same wallet used for your current session.' },
        { status: 401 }
      );
    }

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
        city: true,
        country: true,
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

    const creatorProfile = await findPrimaryCreatorTagForWallet(walletAddress);
    if (!creatorProfile) {
      return NextResponse.json(
        { success: false, error: 'Secure a verified BareTag before publishing place proof.' },
        { status: 403 }
      );
    }

    let upload: Awaited<ReturnType<typeof uploadPublicMediaFile>>;

    try {
      upload = await uploadPublicMediaFile({
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
    } catch (error) {
      const message = getReadablePlaceTagError(error);
      console.error('[PLACE_TAGS_POST] Upload failed:', message);

      return NextResponse.json(
        { success: false, error: message },
        { status: message.includes('not configured') ? 503 : 502 }
      );
    }

    const approvedTagCount = await prisma.placeTag.count({
      where: {
        venueId: id,
        status: 'APPROVED',
      },
    });

    // Presence-backed auto-approval: a confirmed QR+GPS check-in by this wallet
    // at this venue within the window proves they were physically here, so the
    // mark clears with no referee. A miss (or a lookup error) safely falls back
    // to PENDING for exception review.
    let presenceBacked = false;
    let presenceCheckInId: string | null = null;
    try {
      // Require QR_AND_GPS specifically — a CONFIRMED check-in can be QR_ONLY.
      // The paired signals support automatic approval without being treated as
      // impossible to spoof.
      const presenceCheckIn = await prisma.venueCheckIn.findFirst({
        where: {
          venueId: id,
          walletAddress,
          status: 'CONFIRMED',
          proofLevel: 'QR_AND_GPS',
          scannedAt: { gte: new Date(Date.now() - PRESENCE_BACKED_WINDOW_MS) },
        },
        orderBy: { scannedAt: 'desc' },
        select: { id: true },
      });
      presenceBacked = Boolean(presenceCheckIn);
      presenceCheckInId = presenceCheckIn?.id ?? null;
    } catch (presenceError) {
      console.error('[PLACE_TAGS_POST] Presence lookup failed; defaulting to PENDING:', presenceError);
    }

    const tagData = {
      venueId: id,
      walletAddress,
      creatorTag: creatorProfile?.tag ?? null,
      status: presenceBacked ? 'APPROVED' : 'PENDING',
      reviewedAt: presenceBacked ? new Date() : null,
      reviewerWallet: presenceBacked ? 'system:presence' : null,
      reviewReason: presenceBacked
        ? 'Auto-approved: confirmed venue check-in (QR + GPS)'
        : null,
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
        // Audit trail: which presence event cleared this proof (fraud/reputation).
        ...(presenceBacked && presenceCheckInId
          ? { presenceCheckInId, presenceVerifiedAt: new Date().toISOString() }
          : {}),
      },
    };
    const tagSelect = {
      id: true,
      status: true,
      proofMediaUrl: true,
      creatorTag: true,
      firstMark: true,
    } as const;

    // Auto-approved tags are issued their receipt serial in the same
    // transaction that creates them APPROVED; pending tags get theirs at
    // review time instead.
    const tag = presenceBacked
      ? await withReceiptSerial((serial, tx) =>
          tx.placeTag.create({
            data: { ...tagData, serialNumber: serial },
            select: tagSelect,
          })
        )
      : await prisma.placeTag.create({ data: tagData, select: tagSelect });

    const actorLabel = tag.creatorTag || `${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`;
    let alertDelivered = false;

    if (presenceBacked) {
      // Auto-approved — skip the referee alert. Tell the user it's live and post
      // the verified receipt to the venue room (mirrors the manual-approve path).
      await createWalletNotification({
        wallet: walletAddress,
        type: 'PLACE_TAG_APPROVED',
        title: 'Your mark is live',
        message: `Your check-in proof at "${place.name}" is verified and on the map.`,
        link: `/venues/${place.slug}`,
        pushTopic: 'venues',
      }).catch(() => {});

      await publishVenueRoomReceipt({
        venueId: place.id,
        actorWallet: walletAddress,
        actorLabel,
        receiptType: 'mark-approved',
        sourceId: tag.id,
        body: `${tag.firstMark ? 'First mark verified' : 'Mark verified'} for ${actorLabel} — confirmed on-site presence.`,
        href: `/venues/${encodeURIComponent(place.slug)}`,
        tone: tag.firstMark ? 'gold' : 'emerald',
      }).catch((receiptError) => {
        const receiptMessage = receiptError instanceof Error ? receiptError.message : 'Unknown receipt error';
        console.error('[PLACE_TAGS_POST] Room receipt failed:', receiptMessage);
        return null;
      });

      await composePassport(walletAddress, { persist: true }).catch((passportError) => {
        console.error('[PLACE_TAGS_POST] Passport refresh failed:', passportError);
        return null;
      });
    } else {
      alertDelivered = await alertPlaceTagSubmission({
        tagId: tag.id,
        venueSlug: place.slug,
        venueName: place.name,
        city: place.city,
        country: place.country,
        creatorTag: tag.creatorTag,
        walletAddress,
        caption,
        vibeTags,
        proofMediaUrl: tag.proofMediaUrl,
        firstMark: tag.firstMark,
        geoDistanceMeters,
      });

      if (!alertDelivered) {
        console.error('[PLACE_TAGS_POST] Telegram alert was not delivered for pending tag:', tag.id);
      }

      await publishVenueRoomReceipt({
        venueId: place.id,
        actorWallet: walletAddress,
        actorLabel,
        receiptType: 'mark-submitted',
        sourceId: tag.id,
        body: `${actorLabel} submitted ${tag.firstMark ? 'the first mark' : 'a new mark'} for referee review.`,
        href: `/venues/${encodeURIComponent(place.slug)}`,
        tone: tag.firstMark ? 'gold' : 'violet',
      }).catch((receiptError) => {
        const receiptMessage = receiptError instanceof Error ? receiptError.message : 'Unknown receipt error';
        console.error('[PLACE_TAGS_POST] Room receipt failed:', receiptMessage);
        return null;
      });
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          tagId: tag.id,
          status: tag.status,
          proofMediaUrl: tag.proofMediaUrl,
          creatorTag: tag.creatorTag,
          firstMark: tag.firstMark,
          venueSlug: place.slug,
          venueName: place.name,
          adminAlertDelivered: alertDelivered,
          presenceBacked,
          message: presenceBacked
            ? 'Mark verified by your venue check-in — it is live on the map.'
            : 'Tag submitted. It is now waiting for referee review.',
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

    const message = getReadablePlaceTagError(error);
    console.error('[PLACE_TAGS_POST] Failed:', message);
    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
