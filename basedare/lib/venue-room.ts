import 'server-only';

import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { calculateDistance, isValidCoordinates } from '@/lib/geo';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';
import { createWalletNotification } from '@/lib/notifications';

export const VENUE_ROOM_MESSAGE_TTL_HOURS = 24;
export const VENUE_ROOM_ACCESS_WINDOW_HOURS = 24;
export const VENUE_ROOM_WHO_HERE_WINDOW_HOURS = 12;

const MIN_ROOM_RADIUS_METERS = 250;
const MAX_ROOM_RADIUS_METERS = 1200;

type VenueRoomVenue = {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
  status: string;
  checkInRadiusMeters: number;
};

export type VenueRoomAccess = {
  unlocked: boolean;
  mode: 'check-in' | 'proximity' | 'locked';
  reason: string;
  ttlHours: number;
  radiusMeters: number;
};

export type VenueRoomMessageSummary = {
  id: string;
  walletLabel: string;
  displayName: string;
  avatarUrl: string | null;
  body: string;
  mine: boolean;
  kind: 'message' | 'receipt';
  receiptType: string | null;
  href: string | null;
  tone: string | null;
  createdAt: string;
  expiresAt: string;
};

export type VenueRoomPresenceSummary = {
  id: string;
  walletLabel: string;
  displayName: string;
  avatarUrl: string | null;
  source: string;
  lastSeenAt: string;
  expiresAt: string;
};

type VenueRoomActor = {
  displayName: string;
  avatarUrl: string | null;
};

type VenueRoomSnapshotInput = {
  slug: string;
  walletAddress?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  limit?: number;
};

type VenueRoomWriteInput = VenueRoomSnapshotInput & {
  body: string;
  showInWhoHere: boolean;
};

type VenueRoomPresenceInput = VenueRoomSnapshotInput & {
  visible: boolean;
};

type VenueRoomReceiptInput = {
  venueId: string;
  actorWallet?: string | null;
  actorLabel?: string | null;
  body: string;
  receiptType: string;
  sourceId?: string | null;
  href?: string | null;
  tone?: 'cyan' | 'emerald' | 'gold' | 'violet';
  notify?: boolean;
};

function normalizeWallet(value?: string | null) {
  return value?.trim().toLowerCase() || null;
}

function shortWallet(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function roomWalletLabel(wallet: string, metadataJson?: Prisma.JsonValue | null) {
  const metadata = readMetadataRecord(metadataJson);
  if (metadata.kind === 'receipt') {
    return 'BaseDare';
  }

  return shortWallet(wallet);
}

function roomRadiusMeters(venue: Pick<VenueRoomVenue, 'checkInRadiusMeters'>) {
  return Math.min(MAX_ROOM_RADIUS_METERS, Math.max(MIN_ROOM_RADIUS_METERS, venue.checkInRadiusMeters * 5));
}

function addHours(date: Date, hours: number) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function readMetadataRecord(metadataJson: Prisma.JsonValue | null | undefined) {
  if (!metadataJson || typeof metadataJson !== 'object' || Array.isArray(metadataJson)) {
    return {};
  }

  return metadataJson as Record<string, unknown>;
}

function readMetadataString(metadataJson: Prisma.JsonValue | null | undefined, key: string) {
  const metadata = readMetadataRecord(metadataJson);
  const value = metadata[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function isPublicCheckIn(metadataJson: Prisma.JsonValue | null | undefined) {
  const metadata = readMetadataRecord(metadataJson);
  return metadata.roomVisible === true || metadata.visibility === 'PUBLIC';
}

function sanitizeRoomBody(value: string) {
  const compact = value.replace(/\s+/g, ' ').trim();
  return compact.slice(0, 280);
}

function trimNotificationBody(value: string) {
  return value.length > 92 ? `${value.slice(0, 89)}...` : value;
}

function systemWalletForReceipt(receiptType: string) {
  return `system:${receiptType}`.slice(0, 120);
}

async function findActiveVenueBySlug(slug: string): Promise<VenueRoomVenue | null> {
  return prisma.venue.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      latitude: true,
      longitude: true,
      status: true,
      checkInRadiusMeters: true,
    },
  });
}

