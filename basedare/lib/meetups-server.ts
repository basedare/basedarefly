import 'server-only';

import { NextRequest } from 'next/server';
import { getServerSession } from 'next-auth';
import { isAddress } from 'viem';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/prisma';
import { findPrimaryCreatorTagForWallet } from '@/lib/creator-tag-resolver';

type SessionShape = {
  token?: string;
  walletAddress?: string | null;
  user?: { walletAddress?: string | null } | null;
};

function extractWallet(session: SessionShape | null): string | null {
  const wallet = session?.walletAddress ?? session?.user?.walletAddress ?? null;
  if (!wallet || !isAddress(wallet)) return null;
  return wallet.toLowerCase();
}

/** Read-only viewer wallet — session-derived, NO bearer requirement (GET filters). */
export async function getViewerWallet(): Promise<string | null> {
  return extractWallet((await getServerSession(authOptions)) as SessionShape | null);
}

/** Mutation session wallet — verified against the bearer token (confused-deputy guard). */
export async function getSessionWallet(request: NextRequest): Promise<string | null> {
  const session = (await getServerSession(authOptions)) as SessionShape | null;
  if (!session) return null;
  const bearer = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (session.token && (!bearer || bearer !== session.token)) return null;
  return extractWallet(session);
}

/**
 * Resolve the session's OWNED primary claimed Baretag via the SHARED resolver
 * (so multi-tag wallets resolve to their canonical primary). Used as the mutation
 * ownership gate — never trusts a client-provided baretag id.
 */
export async function resolveSessionBaretag(
  request: NextRequest
): Promise<{ id: string; tag: string } | null> {
  const wallet = await getSessionWallet(request);
  if (!wallet) return null;
  const primary = await findPrimaryCreatorTagForWallet(wallet);
  return primary ? { id: primary.id, tag: primary.tag } : null;
}

/** Resolve the viewer's primary Baretag for read-only filters (no bearer needed). */
export async function resolveViewerBaretag(): Promise<{ id: string; tag: string } | null> {
  const wallet = await getViewerWallet();
  if (!wallet) return null;
  const primary = await findPrimaryCreatorTagForWallet(wallet);
  return primary ? { id: primary.id, tag: primary.tag } : null;
}

/** Baretag ids the viewer has blocked — their meetups are hidden from the viewer. */
export async function getBlockedBaretagIds(viewerBaretagId: string | null): Promise<string[]> {
  if (!viewerBaretagId) return [];
  const blocks = await prisma.meetupBlock.findMany({
    where: { blockerBaretagId: viewerBaretagId },
    select: { blockedBaretagId: true },
  });
  return blocks.map((b) => b.blockedBaretagId);
}

/** True when a StreamerTag id exists — target validation for report/block. */
export async function baretagExists(id: string): Promise<boolean> {
  const found = await prisma.streamerTag.findUnique({ where: { id }, select: { id: true } });
  return Boolean(found);
}
