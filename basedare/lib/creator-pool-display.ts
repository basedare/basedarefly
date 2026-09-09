type PoolStat = { amount: number; count: number };
export type CreatorPoolSummary = {
  liveDares: PoolStat;
  venueActivations: PoolStat;
  paidOut: PoolStat;
  updatedAt: string;
};

function isPoolStat(value: unknown): value is PoolStat {
  if (!value || typeof value !== 'object') return false;
  const stat = value as Record<string, unknown>;
  return typeof stat.amount === 'number' && Number.isFinite(stat.amount) && stat.amount >= 0
    && typeof stat.count === 'number' && Number.isSafeInteger(stat.count) && stat.count >= 0;
}

/** API fallback zeroes mean unavailable, not a measured zero. Never combine budgets and past payouts. */
export function readCreatorPoolSummary(payload: unknown, source: string | null): CreatorPoolSummary | null {
  if (!payload || typeof payload !== 'object' || source === 'fallback') return null;
  const response = payload as { success?: boolean; data?: { fallbackReason?: unknown; creatorPool?: unknown } };
  if (!response.success || !response.data || 'fallbackReason' in response.data) return null;
  const value = response.data.creatorPool;
  if (!value || typeof value !== 'object') return null;
  const pool = value as Record<string, unknown>;
  if (!isPoolStat(pool.liveDares) || !isPoolStat(pool.venueActivations) || !isPoolStat(pool.paidOut)
    || typeof pool.updatedAt !== 'string' || !Number.isFinite(Date.parse(pool.updatedAt))) return null;
  return { liveDares: pool.liveDares, venueActivations: pool.venueActivations, paidOut: pool.paidOut, updatedAt: pool.updatedAt };
}
