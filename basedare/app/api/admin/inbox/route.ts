import { NextRequest, NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import { z } from 'zod';

import { authorizeAdminRequest, unauthorizedAdminResponse } from '@/lib/admin-auth';
import { getInboxApiError } from '@/lib/inbox-errors';
import { createWalletNotification } from '@/lib/notifications';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const ADMIN_INBOX_SENDER = 'basedare-admin';

const AdminInboxReplySchema = z.object({
  threadId: z.string().cuid(),
  body: z.string().min(1).max(1000),
});

const AdminInboxStatusSchema = z.object({
  threadId: z.string().cuid(),
  action: z.enum(['RESOLVE', 'REOPEN']),
});

type SupportThreadRecord = Awaited<ReturnType<typeof fetchSupportThreads>>[number];

function asMetadataRecord(metadata: Prisma.JsonValue | null | undefined) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return {};
  return { ...(metadata as Record<string, Prisma.JsonValue>) };
}

function readMetadataString(metadata: Prisma.JsonValue | null | undefined, key: string) {
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) return null;
  const value = (metadata as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function walletLabel(wallet: string) {
  if (wallet === ADMIN_INBOX_SENDER) return 'BaseDare Admin';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
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

async function fetchSupportThreads() {
  return prisma.inboxThread.findMany({
    where: {
      type: 'SUPPORT',
      status: 'ACTIVE',
    },
    orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
    take: 80,
    select: {
      id: true,
      subject: true,
      participantWallets: true,
      status: true,
      metadataJson: true,
      lastMessageAt: true,
      createdAt: true,
      updatedAt: true,
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

async function buildUnreadCountMap(threadIds: string[]) {
  if (threadIds.length === 0) return new Map<string, number>();

  const unreadMessages = await prisma.inboxMessage.findMany({
    where: {
      threadId: { in: threadIds },
      senderWallet: { not: ADMIN_INBOX_SENDER },
      NOT: {
        readByWallets: {
          has: ADMIN_INBOX_SENDER,
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

function mapSupportThread(thread: SupportThreadRecord, unreadCount: number) {
  const requesterWallet = thread.participantWallets[0] ?? 'unknown';
  const lastMessage = thread.messages[0] ?? null;
  const supportStatus = readMetadataString(thread.metadataJson, 'supportStatus') === 'RESOLVED' ? 'RESOLVED' : 'OPEN';
  const supportResolvedAt = readMetadataString(thread.metadataJson, 'supportResolvedAt');

  return {
    id: thread.id,
    subject: thread.subject || 'BaseDare Support',
    requesterWallet,
    participantWallets: thread.participantWallets,
    status: thread.status,
    supportStatus,
    supportResolvedAt,
    unreadCount,
    createdAt: thread.createdAt.toISOString(),
    updatedAt: thread.updatedAt.toISOString(),
    lastMessageAt: thread.lastMessageAt?.toISOString() ?? thread.updatedAt.toISOString(),
    lastMessage: lastMessage
      ? {
          id: lastMessage.id,
          senderWallet: lastMessage.senderWallet,
          senderLabel: walletLabel(lastMessage.senderWallet),
          body: lastMessage.body,
          redacted: lastMessage.redacted,
          fromAdmin: lastMessage.senderWallet === ADMIN_INBOX_SENDER,
          createdAt: lastMessage.createdAt.toISOString(),
        }
      : null,
  };
}

async function fetchMessages(threadId: string) {
  const messages = await prisma.inboxMessage.findMany({
    where: {
      threadId,
    },
    orderBy: {
      createdAt: 'asc',
    },
    take: 120,
    select: {
      id: true,
      senderWallet: true,
      body: true,
      redacted: true,
      readByWallets: true,
      createdAt: true,
    },
  });

  const unread = messages.filter(
    (message) =>
      message.senderWallet !== ADMIN_INBOX_SENDER &&
      !message.readByWallets.includes(ADMIN_INBOX_SENDER)
  );

  await Promise.all(
    unread.map((message) =>
      prisma.inboxMessage.update({
        where: { id: message.id },
        data: {
          readByWallets: {
            push: ADMIN_INBOX_SENDER,
          },
        },
      }).catch(() => null)
    )
  );

  return messages.map((message) => ({
    id: message.id,
    senderWallet: message.senderWallet,
    senderLabel: walletLabel(message.senderWallet),
    body: message.body,
    redacted: message.redacted,
    fromAdmin: message.senderWallet === ADMIN_INBOX_SENDER,
    createdAt: message.createdAt.toISOString(),
  }));
}

export async function GET(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    const requestedThreadId = request.nextUrl.searchParams.get('threadId');
    const threads = await fetchSupportThreads();
    const threadIds = threads.map((thread) => thread.id);
    const selectedThread = requestedThreadId
      ? threads.find((thread) => thread.id === requestedThreadId) ??
        await prisma.inboxThread.findFirst({
          where: {
            id: requestedThreadId,
            type: 'SUPPORT',
            status: 'ACTIVE',
          },
          select: {
            id: true,
            subject: true,
            participantWallets: true,
            status: true,
            metadataJson: true,
            lastMessageAt: true,
            createdAt: true,
            updatedAt: true,
            messages: {
              orderBy: { createdAt: 'desc' },
              take: 1,
              select: { id: true, senderWallet: true, body: true, redacted: true, createdAt: true },
            },
          },
        })
      : threads[0] ?? null;
    const unreadCounts = await buildUnreadCountMap(
      selectedThread && !threadIds.includes(selectedThread.id) ? [...threadIds, selectedThread.id] : threadIds
    );
    const mappedThreads = threads.map((thread) => mapSupportThread(thread, unreadCounts.get(thread.id) ?? 0));
    const activeThread = selectedThread ? mapSupportThread(selectedThread, unreadCounts.get(selectedThread.id) ?? 0) : null;
    const messages = selectedThread ? await fetchMessages(selectedThread.id) : [];

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
    console.error('[ADMIN_INBOX] Fetch failed:', message);
    const apiError = getInboxApiError(error, 'Failed to load admin inbox');
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}

export async function PATCH(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    const body = await request.json();
    const parsed = AdminInboxStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid support action' },
        { status: 400 }
      );
    }

    const thread = await prisma.inboxThread.findFirst({
      where: {
        id: parsed.data.threadId,
        type: 'SUPPORT',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        subject: true,
        participantWallets: true,
        metadataJson: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ success: false, error: 'Support thread not found' }, { status: 404 });
    }

    const now = new Date();
    const nextResolved = parsed.data.action === 'RESOLVE';
    const nextStatus = nextResolved ? 'RESOLVED' : 'OPEN';
    const currentStatus = readMetadataString(thread.metadataJson, 'supportStatus') === 'RESOLVED' ? 'RESOLVED' : 'OPEN';

    if (currentStatus !== nextStatus) {
      const metadata = asMetadataRecord(thread.metadataJson);
      metadata.supportStatus = nextStatus;

      if (nextResolved) {
        metadata.supportResolvedAt = now.toISOString();
        metadata.supportResolvedBy = ADMIN_INBOX_SENDER;
      } else {
        metadata.supportResolvedAt = null;
        metadata.supportReopenedAt = now.toISOString();
        metadata.supportReopenedBy = ADMIN_INBOX_SENDER;
      }

      const statusMessage = nextResolved
        ? 'BaseDare Support marked this thread handled. Reply here if you need it reopened.'
        : 'BaseDare Support reopened this thread.';

      await prisma.$transaction([
        prisma.inboxThread.update({
          where: { id: thread.id },
          data: {
            metadataJson: metadata as Prisma.InputJsonObject,
            lastMessageAt: now,
          },
        }),
        prisma.inboxMessage.create({
          data: {
            threadId: thread.id,
            senderWallet: ADMIN_INBOX_SENDER,
            body: statusMessage,
            readByWallets: [ADMIN_INBOX_SENDER],
            metadataJson: {
              supportQueue: 'ADMIN',
              supportStatus: nextStatus,
              adminVia: auth.via,
            },
          },
        }),
      ]);

      await Promise.all(
        thread.participantWallets.map((wallet) =>
          createWalletNotification({
            wallet,
            type: 'SUPPORT_MESSAGE',
            title: nextResolved ? 'Support Thread Handled' : 'Support Thread Reopened',
            message: statusMessage,
            link: `/chat?threadId=${thread.id}`,
            pushTopic: 'wallet',
          }).catch(() => null)
        )
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        threadId: thread.id,
        supportStatus: nextStatus,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_INBOX] Status update failed:', message);
    const apiError = getInboxApiError(error, 'Failed to update support thread');
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}

export async function POST(request: NextRequest) {
  const auth = await authorizeAdminRequest(request);
  if (!auth.authorized) return unauthorizedAdminResponse(auth);

  try {
    const body = await request.json();
    const parsed = AdminInboxReplySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message ?? 'Invalid admin reply' },
        { status: 400 }
      );
    }

    const thread = await prisma.inboxThread.findFirst({
      where: {
        id: parsed.data.threadId,
        type: 'SUPPORT',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        subject: true,
        participantWallets: true,
      },
    });

    if (!thread) {
      return NextResponse.json({ success: false, error: 'Support thread not found' }, { status: 404 });
    }

    const sanitized = sanitizeMessageBody(parsed.data.body);
    if (!sanitized.body || sanitized.body === '[blocked email]' || sanitized.body === '[blocked phone]') {
      return NextResponse.json({ success: false, error: 'Reply cannot be empty or only contact details.' }, { status: 400 });
    }

    const createdAt = new Date();
    const message = await prisma.inboxMessage.create({
      data: {
        threadId: thread.id,
        senderWallet: ADMIN_INBOX_SENDER,
        body: sanitized.body,
        redacted: sanitized.redacted,
        readByWallets: [ADMIN_INBOX_SENDER],
        metadataJson: {
          supportQueue: 'ADMIN',
          adminVia: auth.via,
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

    await prisma.inboxThread.update({
      where: { id: thread.id },
      data: {
        lastMessageAt: createdAt,
      },
    });

    await Promise.all(
      thread.participantWallets.map((wallet) =>
        createWalletNotification({
          wallet,
          type: 'SUPPORT_MESSAGE',
          title: 'BaseDare Support Replied',
          message: sanitized.body.slice(0, 110),
          link: `/chat?threadId=${thread.id}`,
          pushTopic: 'wallet',
        }).catch(() => null)
      )
    );

    return NextResponse.json({
      success: true,
      data: {
        threadId: thread.id,
        message: {
          id: message.id,
          senderWallet: message.senderWallet,
          senderLabel: walletLabel(message.senderWallet),
          body: message.body,
          redacted: message.redacted,
          fromAdmin: true,
          createdAt: message.createdAt.toISOString(),
        },
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[ADMIN_INBOX] Reply failed:', message);
    const apiError = getInboxApiError(error, 'Failed to send admin reply');
    return NextResponse.json(apiError.body, { status: apiError.status });
  }
}
