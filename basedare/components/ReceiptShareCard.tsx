'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Check, Clock3, Copy, ExternalLink, MapPin, ReceiptText, Share2, UserRound } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

export type ReceiptShareTone = 'cyan' | 'emerald' | 'gold' | 'violet';

type ReceiptShareStat = {
  label: string;
  value: string | number;
};

type ReceiptShareCardProps = {
  title: string;
  detail: string;
  href: string;
  venueName?: string | null;
  actorLabel?: string | null;
  timestamp?: string | null;
  tone?: ReceiptShareTone;
  stats?: ReceiptShareStat[];
  compact?: boolean;
  className?: string;
};

const toneClasses: Record<ReceiptShareTone, { shell: string; badge: string; icon: string; button: string }> = {
  cyan: {
    shell: 'border-cyan-300/18 bg-cyan-500/[0.08]',
    badge: 'border-cyan-300/22 bg-cyan-400/[0.1] text-cyan-100',
    icon: 'text-cyan-100',
    button: 'border-cyan-300/24 bg-cyan-400/[0.1] text-cyan-100 hover:border-cyan-200/40 hover:bg-cyan-400/[0.16]',
  },
  emerald: {
    shell: 'border-emerald-300/18 bg-emerald-500/[0.08]',
    badge: 'border-emerald-300/22 bg-emerald-400/[0.1] text-emerald-100',
    icon: 'text-emerald-100',
    button: 'border-emerald-300/24 bg-emerald-400/[0.1] text-emerald-100 hover:border-emerald-200/40 hover:bg-emerald-400/[0.16]',
  },
  gold: {
    shell: 'border-[#f5c518]/24 bg-[#f5c518]/[0.08]',
    badge: 'border-[#f5c518]/28 bg-[#f5c518]/[0.11] text-[#fff3b0]',
    icon: 'text-[#fff3b0]',
    button: 'border-[#f5c518]/28 bg-[#f5c518]/[0.11] text-[#fff3b0] hover:border-[#f8dd72]/44 hover:bg-[#f5c518]/[0.17]',
  },
  violet: {
    shell: 'border-violet-300/18 bg-violet-500/[0.08]',
    badge: 'border-violet-300/22 bg-violet-400/[0.1] text-violet-100',
    icon: 'text-violet-100',
    button: 'border-violet-300/24 bg-violet-400/[0.1] text-violet-100 hover:border-violet-200/40 hover:bg-violet-400/[0.16]',
  },
};

function getAbsoluteUrl(href: string) {
  if (/^https?:\/\//i.test(href)) return href;

  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_APP_URL || 'https://basedare.xyz';

  return `${origin}${href.startsWith('/') ? href : `/${href}`}`;
}

function formatReceiptTime(value?: string | null) {
  if (!value) return null;
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return null;

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export default function ReceiptShareCard({
  title,
  detail,
  href,
  venueName,
  actorLabel,
  timestamp,
  tone = 'violet',
  stats = [],
  compact = false,
  className = '',
}: ReceiptShareCardProps) {
  const [copied, setCopied] = useState<'caption' | 'link' | null>(null);
  const { toast } = useToast();
  const classes = toneClasses[tone];
  const shareUrl = useMemo(() => getAbsoluteUrl(href), [href]);
  const receiptTime = formatReceiptTime(timestamp);
  const shareText = useMemo(() => {
    const context = [
      venueName ? `Venue: ${venueName}` : null,
      actorLabel ? `By: ${actorLabel}` : null,
      receiptTime ? `Time: ${receiptTime}` : null,
    ].filter(Boolean);

    return [title, detail, ...context, shareUrl].filter(Boolean).join('\n\n');
  }, [actorLabel, detail, receiptTime, shareUrl, title, venueName]);

  const copyValue = async (kind: 'caption' | 'link') => {
    const value = kind === 'caption' ? shareText : shareUrl;
    await navigator.clipboard.writeText(value);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
    toast({
      title: kind === 'caption' ? 'Receipt copied' : 'Receipt link copied',
      description: kind === 'caption' ? 'Caption is ready to paste.' : 'Deep link is ready to share.',
      duration: 2600,
    });
  };

  const shareToX = () => {
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank', 'width=700,height=620');
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[22px] border ${classes.shell} ${
        compact ? 'p-3' : 'p-4 sm:p-5'
      } shadow-[inset_0_1px_0_rgba(255,255,255,0.07),inset_0_-12px_18px_rgba(0,0,0,0.18)] ${className}`.trim()}
    >
      <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />

      <div className="relative flex items-start gap-3">
        <div className={`flex ${compact ? 'h-9 w-9' : 'h-11 w-11'} shrink-0 items-center justify-center rounded-[16px] border border-white/10 bg-black/24 ${classes.icon}`}>
          <ReceiptText className={compact ? 'h-4 w-4' : 'h-5 w-5'} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.16em] ${classes.badge}`}>
              <Check className="h-3 w-3" />
              Receipt
            </span>
            {receiptTime ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[9px] font-bold uppercase tracking-[0.14em] text-white/46">
                <Clock3 className="h-3 w-3" />
                {receiptTime}
              </span>
            ) : null}
          </div>
          <h3 className={`${compact ? 'mt-2 text-sm' : 'mt-3 text-lg'} font-black leading-tight text-white`}>
            {title}
          </h3>
          <p className={`${compact ? 'mt-1 text-xs leading-5' : 'mt-2 text-sm leading-6'} text-white/62`}>
            {detail}
          </p>
        </div>
      </div>

      {venueName || actorLabel || stats.length > 0 ? (
        <div className={`relative ${compact ? 'mt-3' : 'mt-4'} flex flex-wrap gap-2`}>
          {venueName ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white/58">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{venueName}</span>
            </span>
          ) : null}
          {actorLabel ? (
            <span className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[10px] font-semibold text-white/58">
              <UserRound className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{actorLabel}</span>
            </span>
          ) : null}
          {stats.map((stat) => (
            <span
              key={stat.label}
              className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.12em] text-white/54"
            >
              {stat.value}
              <span className="font-semibold text-white/32">{stat.label}</span>
            </span>
          ))}
        </div>
      ) : null}

      <div className={`relative ${compact ? 'mt-3 grid-cols-3 gap-1.5' : 'mt-4 grid-cols-1 gap-2 sm:grid-cols-3'} grid`}>
        <button
          type="button"
          onClick={() => void copyValue('link')}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/68 transition hover:border-white/20 hover:text-white"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied === 'link' ? 'Copied' : 'Copy'}
        </button>
        <button
          type="button"
          onClick={shareToX}
          className={`inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[14px] border px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] transition ${classes.button}`}
        >
          <Share2 className="h-3.5 w-3.5" />
          X
        </button>
        <Link
          href={href}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-[14px] border border-white/10 bg-white/[0.04] px-3 py-2 text-[10px] font-black uppercase tracking-[0.14em] text-white/68 transition hover:border-white/20 hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </Link>
      </div>
    </div>
  );
}
