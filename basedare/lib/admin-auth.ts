import 'server-only';

import { createHmac } from 'node:crypto';
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
      via: 'admin-secret' | 'admin-session' | 'moderator-session' | 'dev-moderator-header';
      walletAddress: string;
    }
  | {
      authorized: false;
      reason: 'missing-secret' | 'invalid-secret' | 'missing-session' | 'not-moderator' | 'wallet-mismatch';
    };

export const ADMIN_SESSION_COOKIE_NAME = 'bd_admin_session';
export const ADMIN_SESSION_TTL_SECONDS = 4 * 60 * 60;

type AdminSessionPayload = {
  v: 1;
  sub: 'admin';
  iat: number;
  exp: number;
};

function timingSafeEqualStrings(left: string, right: string): boolean {
  if (left.length !== right.length) return false;

  let mismatch = 0;
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return mismatch === 0;
}

function getAdminSecret() {
  const adminSecret = process.env.ADMIN_SECRET;
  if (!adminSecret || adminSecret.length < 32) return null;
  return adminSecret;
}

function getAdminSessionSigningSecret() {
  const signingSecret = process.env.ADMIN_SESSION_SECRET || process.env.INTERNAL_API_SECRET || process.env.ADMIN_SECRET;
  if (!signingSecret || signingSecret.length < 32) return null;
  return signingSecret;
}

function signAdminSessionPayload(encodedPayload: string) {
  const signingSecret = getAdminSessionSigningSecret();
  if (!signingSecret) return null;

  return createHmac('sha256', signingSecret).update(encodedPayload).digest('base64url');
}

export function isValidAdminSecretCandidate(candidate: string | null | undefined) {
  const adminSecret = getAdminSecret();
  if (!adminSecret || !candidate) return false;
  return timingSafeEqualStrings(candidate, adminSecret);
}

export function createAdminSessionCookieValue() {
  const now = Math.floor(Date.now() / 1000);
  const payload: AdminSessionPayload = {
    v: 1,
    sub: 'admin',
    iat: now,
    exp: now + ADMIN_SESSION_TTL_SECONDS,
  };
  const encodedPayload = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = signAdminSessionPayload(encodedPayload);
  if (!signature) return null;

  return `${encodedPayload}.${signature}`;
}

function verifyAdminSessionCookieValue(value: string | null | undefined) {
  if (!value) return false;

  const [encodedPayload, signature, extra] = value.split('.');
  if (!encodedPayload || !signature || extra !== undefined) return false;

  const expectedSignature = signAdminSessionPayload(encodedPayload);
  if (!expectedSignature || !timingSafeEqualStrings(signature, expectedSignature)) return false;

  try {
    const payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8')) as Partial<AdminSessionPayload>;
    const now = Math.floor(Date.now() / 1000);
    return payload.v === 1 && payload.sub === 'admin' && typeof payload.exp === 'number' && payload.exp > now;
  } catch {
    return false;
  }
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
  const secretCandidate = request.headers.get('x-admin-secret');
  const moderatorWallets = getModeratorWallets();

  if (secretCandidate) {
    if (!getAdminSecret()) {
      return { authorized: false, reason: 'missing-secret' };
    }

    if (isValidAdminSecretCandidate(secretCandidate)) {
      return {
        authorized: true,
        via: 'admin-secret',
        walletAddress: 'admin',
      };
    }

    return { authorized: false, reason: 'invalid-secret' };
  }

  if (verifyAdminSessionCookieValue(request.cookies.get(ADMIN_SESSION_COOKIE_NAME)?.value)) {
    return {
      authorized: true,
      via: 'admin-session',
      walletAddress: 'admin',
    };
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
