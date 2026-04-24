'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, BellRing, Loader2 } from 'lucide-react';

import SquircleButton from '@/components/ui/SquircleButton';
import { useWallet } from '@/context/WalletContext';

type ActionCenterCategory =
  | 'Needs response'
  | 'Ready for proof'
  | 'Under review'
  | 'Payout queued'
  | 'Paid'
  | 'Claim decision'
  | 'Venue lead follow-up';

type ActionCenterRole = 'creator' | 'funder' | 'ops' | 'system';

type ActionCenterItem = {
  id: string;
  category: ActionCenterCategory;
  title: string;
  detail: string;
  cta: string;
  href: string;
  priority: number;
  role: ActionCenterRole;
  statusLabel?: string | null;
  locationLabel?: string | null;
  bounty?: number | null;
  createdAt?: string | null;
};

type ActionCenterSummary = {
  total: number;
  counts: Record<ActionCenterCategory, number>;
};

const categoryOrder: ActionCenterCategory[] = [
  'Needs response',
  'Ready for proof',
  'Under review',
  'Payout queued',
  'Claim decision',
  'Venue lead follow-up',
  'Paid',
];

const categoryTone: Record<ActionCenterCategory, string> = {
  'Needs response': 'border-fuchsia-300/20 bg-fuchsia-500/[0.08] text-fuchsia-100',
  'Ready for proof': 'border-yellow-300/20 bg-yellow-500/[0.08] text-yellow-100',
  'Under review': 'border-cyan-300/20 bg-cyan-500/[0.08] text-cyan-100',
  'Payout queued': 'border-amber-300/20 bg-amber-500/[0.08] text-amber-100',
  Paid: 'border-emerald-300/20 bg-emerald-500/[0.08] text-emerald-100',
  'Claim decision': 'border-violet-300/20 bg-violet-500/[0.08] text-violet-100',
  'Venue lead follow-up': 'border-red-300/20 bg-red-500/[0.08] text-red-100',
};

export default function ActionCenterPage() {
  const router = useRouter();
  const { address, isConnected } = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [items, setItems] = useState<ActionCenterItem[]>([]);
  const [summary, setSummary] = useState<ActionCenterSummary | null>(null);

  const fetchActionCenter = useCallback(async () => {
    if (!address) return;

    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`/api/action-center?wallet=${address}`, {
        headers: {
          'x-moderator-wallet': address,
        },
      });
      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to load action center');
      }
      setItems(data.data.items ?? []);
      setSummary(data.data.summary ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load action center');
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    if (!address) {
      setItems([]);
      setSummary(null);
      return;
    }
    void fetchActionCenter();
  }, [address, fetchActionCenter]);

  const groupedItems = useMemo(() => {
    return categoryOrder
      .map((category) => ({
        category,
        items: items.filter((item) => item.category === category),
      }))
      .filter((group) => group.items.length > 0);
  }, [items]);

  return (
    <div className="min-h-screen bg-transparent px-4 py-24 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="rounded-[32px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(255,255,255,0.02)_12%,rgba(10,10,18,0.94)_100%)] px-6 py-6 shadow-[0_24px_48px_rgba(0,0,0,0.28),inset_0_1px_0_rgba(255,255,255,0.08)] sm:px-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-white/42">Unified urgency</p>
              <h1 className="mt-3 text-3xl font-black uppercase tracking-[-0.04em] text-white sm:text-5xl">
                Needs Action
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-white/56">
                One place for creator, funder, claim, payout, and ops urgency.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link
                href="/dashboard"
                className="inline-flex min-h-[42px] items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/[0.08]"
              >
                Dashboard
              </Link>
              <Link
                href="/trust"
                className="inline-flex min-h-[42px] items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/[0.08]"
              >
                Trust & Protocol
              </Link>
            </div>
          </div>

          {!isConnected ? (
            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/20 px-5 py-5 text-sm text-white/56">
              Connect your wallet to load your live action center.
            </div>
          ) : loading ? (
            <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-white/8 bg-black/20 px-5 py-5 text-sm text-white/56">
              <Loader2 className="h-5 w-5 animate-spin text-fuchsia-300" />
              Loading your live actions
            </div>
          ) : error ? (
            <div className="mt-6 flex items-center gap-3 rounded-[24px] border border-red-400/18 bg-red-500/[0.06] px-5 py-5 text-sm text-red-200">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          ) : (
            <>
              <div className="mt-6 flex flex-wrap gap-2">
                {categoryOrder.map((category) =>
                  summary && summary.counts[category] > 0 ? (
                    <span
                      key={category}
                      className={`rounded-full border px-3 py-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] ${categoryTone[category]}`}
                    >
                      {category} {summary.counts[category]}
                    </span>
                  ) : null
                )}
              </div>

              {items.length === 0 ? (
                <div className="mt-6 flex flex-col items-center justify-center rounded-[24px] border border-white/8 bg-black/20 px-5 py-12 text-center">
                  <BellRing className="mb-3 h-8 w-8 text-white/20" />
                  <p className="text-sm text-white/62">Nothing urgent right now. You&apos;re clear.</p>
                </div>
              ) : (
                <div className="mt-6 space-y-6">
                  {groupedItems.map((group) => (
                    <section key={group.category}>
                      <div className="mb-3 flex items-center justify-between gap-3">
                        <h2 className="text-sm font-black uppercase tracking-[0.18em] text-white">{group.category}</h2>
                        <span className="text-[11px] uppercase tracking-[0.2em] text-white/42">
                          {group.items.length} live
                        </span>
                      </div>
                      <div className="grid gap-3 lg:grid-cols-2">
                        {group.items.map((item) => (
                          <div
                            key={item.id}
                            className="rounded-[24px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(12,11,22,0.95)_100%)] p-4 shadow-[0_16px_28px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.08)]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className={`rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] ${categoryTone[item.category]}`}>
                                    {item.category}
                                  </span>
                                  <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/52">
                                    {item.role}
                                  </span>
                                </div>
                                <p className="mt-3 text-base font-black text-white">{item.title}</p>
                                <p className="mt-1 text-xs text-white/42">
                                  {item.locationLabel || item.statusLabel || 'Live'}{item.bounty ? ` • $${item.bounty}` : ''}
                                </p>
                              </div>
                              {item.statusLabel ? (
                                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-white/58">
                                  {item.statusLabel}
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-4 text-sm text-white/62">{item.detail}</p>
                            <div className="mt-4 flex flex-wrap gap-2">
                              <SquircleButton
                                tone={item.category === 'Venue lead follow-up' ? 'purple' : 'yellow'}
                                height={42}
                                onClick={() => router.push(item.href)}
                              >
                                <span className="relative z-10 inline-flex items-center justify-center gap-2 font-black uppercase tracking-[0.08em] text-[0.84rem]">
                                  {item.cta}
                                </span>
                              </SquircleButton>
                              <button
                                onClick={() => router.push(item.href)}
                                className="inline-flex min-h-[42px] items-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-xs font-semibold uppercase tracking-[0.18em] text-white/72 transition hover:bg-white/[0.08]"
                              >
                                Open
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
