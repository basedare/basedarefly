'use client';

import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Mail, Share2 } from 'lucide-react';
import {
  trackVenueReportEvent,
  type VenueReportAudience,
} from '@/lib/venue-report-client';

export default function VenueRecapActions({
  venueSlug,
  shareSubject,
  shareBody,
  audience = 'venue',
}: {
  venueSlug: string;
  shareSubject: string;
  shareBody: string;
  audience?: VenueReportAudience;
}) {
  const [copied, setCopied] = useState<'brief' | 'link' | null>(null);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/venues/${encodeURIComponent(venueSlug)}/recap`;
  }, [venueSlug]);

  const sharePayload = useMemo(
    () => ({
      title: shareSubject,
      text: shareBody,
      url: shareUrl,
    }),
    [shareBody, shareSubject, shareUrl]
  );

  const mailtoHref = useMemo(() => {
    const params = new URLSearchParams({
      subject: shareSubject,
      body: `${shareBody}\n\n${shareUrl}`,
    });
    return `mailto:?${params.toString()}`;
  }, [shareBody, shareSubject, shareUrl]);

  useEffect(() => {
    void trackVenueReportEvent({
      venueSlug,
      audience,
      eventType: 'OPEN',
      channel: 'recap',
    });
  }, [audience, venueSlug]);

  async function copyText(kind: 'brief' | 'link') {
    const value = kind === 'brief' ? `${shareSubject}\n\n${shareBody}\n\n${shareUrl}` : shareUrl;

    try {
      await navigator.clipboard.writeText(value);
      await trackVenueReportEvent({
        venueSlug,
        audience,
        eventType: kind === 'brief' ? 'COPY_BRIEF' : 'COPY_LINK',
        channel: `recap-${kind}`,
      });
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
        await trackVenueReportEvent({
          venueSlug,
          audience,
          eventType: 'SHARE',
          channel: 'recap-native-share',
        });
        return;
      }

      await copyText('link');
    } catch {
      // Native share aborts should not change the page state.
    }
  }

  return (
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
        onClick={() => void copyText('brief')}
        className="inline-flex items-center gap-2 rounded-full border border-cyan-400/22 bg-cyan-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-300/34 hover:bg-cyan-500/[0.12]"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied === 'brief' ? 'Copied receipt' : 'Copy receipt'}
      </button>
      <button
        type="button"
        onClick={() => void copyText('link')}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
      >
        <ExternalLink className="h-3.5 w-3.5" />
        {copied === 'link' ? 'Copied link' : 'Copy link'}
      </button>
      <a
        href={mailtoHref}
        onClick={() => {
          void trackVenueReportEvent({
            venueSlug,
            audience,
            eventType: 'EMAIL_BRIEF',
            channel: 'recap-mailto',
          });
        }}
        className="inline-flex items-center gap-2 rounded-full border border-amber-400/22 bg-amber-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100 transition hover:-translate-y-[1px] hover:border-amber-300/34 hover:bg-amber-500/[0.12]"
      >
        <Mail className="h-3.5 w-3.5" />
        Email receipt
      </a>
    </div>
  );
}