async function getActor(walletAddress: string): Promise<VenueRoomActor> {
  const primaryTag = await findPrimaryCreatorTagForWallet(walletAddress);

  return {
    displayName: primaryTag?.tag || shortWallet(walletAddress),
    avatarUrl: primaryTag?.pfpUrl ?? null,
  };
}

async function resolveVenueRoomAccess(input: VenueRoomSnapshotInput, now = new Date()) {
  const venue = await findActiveVenueBySlug(input.slug);
  if (!venue || venue.status !== 'ACTIVE') {
    return {
      venue,
      access: {
        unlocked: false,
        mode: 'locked' as const,
        reason: 'Venue room unavailable.',
        ttlHours: VENUE_ROOM_MESSAGE_TTL_HOURS,
        radiusMeters: MIN_ROOM_RADIUS_METERS,
      },
    };
  }

  const radiusMeters = roomRadiusMeters(venue);
  const latitude = typeof input.latitude === 'number' ? input.latitude : null;
  const longitude = typeof input.longitude === 'number' ? input.longitude : null;
  const hasValidCoordinates =
    latitude !== null && longitude !== null && isValidCoordinates(latitude, longitude);

  if (hasValidCoordinates) {
    const distanceMeters = Math.round(
      calculateDistance(venue.latitude, venue.longitude, latitude, longitude) * 1000
    );

    if (distanceMeters <= radiusMeters) {
      return {
        venue,
        access: {
          unlocked: true,
          mode: 'proximity' as const,
          reason: 'Unlocked nearby.',
          ttlHours: VENUE_ROOM_MESSAGE_TTL_HOURS,
          radiusMeters,
        },
      };
    }
  }

  const walletAddress = normalizeWallet(input.walletAddress);
  if (walletAddress) {
    const recentSince = new Date(now.getTime() - VENUE_ROOM_ACCESS_WINDOW_HOURS * 60 * 60 * 1000);
    const recentCheckIn = await prisma.venueCheckIn.findFirst({
      where: {
        venueId: venue.id,
        walletAddress,
        status: 'CONFIRMED',
        scannedAt: { gte: recentSince },
      },
      orderBy: { scannedAt: 'desc' },
      select: { id: true },
    });

    if (recentCheckIn) {
      return {
        venue,
        access: {
          unlocked: true,
          mode: 'check-in' as const,
          reason: 'Unlocked by recent check-in.',
          ttlHours: VENUE_ROOM_MESSAGE_TTL_HOURS,
          radiusMeters,
        },
      };
    }
  }

  return {
    venue,
    access: {
      unlocked: false,
      mode: 'locked' as const,
      reason: 'Check in or get nearby to open this room.',
      ttlHours: VENUE_ROOM_MESSAGE_TTL_HOURS,
      radiusMeters,
    },
  };
}

function mapRoomMessage(
  message: {
    id: string;
    walletAddress: string;
    displayName: string;
    avatarUrl: string | null;
    body: string;
    metadataJson: Prisma.JsonValue | null;
    createdAt: Date;
    expiresAt: Date;
  },
  viewerWallet: string | null
): VenueRoomMessageSummary {
  const kind = readMetadataString(message.metadataJson, 'kind') === 'receipt' ? 'receipt' : 'message';

  return {
    id: message.id,
    walletLabel: roomWalletLabel(message.walletAddress, message.metadataJson),
    displayName: message.displayName,
    avatarUrl: message.avatarUrl,
    body: message.body,
    mine: kind === 'message' && Boolean(viewerWallet && message.walletAddress === viewerWallet),
    kind,
    receiptType: readMetadataString(message.metadataJson, 'receiptType'),
    href: readMetadataString(message.metadataJson, 'href'),
    tone: readMetadataString(message.metadataJson, 'tone'),
    createdAt: message.createdAt.toISOString(),
    expiresAt: message.expiresAt.toISOString(),
  };
}

