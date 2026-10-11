'use client';

import { useQuery } from '@tanstack/react-query';
import { resolveCommunityIdentity, type CommunityIdentityCheckState, type CommunityIdentityTag } from '@/lib/community-identity';

/** Shared, wallet-keyed reads prevent an old account's name leaking across a switch. */
export function useBaretagIdentity(walletAddress?: string | null, resolving = false) {
  const wallet = walletAddress?.toLowerCase() ?? null;
  const query = useQuery({
    queryKey: ['baretag-identity', wallet],
    enabled: Boolean(wallet),
    staleTime: 15_000,
    retry: 1,
    queryFn: async ({ signal }) => {
      const response = await fetch(`/api/tags?wallet=${encodeURIComponent(wallet!)}`, { cache: 'no-store', signal });
      const payload = await response.json();
      if (!response.ok || !payload?.success || !Array.isArray(payload.tags)) throw new Error('Baretag lookup unavailable');
      return resolveCommunityIdentity(payload.tags as CommunityIdentityTag[]);
    },
  });
  const identity: CommunityIdentityCheckState = !wallet
    ? { status: resolving ? 'checking' : 'disconnected', tag: null }
    : query.data ?? { status: query.isPending ? 'checking' : 'unknown', tag: null };
  return { identity, retry: query.refetch, refreshing: query.isFetching };
}
