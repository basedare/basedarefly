import 'server-only';
import { NextRequest, NextResponse } from 'next/server';
import { isAddress } from 'viem';
import { isInternalApiAuthorized } from './api-auth';
import { getAuthorizedWalletForRequest } from './wallet-action-auth-server';

export const BUYER_PRIVATE_HEADERS = { 'Cache-Control': 'private, no-store, max-age=0' };
export const buyerJson = (body: unknown, status = 200) => NextResponse.json(body, { status, headers: BUYER_PRIVATE_HEADERS });
export function buyerWallet(value: unknown): string | null {
  return typeof value === 'string' && isAddress(value) ? value.toLowerCase() : null;
}

/** A query/header selects an account; only verified authority grants access. */
export async function authorizeBuyerWallet(request: NextRequest, hint?: string | null, action = 'buyer:read') {
  const wallet = buyerWallet(hint ?? request.headers.get('x-basedare-wallet'));
  if (!wallet) return null;
  if (isInternalApiAuthorized(request)) return wallet;
  return getAuthorizedWalletForRequest(request, {
    walletAddress: wallet, action, resource: wallet,
    // Private buyer records require their own short-lived purpose signature.
    allowWalletSession: false,
  });
}

export const creatorRoutingPaused = () => buyerJson({
  success: false, code: 'CREATOR_ROUTING_PAUSED',
  error: 'Legacy creator routing is paused. Use the linked mission for proof and review.',
}, 410);
