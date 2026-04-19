'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Share2 } from 'lucide-react';

type ReportAudience = 'venue' | 'sponsor';

export default function VenueReportActions({
  venueSlug,
  venueName,
  summary,
  audience,
}: {
  venueSlug: string;
  venueName: string;
  summary: string;
  audience: ReportAudience;
}) {
  const [copied, setCopied] = useState<'summary' | 'link' | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/venues/${encodeURIComponent(venueSlug)}/report?audience=${audience}`;
  }, [audience, venueSlug]);

  const sharePayload = useMemo(
    () => ({
      title:
        audience === 'sponsor'
          ? `${venueName} sponsor report`
          : `${venueName} venue report`,
      text: summary,
      url: shareUrl,
    }),
    [audience, shareUrl, summary, venueName]
  );

  async function copyText(kind: 'summary' | 'link') {
    const value = kind === 'summary' ? `${sharePayload.title}\n\n${summary}\n\n${shareUrl}` : shareUrl;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function share() {
    try {
      if (navigator.share) {
        await navigator.share(sharePayload);
        return;
      }
      await copyText('link');
    } catch {
      // Swallow aborts from native share and leave the UI stable.
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/venues/${encodeURIComponent(venueSlug)}/report?audience=venue`}
          className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
            audience === 'venue'
              ? 'border-cyan-300/30 bg-cyan-500/[0.12] text-cyan-100'
              : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-white/16 hover:text-white/78'
          }`}
        >
          Venue lens
        </Link>
        <Link
          href={`/venues/${encodeURIComponent(venueSlug)}/report?audience=sponsor`}
          className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
            audience === 'sponsor'
              ? 'border-fuchsia-300/30 bg-fuchsia-500/[0.12] text-fuchsia-100'
              : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-white/16 hover:text-white/78'
          }`}
        >
          Sponsor lens
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void share()}
          className="inline-flex items-center gap-2 rounded-full border border-fuchsia-400/22 bg-fuchsia-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-fuchsia-100 transition hover:-translate-y-[1px] hover:border-fuchsia-300/34 hover:bg-fuchsia-500/[0.12]"
        >
          <Share2 className="h-3.5 w-3.5" />
          Share
        </button>
        <button
          type="button"
          onClick={() => void copyText('summary')}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/22 bg-cyan-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-300/34 hover:bg-cyan-500/[0.12]"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied === 'summary' ? 'Copied summary' : 'Copy summary'}
        </button>
        <button
          type="button"
          onClick={() => void copyText('link')}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          {copied === 'link' ? 'Copied link' : 'Copy link'}
        </button>
      </div>
    </div>
  );
}
