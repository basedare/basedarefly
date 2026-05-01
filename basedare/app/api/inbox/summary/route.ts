import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { prisma } from '@/lib/prisma';
import { getAuthorizedWalletForRequest } from '@/lib/wallet-action-auth-server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function normalizeWallet(value: string | null | undefined) {
  if (!value || !isAddress(value)) return null;
  return value.toLowerCase();
}

function walletLabel(wallet: string) {
  if (wallet === 'basedare-admin') return 'BaseDare Support';
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
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

export async function GET(request: NextRequest) {
  try {
    const wallet = normalizeWallet(request.nextUrl.searchParams.get('wallet'));

    if (!wallet) {
      return NextResponse.json({ success: false, error: 'Valid wallet required' }, { status: 400 });
    }

    const authorizedWallet = await getAuthorizedWalletForRequest(request, {
      walletAddress: wallet,
      action: 'inbox:read',
      resource: wallet,
    });

    if (!authorizedWallet) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const [threads, unreadTotal] = await Promise.all([
      prisma.inboxThread.findMany({
        where: {
          participantWallets: {
            has: wallet,
          },
          status: 'ACTIVE',
        },
        orderBy: [{ lastMessageAt: 'desc' }, { updatedAt: 'desc' }],
        take: 5,
        select: {
          id: true,
          type: true,
          subject: true,
          participantWallets: true,
          lastMessageAt: true,
          updatedAt: true,
          venue: {
            select: {
              name: true,
              slug: true,
            },
          },
          dare: {
            select: {
              title: true,
              shortId: true,
              id: true,
            },
          },
          campaign: {
            select: {
              title: true,
              id: true,
            },
          },
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
            select: {
              senderWallet: true,
              body: true,
              redacted: true,
              createdAt: true,
            },
          },
        },
      }),
      prisma.inboxMessage.count({
        where: {
          senderWallet: { not: wallet },
          NOT: {
            readByWallets: {
              has: wallet,
            },
          },
          thread: {
            participantWallets: {
              has: wallet,
            },
            status: 'ACTIVE',
          },
        },
      }),
    ]);

    const threadIds = threads.map((thread) => thread.id);
    const unreadCounts = await buildUnreadCountMap(wallet, threadIds);
    const mappedThreads = threads.map((thread) => {
      const counterpartWallets = thread.participantWallets.filter((participant) => participant !== wallet);
      const lastMessage = thread.messages[0] ?? null;
      const contextLabel =
        thread.venue?.name ||
        thread.campaign?.title ||
        thread.dare?.title ||
        thread.subject ||
        counterpartWallets.map(walletLabel).join(', ') ||
        'BaseDare thread';
      const unreadCount = unreadCounts.get(thread.id) ?? 0;

      return {
        id: thread.id,
        type: thread.type,
        subject: thread.subject || contextLabel,
        contextLabel,
        counterpartLabel: thread.type === 'SUPPORT'
          ? 'BaseDare Support'
          : counterpartWallets.map(walletLabel).join(', ') || 'BaseDare thread',
        unreadCount,
        href: `/chat?threadId=${thread.id}`,
        lastMessageAt: thread.lastMessageAt?.toISOString() ?? thread.updatedAt.toISOString(),
        lastMessage: lastMessage
          ? {
              body: lastMessage.body,
              redacted: lastMessage.redacted,
              mine: lastMessage.senderWallet === wallet,
              createdAt: lastMessage.createdAt.toISOString(),
            }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        unreadTotal,
        threadCount: mappedThreads.length,
        threads: mappedThreads,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[INBOX_SUMMARY] Fetch failed:', message);
    return NextResponse.json({ success: false, error: 'Failed to load inbox summary' }, { status: 500 });
  }
}
