import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { isAddress } from 'viem';
import { z } from 'zod';

import { createWalletNotification } from '@/lib/notifications';
import { getInboxApiError } from '@/lib/inbox-errors';
import { prisma } from '@/lib/prisma';
import { alertInboxSupportMessage } from '@/lib/telegram';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const SendMessageSchema = z.object({
  wallet: z.string().min(1),
  threadId: z.string().cuid().optional(),
  recipientWallet: z.string().optional(),
  recipientTag: z.string().max(120).optional(),
  venueSlug: z.string().max(160).optional(),
  dareId: z.string().max(120).optional(),
  campaignId: z.string().cuid().optional(),
  support: z.boolean().optional(),
  subject: z.string().max(180).optional(),
  body: z.string().min(1).max(1000),
});

type InboxThreadRecord = Awaited<ReturnType<typeof fetchThreadsForWallet>>[number];

function readMetadataString(metadata: Prisma.JsonValue | null | undefined, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function asMetadataRecord(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return { ...(metadata as Record<string, Prisma.JsonValue>) };
}

function normalizeWallet(value: string | null | undefined) {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

function normalizeTag(value: string | null | undefined) {
  const clean = value?.trim().replace(/^@/, '').toLowerCase();
  return clean || null;
}

function sanitizeMessageBody(value: string) {
  let body = value.replace(/\s+/g, ' ').trim();
  let redacted = false;

  const replacements: Array<[RegExp, string]> = [
    [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[blocked email]'],
    [/(?:\+?\d[\d\s().-]{7,}\d)/g, '[blocked phone]'],
    [/\b(?:https?:\/\/)?(?:t\.me|telegram\.me|wa\.me)\/[^\s]+/gi, '[blocked contact link]'],
  ];

  for (const [pattern, replacement] of replacements) {
    if (pattern.test(body)) {
      redacted = true;
      body = body.replace(pattern, replacement);
    }
  }

  return {
    body: body.slice(0, 1000),
    redacted,
  };
}

function walletLabel(wallet: string) {
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

async function authorizeInboxRequest(request: NextRequest, wallet: string, action: 'inbox:read' | 'inbox:write', resource: string) {
  return getAuthorizedWalletForRequest(request, {
    walletAddress: wallet,
    action,
    resource,
  });
}

async function fetchThreadsForWallet(wallet: string) {
  return prisma.inboxThread.findMany({
    where: {
      participantWallets: {
        has: wallet,
      },
      status: 'ACTIVE',
    },
    orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    take: 60,
    select: {
      id: true,
      type: true,
      subject: true,
      participantWallets: true,
      createdByWallet: true,
      status: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
      venueId: true,
      dareId: true,
      campaignId: true,
      metadataJson: true,
      messages: {
        orderBy: {
          createdAt: 'desc',
        },
        take: 1,
        select: {
          id: true,
          senderWallet: true,
          body: true,
          redacted: true,
          createdAt: true,
        },
      },
    },
  });
}

async function buildUnreadCountMap(wallet: string, threadIds: string[]) {
  if (threadIds.length === 0) return new Map<string, number>();

  const unreadMessages = await prisma.inboxMessage.findMany({
    where: {
      threadId: { in: threadIds },
      senderWallet: { not: wallet },
      NOT: {
        readByWallets: {
          has: wallet,
        },
      },
    },
    select: {
      threadId: true,
    },
  });

  return unreadMessages.reduce((acc, message) => {
    acc.set(message.threadId, (acc.get(message.threadId) ?? 0) + 1);
    return acc;
  }, new Map<string, number>());
}

function mapThread(thread: InboxThreadRecord, wallet: string, unreadCount: number) {
  const counterpartWallets = thread.participantWallets.filter((participant) => participant !== wallet);
  const lastMessage = thread.messages[0] ?? null;
  const venueSlug = readMetadataString(thread.metadataJson, 'venueSlug');
  const venueName = readMetadataString(thread.metadataJson, 'venueName');
  const dareShortId = readMetadataString(thread.metadataJson, 'dareShortId');
  const dareTitle = readMetadataString(thread.metadataJson, 'dareTitle');
  const campaignTitle = readMetadataString(thread.metadataJson, 'campaignTitle');
  const contextLabel =
    venueName ||
    campaignTitle ||
    dareTitle ||
    thread.subject ||
    counterpartWallets.map(walletLabel).join(', ') ||
    'BaseDare thread';

  return {
    id: thread.id,
    type: thread.type,
    subject: thread.subject || contextLabel,
    counterpartWallets,
    participantWallets: thread.participantWallets,
    unreadCount,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    lastMessageAt: thread.lastMessageAt?.toISOString() ?? thread.updatedAt.toISOString(),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderWallet: lastMessage.senderWallet,
          body: lastMessage.body,
          redacted: lastMessage.redacted,
          mine: lastMessage.senderWallet === wallet,
          createdAt: lastMessage.createdAt.toISOString(),
        }
      : null,
    context: {
      label: contextLabel,
      venue: venueSlug
        ? {
            slug: venueSlug,
            name: venueName ?? contextLabel,
            city: null,
            country: null,
            href: `/venues/${venueSlug}`,
          }
        : null,
      dare: thread.dareId
        ? {
            id: thread.dareId,
            shortId: dareShortId ?? null,
            title: dareTitle ?? contextLabel,
            status: 'ACTIVE',
            href: `/dare/${dareShortId || thread.dareId}`,
          }
        : null,
      campaign: thread.campaignId
        ? {
            id: thread.campaignId,
            title: campaignTitle ?? contextLabel,
            status: 'ACTIVE',
            href: `/brands/portal?campaign=${encodeURIComponent(thread.campaignId)}`,
          }
        : null,
    },
  };
}

async function resolveRecipient(input: {
  senderWallet: string;
  recipientWallet?: string;
  recipientTag?: string;
  venueSlug?: string;
  dareId?: string;
  campaignId?: string;
  support?: boolean;
}) {
  let recipientWallet = normalizeWallet(input.recipientWallet);
  let recipientTag = normalizeTag(input.recipientTag);

  if (input.support) {
    return {
      recipientWallet: 'basedare-admin',
      recipientTag: 'BaseDare Support',
      venue: null,
      dare: null,
      campaign: null,
    };
  }

  const [venue, dare, campaign, taggedCreator] = await Promise.all([
    input.venueSlug
      ? prisma.venue.findUnique({
          where: { slug: input.venueSlug },
          select: {
            id: true,
            slug: true,
            name: true,
            claimedBy: true,
            claimRequestWallet: true,
          },
        })
      : Promise.resolve(null),
    input.dareId
      ? prisma.dare.findFirst({
          where: {
            OR: [{ id: input.dareId }, { shortId: input.dareId }],
          },
          select: {
            id: true,
            shortId: true,
            title: true,
            stakerAddress: true,
            targetWalletAddress: true,
          },
        })
      : Promise.resolve(null),
    input.campaignId
      ? prisma.campaign.findUnique({
          where: { id: input.campaignId },
          select: {
            id: true,
            title: true,
            brand: {
              select: {
                walletAddress: true,
              },
            },
            slots: {
              orderBy: { updatedAt: 'desc' },
              take: 1,
              select: {
                creatorAddress: true,
                creatorHandle: true,
              },
            },
          },
        })
      : Promise.resolve(null),
    recipientTag
      ? prisma.streamerTag.findFirst({
          where: {
            OR: [
              { tag: { equals: `@${recipientTag}`, mode: 'insensitive' } },
              { tag: { equals: recipientTag, mode: 'insensitive' } },
              { twitterHandle: { equals: recipientTag, mode: 'insensitive' } },
              { twitchHandle: { equals: recipientTag, mode: 'insensitive' } },
              { youtubeHandle: { equals: recipientTag, mode: 'insensitive' } },
              { kickHandle: { equals: recipientTag, mode: 'insensitive' } },
            ],
            status: { in: ['ACTIVE', 'VERIFIED'] },
          },
          select: {
            tag: true,
            walletAddress: true,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!recipientWallet && taggedCreator?.walletAddress) {
    recipientWallet = normalizeWallet(taggedCreator.walletAddress);
    recipientTag = taggedCreator.tag;
  }

  if (!recipientWallet && venue) {
    recipientWallet = normalizeWallet(venue.claimedBy) ?? normalizeWallet(venue.claimRequestWallet);
  }

  if (!recipientWallet && dare) {
    const target = normalizeWallet(dare.targetWalletAddress);
    const staker = normalizeWallet(dare.stakerAddress);
    recipientWallet = target && target !== input.senderWallet ? target : staker;
  }

  if (!recipientWallet && campaign) {
    const brandWallet = normalizeWallet(campaign.brand.walletAddress);
    const creatorWallet = normalizeWallet(campaign.slots[0]?.creatorAddress);
    recipientWallet = brandWallet && brandWallet !== input.senderWallet ? brandWallet : creatorWallet;
    recipientTag = recipientTag ?? campaign.slots[0]?.creatorHandle ?? null;
  }

  return {
    recipientWallet,
    recipientTag: recipientTag ?? taggedCreator?.tag ?? campaign?.slots[0]?.creatorHandle ?? null,
    venue,
    dare,
    campaign,
  };
}

async function fetchActiveMessages(threadId: string, wallet: string) {
  const messages = await prisma.inboxMessage.findMany({
    where: {
      threadId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 100,
    select: {
      id: true,
      senderWallet: true,
      body: true,
      redacted: true,
      readByWallets: true,
      createdAt: true,
    },
  });

  const unread = messages.filter((message) => message.senderWallet !== wallet && !message.readByWallets.includes(wallet));
  await Promise.all(
    unread.map((message) =>
      prisma.inboxMessage.update({
        where: { id: message.id },
        data: {
          readByWallets: {
            push: wallet,
          },
        },
      }).catch(() => null)
    )
  );

  return messages.map((message) => ({
    id: message.id,
    senderWallet: message.senderWallet,
    body: message.body,
    redacted: message.redacted,
    mine: message.senderWallet === wallet,
    createdAt: message.createdAt.toISOString(),
  }));
}

export async function GET(request: NextRequest) {
  try {
    const wallet = normalizeWallet(request.nextUrl.searchParams.get('wallet'));
    const requestedThreadId = request.nextUrl.searchParams.get('threadId');

    if (!wallet) {
      return NextResponse.json({ success: false, error: 'Valid wallet required' }, { status: 400 });
    }

    const authorizedWallet = await authorizeInboxRequest(request, wallet, 'inbox:read', wallet);
    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const threads = await fetchThreadsForWallet(wallet);
    const threadIds = threads.map((thread) => thread.id);
    const selectedThread =
      requestedThreadId
        ? threads.find((thread) => thread.id === requestedThreadId) ??
          await prisma.inboxThread.findFirst({
            where: {
              id: requestedThreadId,
              participantWallets: { has: wallet },
              status: 'ACTIVE',
            },
            select: {
              id: true,
              type: true,
              subject: true,
              participantWallets: true,
              createdByWallet: true,
              status: true,
              lastMessageAt: true,
              createdAt: true,
              updatedAt: true,
              venueId: true,
              dareId: true,
              campaignId: true,
              metadataJson: true,
              messages: {
                orderBy: { createdAt: 'desc' },
                take: 1,
                select: { id: true, senderWallet: true, body: true, redacted: true, createdAt: true },
              },
            },
          })
        : threads[0] ?? null;
    const unreadCounts = await buildUnreadCountMap(wallet, selectedThread && !threadIds.includes(selectedThread.id) ? [...threadIds, selectedThread.id] : threadIds);
    const mappedThreads = threads.map((thread) => mapThread(thread, wallet, unreadCounts.get(thread.id) ?? 0));
    const activeThread =
      selectedThread
        ? mapThread(selectedThread, wallet, unreadCounts.get(selectedThread.id) ?? 0)
        : null;
    const messages = selectedThread ? await fetchActiveMessages(selectedThread.id, wallet) : [];

    return NextResponse.json({
      success: true,
      data: {
        threads: activeThread && !mappedThreads.some((thread) => thread.id === activeThread.id)
          ? [activeThread, ...mappedThreads]
          : mappedThreads,
        activeThread,
        messages,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[INBOX] Fetch failed:', message);
    const apiError = getInboxApiError(error, 'Failed to load inbox');
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = SendMessageSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid message' },
        { status: 400 }
      );
    }

    const input = parsed.data;
    const senderWallet = normalizeWallet(input.wallet);
    if (!senderWallet) {
      return NextResponse.json({ success: false, error: 'Valid wallet required' }, { status: 400 });
    }

    const authResource = input.threadId ?? senderWallet;
    const authorizedWallet = await authorizeInboxRequest(request, senderWallet, 'inbox:write', authResource);
    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const sanitized = sanitizeMessageBody(input.body);
    if (!sanitized.body || sanitized.body === '[blocked email]' || sanitized.body === '[blocked phone]') {
      return NextResponse.json({ success: false, error: 'Message cannot be empty or only contact details.' }, { status: 400 });
    }

    let thread = input.threadId
      ? await prisma.inboxThread.findFirst({
          where: {
            id: input.threadId,
            participantWallets: { has: senderWallet },
            status: 'ACTIVE',
          },
          select: {
            id: true,
            type: true,
            subject: true,
            participantWallets: true,
            metadataJson: true,
          },
        })
      : null;

    let recipientWallets = thread?.participantWallets.filter((wallet) => wallet !== senderWallet) ?? [];

    if (!thread) {
      const resolved = await resolveRecipient({
        senderWallet,
        recipientWallet: input.recipientWallet,
        recipientTag: input.recipientTag,
        venueSlug: input.venueSlug,
        dareId: input.dareId,
        campaignId: input.campaignId,
        support: input.support,
      });

      if ((!resolved.recipientWallet || resolved.recipientWallet === senderWallet) && !input.support) {
        return NextResponse.json(
          { success: false, error: 'A different creator, venue owner, brand, or wallet is required.' },
          { status: 400 }
        );
      }

      const participants = input.support
        ? [senderWallet]
        : Array.from(new Set([senderWallet, resolved.recipientWallet].filter(Boolean) as string[])).sort();
      const subject =
        input.subject?.trim() ||
        (input.support ? 'BaseDare Support' : null) ||
        resolved.venue?.name ||
        resolved.campaign?.title ||
        resolved.dare?.title ||
        `BaseDare inbox with ${walletLabel(resolved.recipientWallet ?? 'basedare-admin')}`;

      const existingThread = await prisma.inboxThread.findFirst({
        where: {
          status: 'ACTIVE',
          type: input.support ? 'SUPPORT' : undefined,
          participantWallets: { has: senderWallet },
          AND: input.support
            ? []
            : [
                { participantWallets: { has: resolved.recipientWallet } },
                { venueId: resolved.venue?.id ?? null },
                { dareId: resolved.dare?.id ?? null },
                { campaignId: resolved.campaign?.id ?? null },
              ],
        },
        select: {
          id: true,
          type: true,
          subject: true,
          participantWallets: true,
          metadataJson: true,
        },
      });

      thread = existingThread ?? await prisma.inboxThread.create({
        data: {
          type: input.support ? 'SUPPORT' : resolved.venue ? 'VENUE' : resolved.campaign ? 'CAMPAIGN' : resolved.dare ? 'DARE' : 'DIRECT',
          subject,
          participantWallets: participants,
          createdByWallet: senderWallet,
          venueId: resolved.venue?.id ?? null,
          dareId: resolved.dare?.id ?? null,
          campaignId: resolved.campaign?.id ?? null,
          metadataJson: {
            recipientTag: resolved.recipientTag ?? null,
            supportQueue: input.support ? 'ADMIN' : null,
            supportStatus: input.support ? 'OPEN' : null,
            redactionPolicy: 'contact_block_v1',
            venueSlug: resolved.venue?.slug ?? input.venueSlug ?? null,
            venueName: resolved.venue?.name ?? null,
            dareShortId: resolved.dare?.shortId ?? null,
            dareTitle: resolved.dare?.title ?? null,
            campaignTitle: resolved.campaign?.title ?? null,
          } satisfies Prisma.InputJsonValue,
        },
        select: {
          id: true,
          type: true,
          subject: true,
          participantWallets: true,
          metadataJson: true,
        },
      });

      recipientWallets = thread.participantWallets.filter((wallet) => wallet !== senderWallet);
    }

    const isSupportThread = thread.type === 'SUPPORT' || readMetadataString(thread.metadataJson, 'supportQueue') === 'ADMIN';
    const shouldReopenSupport =
      isSupportThread && readMetadataString(thread.metadataJson, 'supportStatus') === 'RESOLVED';
    const createdAt = new Date();
    const message = await prisma.inboxMessage.create({
      data: {
        threadId: thread.id,
        senderWallet,
        body: sanitized.body,
        redacted: sanitized.redacted,
        readByWallets: [senderWallet],
        metadataJson: {
          redactionPolicy: 'contact_block_v1',
        },
      },
      select: {
        id: true,
        senderWallet: true,
        body: true,
        redacted: true,
        createdAt: true,
      },
    });

    const threadUpdateData: Prisma.InboxThreadUpdateInput = {
      lastMessageAt: createdAt,
    };

    if (shouldReopenSupport) {
      const metadata = asMetadataRecord(thread.metadataJson);
      metadata.supportStatus = 'OPEN';
      metadata.supportResolvedAt = null;
      metadata.supportReopenedAt = createdAt.toISOString();
      metadata.supportReopenedBy = senderWallet;
      threadUpdateData.metadataJson = metadata as Prisma.InputJsonObject;
    }

    await prisma.inboxThread.update({
      where: { id: thread.id },
      data: threadUpdateData,
    });

    const contextLabel = thread.subject || 'BaseDare inbox';
    await Promise.all(
      recipientWallets.map((wallet) =>
        createWalletNotification({
          wallet,
          type: 'INBOX_MESSAGE',
          title: 'New BaseDare Message',
          message: `${walletLabel(senderWallet)} sent a message in ${contextLabel}: ${sanitized.body.slice(0, 90)}`,
          link: `/chat?threadId=${thread.id}`,
          pushTopic: 'wallet',
        }).catch(() => null)
      )
    );

    if (isSupportThread) {
      await alertInboxSupportMessage({
        threadId: thread.id,
        senderWallet,
        subject: thread.subject,
        body: sanitized.body,
        redacted: sanitized.redacted,
      }).catch((error) => {
        const message = error instanceof Error ? error.message : 'Unknown Telegram alert error';
        console.error('[INBOX] Support alert failed:', message);
        return false;
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        threadId: thread.id,
        message: {
          id: message.id,
          senderWallet: message.senderWallet,
          body: message.body,
          redacted: message.redacted,
          mine: true,
          createdAt: message.createdAt.toISOString(),
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[INBOX] Send failed:', message);
    const apiError = getInboxApiError(error, 'Failed to send message');
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
