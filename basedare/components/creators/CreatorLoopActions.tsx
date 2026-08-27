'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, Briefcase, Loader2, LockKeyhole, MapPin, Shield, Trophy } from 'lucide-react';

import { useActiveWallet } from '@/hooks/useActiveWallet';
import {
  resolveCreatorLoopActions,
  type CreatorLoopActionId,
  type CreatorLoopWorkItem,
} from '@/lib/creator-loop-actions';

type ActionCenterResponse = {
  success?: boolean;
  data?: {
    items?: CreatorLoopWorkItem[];
  };
};

type TagsResponse = {
  success?: boolean;
  primaryTag?: {
    tag?: string | null;
    status?: string | null;
  } | null;
};

const actionPresentation: Record<
  CreatorLoopActionId,
  {
    icon: React.ComponentType<{ className?: string }>;
    tone: string;
  }
> = {
  find: {
    icon: Briefcase,
    tone: 'border-cyan-300/18 bg-cyan-400/[0.06] text-cyan-100',
  },
  'show-up': {
    icon: MapPin,
    tone: 'border-fuchsia-300/18 bg-fuchsia-400/[0.06] text-fuchsia-100',
  },
  submit: {
    icon: Shield,
    tone: 'border-yellow-300/20 bg-yellow-400/[0.07] text-yellow-100',
  },
  record: {
    icon: Trophy,
    tone: 'border-white/12 bg-white/[0.04] text-white/78',
  },
};

export function CreatorLoopActions() {
  const { address, isConnected, isResolving } = useActiveWallet();
  const [items, setItems] = React.useState<CreatorLoopWorkItem[]>([]);
  const [creatorTag, setCreatorTag] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [loadFailed, setLoadFailed] = React.useState(false);
  const [loadedWallet, setLoadedWallet] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isResolving) return;

    if (!address) {
      setItems([]);
      setCreatorTag(null);
      setLoading(false);
      setLoadFailed(false);
      setLoadedWallet(null);
      return;
    }

    const wallet = address;
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 5000);

    async function loadCreatorState() {
      setLoading(true);
      setLoadFailed(false);

      const [actionResult, tagResult] = await Promise.allSettled([
        fetch(`/api/action-center?wallet=${encodeURIComponent(wallet)}`, {
          cache: 'no-store',
          signal: controller.signal,
        }).then(async (response) => ({
          response,
          payload: (await response.json()) as ActionCenterResponse,
        })),
        fetch(`/api/tags?wallet=${encodeURIComponent(wallet)}`, {
          cache: 'no-store',
          signal: controller.signal,
        }).then(async (response) => ({
          response,
          payload: (await response.json()) as TagsResponse,
        })),
      ]);

      if (cancelled) return;

      if (actionResult.status === 'fulfilled') {
        const { response, payload } = actionResult.value;
        if (response.ok && payload.success) {
          setItems(payload.data?.items ?? []);
        } else {
          setItems([]);
          setLoadFailed(true);
        }
      } else {
        setItems([]);
        setLoadFailed(true);
      }

      if (tagResult.status === 'fulfilled') {
        const { response, payload } = tagResult.value;
        const status = payload.primaryTag?.status?.toUpperCase();
        setCreatorTag(
          response.ok && payload.success && (status === 'ACTIVE' || status === 'VERIFIED')
            ? payload.primaryTag?.tag ?? null
            : null
        );
      } else {
        setCreatorTag(null);
      }

      window.clearTimeout(timeoutId);
      setLoadedWallet(wallet);
      setLoading(false);
    }

    void loadCreatorState();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, [address, isResolving]);

  const actions = resolveCreatorLoopActions({
    isConnected,
    isLoading: isResolving || loading || Boolean(address && loadedWallet !== address),
    loadFailed,
    items,
    creatorTag,
  });

  return (
    <div className="mx-auto mt-6 grid max-w-4xl gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {actions.map((action) => {
        const presentation = actionPresentation[action.id];
        const ActionIcon = presentation.icon;
        const isReady = action.state === 'ready' && Boolean(action.href);
        const content = (
          <>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[12px] border border-white/10 bg-black/24 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                {action.state === 'checking' ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : action.state === 'locked' ? (
                  <LockKeyhole className="h-4 w-4" />
                ) : (
                  <ActionIcon className="h-4 w-4" />
                )}
              </span>
              <span className="text-[11px] font-black uppercase tracking-[0.14em]">{action.label}</span>
              {isReady ? (
                <ArrowRight className="ml-auto h-4 w-4 opacity-50 transition-transform group-hover:translate-x-0.5 group-hover:opacity-90" />
              ) : (
                <span className="ml-auto text-[8px] font-black uppercase tracking-[0.16em] text-white/32">
                  {action.state === 'checking' ? 'Checking' : 'Locked'}
                </span>
              )}
            </div>
            <p className="mt-2 text-xs leading-5 text-white/55">{action.detail}</p>
          </>
        );
        const classes = `group min-h-[112px] rounded-[18px] border p-3 text-left shadow-[0_12px_20px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.06)] ${presentation.tone} ${
          isReady
            ? 'cursor-pointer transition-[transform,border-color,filter] duration-200 hover:-translate-y-0.5 hover:border-white/28 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/60'
            : 'cursor-default opacity-65'
        }`;

        return isReady && action.href ? (
          <Link key={action.id} href={action.href} className={classes}>
            {content}
          </Link>
        ) : (
          <div key={action.id} className={classes} aria-disabled="true">
            {content}
          </div>
        );
      })}
    </div>
  );
}
