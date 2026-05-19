import 'server-only';

import { getServerSession } from 'next-auth';
import type { NextRequest } from 'next/server';

import { authOptions } from '@/lib/auth-options';
import { isInternalApiAuthorized } from '@/lib/api-auth';
import { authorizeAdminRequest } from '@/lib/admin-auth';
import type { BaseCashVenueLite } from '@/lib/basecash';

type BaseCashSession = {
  token?: string | null;
  walletAddress?: string | null;
  user?: {
    walletAddress?: string | null;
  } | null;
};

function getSessionWallet(session: BaseCashSession | null) {
  return (session?.walletAddress ?? session?.user?.walletAddress ?? '').trim().toLowerCase();
}

export type BaseCashVenueAuthorization =
  | {
      authorized: true;
      actor: string;
      via: 'internal' | 'admin' | 'venue-wallet';
    }
  | {
      authorized: false;
      error: string;
      status: number;
    };

export async function authorizeBaseCashVenueRequest(
  request: NextRequest,
  venue: Pick<BaseCashVenueLite, 'claimedBy'>
): Promise<BaseCashVenueAuthorization> {
  if (isInternalApiAuthorized(request)) {
    return { authorized: true, actor: 'internal', via: 'internal' };
  }

  const adminAuth = await authorizeAdminRequest(request);
  if (adminAuth.authorized) {
    return { authorized: true, actor: adminAuth.walletAddress, via: 'admin' };
  }

  const session = (await getServerSession(authOptions)) as BaseCashSession | null;
  if (!session) {
    return { authorized: false, error: 'Sign in required to manage BaseCash venue credits', status: 401 };
  }

  const sessionToken = session.token?.trim();
  const bearerToken = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '').trim();
  if (sessionToken && (!bearerToken || bearerToken !== sessionToken)) {
    return { authorized: false, error: 'Invalid session token', status: 401 };
  }

  const walletAddress = getSessionWallet(session);
  if (!walletAddress) {
    return { authorized: false, error: 'Wallet session is missing', status: 401 };
  }

  if (!venue.claimedBy || venue.claimedBy.toLowerCase() !== walletAddress) {
    return { authorized: false, error: 'Only the claimed venue wallet can manage BaseCash credits', status: 403 };
  }

  return { authorized: true, actor: walletAddress, via: 'venue-wallet' };
}
