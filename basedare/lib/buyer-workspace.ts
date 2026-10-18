import type { Brand, Campaign } from '@/app/brands/portal/activation-packages';

export type BuyerWorkspace = { kind: 'missing' } | { kind: 'ready'; brand: Brand; campaigns: Campaign[] };

/** Publish a snapshot only after both reads succeed for this wallet. */
export async function loadBuyerWorkspace(wallet: string, signal: AbortSignal, request: typeof fetch = fetch): Promise<BuyerWorkspace> {
  const brandResponse = await request('/api/brands?wallet=' + encodeURIComponent(wallet), { cache: 'no-store', signal });
  const brandBody = await brandResponse.json().catch(() => null);
  if (brandResponse.status === 404 && brandBody?.code === 'NOT_FOUND') return { kind: 'missing' };
  if (!brandResponse.ok || brandBody?.success !== true || typeof brandBody.data?.id !== 'string' || typeof brandBody.data.walletAddress !== 'string' || brandBody.data.walletAddress.toLowerCase() !== wallet.toLowerCase()) {
    throw new Error('Your buyer profile could not be loaded. Sign in with the correct account and retry.');
  }
  const campaignsResponse = await request('/api/campaigns?brand=' + encodeURIComponent(wallet), { cache: 'no-store', signal });
  const campaignsBody = await campaignsResponse.json().catch(() => null);
  if (!campaignsResponse.ok || campaignsBody?.success !== true || (!Array.isArray(campaignsBody.data) || !campaignsBody.data.every((row: unknown) => row && typeof row === 'object' && 'id' in row && typeof row.id === 'string' && 'status' in row && typeof row.status === 'string'))) {
    throw new Error('Your work could not be loaded. Retry to see its latest status.');
  }
  return { kind: 'ready', brand: brandBody.data, campaigns: campaignsBody.data };
}
