import 'server-only';

import { getServerSession } from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';

import { authOptions } from '@/lib/auth-options';

type WalletSession = {
  walletAddress?: string | null;
  token?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

export type AdminAuthorization =
  | {
      authorized: true;
      via: 'admin-secret' | 'moderator-session' | 'dev-moderator-header';
      walletAddress: string;
    }
  | {
      authorized: false;
      reason: 'missing-secret' | 'invalid-secret' | 'missing-session' | 'not-moderator' | 'wallet-mismatch';
    };

function timingSafeEqualStrings(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function getModeratorWallets() {
  return (process.env.MODERATOR_WALLETS || '')
    .split(',')
    .map((wallet) => wallet.trim().toLowerCase())
    .filter(Boolean);
}

export function maskWallet(wallet: string | null | undefined) {
  if (!wallet) return null;
  return `${wallet.slice(0, 6)}...${wallet.slice(-4)}`;
}

function getSessionWallet(session: WalletSession | null): string | null {
  const wallet = session?.walletAddress ?? session?.user?.walletAddress ?? null;
  if (!wallet || !isAddress(wallet)) return null;
  return wallet.toLowerCase();
}

export async function authorizeAdminRequest(request: NextRequest): Promise<AdminAuthorization> {
  const adminSecret = process.env.ADMIN_SECRET;
  const secretCandidate = request.headers.get('x-admin-secret');
  const moderatorWallets = getModeratorWallets();

  if (secretCandidate) {
    if (!adminSecret || adminSecret.length < 32) {
      return { authorized: false, reason: 'missing-secret' };
    }

    if (timingSafeEqualStrings(secretCandidate, adminSecret)) {
      return {
        authorized: true,
        via: 'admin-secret',
        walletAddress: 'admin',
      };
    }

    return { authorized: false, reason: 'invalid-secret' };
  }

  const walletHeader = request.headers.get('x-moderator-wallet')?.toLowerCase() ?? null;
  const session = (await getServerSession(authOptions)) as WalletSession | null;
  const sessionWallet = getSessionWallet(session);

  // Local-only escape hatch keeps existing moderator workflows usable while
  // production requires either an admin secret or a signed wallet session.
  if (!sessionWallet && process.env.NODE_ENV !== 'production' && walletHeader && isAddress(walletHeader)) {
    if (moderatorWallets.includes(walletHeader)) {
      return {
        authorized: true,
        via: 'dev-moderator-header',
        walletAddress: walletHeader,
      };
    }
  }

  if (!sessionWallet) {
    return { authorized: false, reason: 'missing-session' };
  }

  if (walletHeader && walletHeader !== sessionWallet) {
    return { authorized: false, reason: 'wallet-mismatch' };
  }

  if (!moderatorWallets.includes(sessionWallet)) {
    return { authorized: false, reason: 'not-moderator' };
  }

  return {
    authorized: true,
    via: 'moderator-session',
    walletAddress: sessionWallet,
  };
}

export function unauthorizedAdminResponse(auth: AdminAuthorization) {
  const hint =
    auth.authorized
      ? undefined
      : auth.reason === 'wallet-mismatch'
        ? 'Signed session wallet does not match the moderator header.'
        : auth.reason === 'missing-session'
          ? 'Connect and sign in with a moderator wallet.'
          : 'Admin or moderator authorization required.';

  return NextResponse.json(
    {
      success: false,
      error: 'Unauthorized',
      code: auth.authorized ? 'AUTHORIZED' : auth.reason.toUpperCase().replace(/-/g, '_'),
      hint,
    },
    { status: 401 }
  );
}