async function getWhoHere(venueId: string, now: Date): Promise<VenueRoomPresenceSummary[]> {
  const since = new Date(now.getTime() - VENUE_ROOM_WHO_HERE_WINDOW_HOURS * 60 * 60 * 1000);
  const [roomPresences, publicCheckIns] = await Promise.all([
    prisma.venueRoomPresence.findMany({
      where: {
        venueId,
        visibility: 'PUBLIC',
        expiresAt: { gt: now },
      },
      orderBy: [{ lastSeenAt: 'desc' }],
      take: 20,
      select: {
        id: true,
        walletAddress: true,
        displayName: true,
        avatarUrl: true,
        source: true,
        lastSeenAt: true,
        expiresAt: true,
      },
    }),
    prisma.venueCheckIn.findMany({
      where: {
        venueId,
        status: 'CONFIRMED',
        scannedAt: { gte: since },
      },
      orderBy: { scannedAt: 'desc' },
      take: 50,
      select: {
        id: true,
        walletAddress: true,
        tag: true,
        source: true,
        scannedAt: true,
        windowEndAt: true,
        metadataJson: true,
      },
    }),
  ]);

  const entries = new Map<
    string,
    {
      id: string;
      walletAddress: string;
      displayName: string;
      avatarUrl: string | null;
      source: string;
      lastSeenAt: Date;
      expiresAt: Date;
    }
  >();

  for (const presence of roomPresences) {
    entries.set(presence.walletAddress, presence);
  }

  const optedInCheckIns = publicCheckIns.filter((checkIn) => isPublicCheckIn(checkIn.metadataJson));
  const checkInActors = await Promise.all(
    optedInCheckIns.map(async (checkIn) => [checkIn.walletAddress, await getActor(checkIn.walletAddress)] as const)
  );
  const actorMap = new Map(checkInActors);

  for (const checkIn of optedInCheckIns) {
    if (entries.has(checkIn.walletAddress)) continue;
    const actor = actorMap.get(checkIn.walletAddress);

    entries.set(checkIn.walletAddress, {
      id: `checkin:${checkIn.id}`,
      walletAddress: checkIn.walletAddress,
      displayName: checkIn.tag?.trim() || actor?.displayName || shortWallet(checkIn.walletAddress),
      avatarUrl: actor?.avatarUrl ?? null,
      source: checkIn.source,
      lastSeenAt: checkIn.scannedAt,
      expiresAt: checkIn.windowEndAt && checkIn.windowEndAt > now ? checkIn.windowEndAt : addHours(checkIn.scannedAt, VENUE_ROOM_WHO_HERE_WINDOW_HOURS),
    });
  }

  return Array.from(entries.values())
    .sort((left, right) => right.lastSeenAt.getTime() - left.lastSeenAt.getTime())
    .slice(0, 12)
    .map((entry) => ({
      id: entry.id,
      walletLabel: shortWallet(entry.walletAddress),
      displayName: entry.displayName,
      avatarUrl: entry.avatarUrl,
      source: entry.source,
      lastSeenAt: entry.lastSeenAt.toISOString(),
      expiresAt: entry.expiresAt.toISOString(),
    }));
}

async function notifyVenueRoomMessage(input: {
  venueId: string;
  venueSlug: string;
  venueName: string;
  senderWallet: string;
  senderDisplayName: string;
  body: string;
  now: Date;
}) {
  const recipients = await prisma.venueRoomPresence.findMany({
    where: {
      venueId: input.venueId,
      visibility: 'PUBLIC',
      expiresAt: { gt: input.now },
      walletAddress: { not: input.senderWallet },
    },
    orderBy: { lastSeenAt: 'desc' },
    take: 16,
    select: {
      walletAddress: true,
    },
  });

  if (recipients.length === 0) return;

  const link = `/map?place=${encodeURIComponent(input.venueSlug)}&room=1`;
  await Promise.all(
    recipients.map((recipient) =>
      createWalletNotification({
        wallet: recipient.walletAddress,
        type: 'VENUE_ROOM_MESSAGE',
        title: `New signal at ${input.venueName}`,
        message: `${input.senderDisplayName}: ${trimNotificationBody(input.body)}`,
        link,
        pushTopic: 'venues',
      }).catch(() => null)
    )
  );
}

export async function getVenueRoomSnapshot(input: VenueRoomSnapshotInput) {
  const now = new Date();
  const walletAddress = normalizeWallet(input.walletAddress);
  const { venue, access } = await resolveVenueRoomAccess(input, now);

  if (!venue) {
    return null;
  }

  const viewerPresence = walletAddress
    ? await prisma.venueRoomPresence.findUnique({
        where: {
          venueId_walletAddress: {
            venueId: venue.id,
            walletAddress,
          },
        },
        select: {
          visibility: true,
          expiresAt: true,
        },
      })
    : null;

  if (!access.unlocked) {
    return {
      venue: {
        id: venue.id,
        slug: venue.slug,
        name: venue.name,
      },
      access,
      messages: [],
      whoHere: [],
      viewer: {
        visible: Boolean(viewerPresence?.visibility === 'PUBLIC' && viewerPresence.expiresAt > now),
      },
    };
  }

  const limit = Math.min(Math.max(input.limit ?? 20, 1), 40);
  const [messages, whoHere] = await Promise.all([
    prisma.venueRoomMessage.findMany({
      where: {
        venueId: venue.id,
        expiresAt: { gt: now },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: {
        id: true,
        walletAddress: true,
        displayName: true,
        avatarUrl: true,
        body: true,
        metadataJson: true,
        createdAt: true,
        expiresAt: true,
      },
    }),
    getWhoHere(venue.id, now),
  ]);

  return {
    venue: {
      id: venue.id,
      slug: venue.slug,
      name: venue.name,
    },
    access,
    messages: messages.reverse().map((message) => mapRoomMessage(message, walletAddress)),
    whoHere,
    viewer: {
      visible: Boolean(viewerPresence?.visibility === 'PUBLIC' && viewerPresence.expiresAt > now),
    },
  };
}

export async function postVenueRoomMessage(input: VenueRoomWriteInput) {
  const now = new Date();
  const walletAddress = normalizeWallet(input.walletAddress);
  const body = sanitizeRoomBody(input.body);

  if (!walletAddress) {
    throw new Error('Wallet required to post in this room.');
  }

  if (!body) {
    throw new Error('Message cannot be empty.');
  }

  const { venue, access } = await resolveVenueRoomAccess(input, now);
  if (!venue) {
    throw new Error('Venue not found.');
  }

  if (!access.unlocked) {
    const error = new Error(access.reason);
    error.name = 'ROOM_LOCKED';
    throw error;
  }

  const actor = await getActor(walletAddress);
  const messageExpiresAt = addHours(now, VENUE_ROOM_MESSAGE_TTL_HOURS);
  const presenceExpiresAt = addHours(now, VENUE_ROOM_WHO_HERE_WINDOW_HOURS);

  await prisma.$transaction(async (tx) => {
    await tx.venueRoomMessage.create({
      data: {
        venueId: venue.id,
        walletAddress,
        displayName: actor.displayName,
        avatarUrl: actor.avatarUrl,
        body,
        expiresAt: messageExpiresAt,
        metadataJson: {
          accessMode: access.mode,
          ttlHours: VENUE_ROOM_MESSAGE_TTL_HOURS,
        },
      },
    });

    if (input.showInWhoHere) {
      await tx.venueRoomPresence.upsert({
        where: {
          venueId_walletAddress: {
            venueId: venue.id,
            walletAddress,
          },
        },
        update: {
          displayName: actor.displayName,
          avatarUrl: actor.avatarUrl,
          visibility: 'PUBLIC',
          source: access.mode === 'check-in' ? 'CHECK_IN' : 'PROXIMITY',
          lastSeenAt: now,
          expiresAt: presenceExpiresAt,
          metadataJson: {
            accessMode: access.mode,
            ttlHours: VENUE_ROOM_WHO_HERE_WINDOW_HOURS,
          },
        },
        create: {
          venueId: venue.id,
          walletAddress,
          displayName: actor.displayName,
          avatarUrl: actor.avatarUrl,
          visibility: 'PUBLIC',
          source: access.mode === 'check-in' ? 'CHECK_IN' : 'PROXIMITY',
          lastSeenAt: now,
          expiresAt: presenceExpiresAt,
          metadataJson: {
            accessMode: access.mode,
            ttlHours: VENUE_ROOM_WHO_HERE_WINDOW_HOURS,
          },
        },
      });
    }
  });

  await notifyVenueRoomMessage({
    venueId: venue.id,
    venueSlug: venue.slug,
    venueName: venue.name,
    senderWallet: walletAddress,
    senderDisplayName: actor.displayName,
    body,
    now,
  });

  return getVenueRoomSnapshot({
    slug: venue.slug,
    walletAddress,
    latitude: input.latitude,
    longitude: input.longitude,
    limit: input.limit,
  });
}

export async function publishVenueRoomReceipt(input: VenueRoomReceiptInput) {
  const now = new Date();
  const body = sanitizeRoomBody(input.body);

  if (!body) return null;

  const venue = await prisma.venue.findUnique({
    where: { id: input.venueId },
    select: {
      id: true,
      slug: true,
      name: true,
      status: true,
    },
  });

  if (!venue || venue.status !== 'ACTIVE') return null;

  const displayName = input.actorLabel?.trim() || 'BaseDare';
  const walletAddress = normalizeWallet(input.actorWallet) ?? systemWalletForReceipt(input.receiptType);
  const expiresAt = addHours(now, VENUE_ROOM_MESSAGE_TTL_HOURS);

  const message = await prisma.venueRoomMessage.create({
    data: {
      venueId: venue.id,
      walletAddress,
      displayName,
      avatarUrl: null,
      body,
      expiresAt,
      metadataJson: {
        kind: 'receipt',
        receiptType: input.receiptType,
        sourceId: input.sourceId ?? null,
        href: input.href ?? `/map?place=${encodeURIComponent(venue.slug)}&room=1`,
        tone: input.tone ?? 'violet',
        ttlHours: VENUE_ROOM_MESSAGE_TTL_HOURS,
      },
    },
    select: {
      id: true,
    },
  });

  if (input.notify !== false) {
    await notifyVenueRoomMessage({
      venueId: venue.id,
      venueSlug: venue.slug,
      venueName: venue.name,
      senderWallet: walletAddress,
      senderDisplayName: 'BaseDare',
      body,
      now,
    });
  }

  return message;
}

export async function setVenueRoomPresence(input: VenueRoomPresenceInput) {
  const now = new Date();
  const walletAddress = normalizeWallet(input.walletAddress);

  if (!walletAddress) {
    throw new Error('Wallet required to update room visibility.');
  }

  const { venue, access } = await resolveVenueRoomAccess(input, now);
  if (!venue) {
    throw new Error('Venue not found.');
  }

  if (!input.visible) {
    await prisma.venueRoomPresence.updateMany({
      where: {
        venueId: venue.id,
        walletAddress,
      },
      data: {
        visibility: 'PRIVATE',
        lastSeenAt: now,
        expiresAt: now,
      },
    });

    return getVenueRoomSnapshot({
      slug: venue.slug,
      walletAddress,
      latitude: input.latitude,
      longitude: input.longitude,
      limit: input.limit,
    });
  }

  if (!access.unlocked) {
    const error = new Error(access.reason);
    error.name = 'ROOM_LOCKED';
    throw error;
  }

  const actor = await getActor(walletAddress);
  const expiresAt = addHours(now, VENUE_ROOM_WHO_HERE_WINDOW_HOURS);

  await prisma.venueRoomPresence.upsert({
    where: {
      venueId_walletAddress: {
        venueId: venue.id,
        walletAddress,
      },
    },
    update: {
      displayName: actor.displayName,
      avatarUrl: actor.avatarUrl,
      visibility: 'PUBLIC',
      source: access.mode === 'check-in' ? 'CHECK_IN' : 'PROXIMITY',
      lastSeenAt: now,
      expiresAt,
      metadataJson: {
        accessMode: access.mode,
        ttlHours: VENUE_ROOM_WHO_HERE_WINDOW_HOURS,
      },
    },
    create: {
      venueId: venue.id,
      walletAddress,
      displayName: actor.displayName,
      avatarUrl: actor.avatarUrl,
      visibility: 'PUBLIC',
      source: access.mode === 'check-in' ? 'CHECK_IN' : 'PROXIMITY',
      lastSeenAt: now,
      expiresAt,
      metadataJson: {
        accessMode: access.mode,
        ttlHours: VENUE_ROOM_WHO_HERE_WINDOW_HOURS,
      },
    },
  });

  return getVenueRoomSnapshot({
    slug: venue.slug,
    walletAddress,
    latitude: input.latitude,
    longitude: input.longitude,
    limit: input.limit,
  });
}
