'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Copy, ExternalLink, Instagram, Mail, MessageCircle, Printer, QrCode, Share2, X } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  buildTrackedVenueReportHref,
  trackVenueReportEvent,
} from '@/lib/venue-report-client';

type ReportAudience = 'venue' | 'sponsor';

export default function VenueReportActions({
  venueSlug,
  shareSubject,
  shareBody,
  audience,
}: {
  venueSlug: string;
  shareSubject: string;
  shareBody: string;
  audience: ReportAudience;
}) {
  const [copied, setCopied] = useState<'brief' | 'link' | null>(null);
  const [showQr, setShowQr] = useState(false);

  const shareUrl = useMemo(() => {
    if (typeof window === 'undefined') return '';
    return `${window.location.origin}/venues/${encodeURIComponent(venueSlug)}/report?audience=${audience}`;
  }, [audience, venueSlug]);

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
  const venueLensHref = useMemo(
    () =>
      buildTrackedVenueReportHref({
        href: `/venues/${encodeURIComponent(venueSlug)}/report?audience=venue`,
        venueSlug,
        audience,
      }),
    [audience, venueSlug]
  );
  const sponsorLensHref = useMemo(
    () =>
      buildTrackedVenueReportHref({
        href: `/venues/${encodeURIComponent(venueSlug)}/report?audience=sponsor`,
        venueSlug,
        audience,
      }),
    [audience, venueSlug]
  );

  useEffect(() => {
    void trackVenueReportEvent({
      venueSlug,
      audience,
      eventType: 'OPEN',
      channel: 'page',
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
        channel: kind,
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
          channel: 'native-share',
        });
        return;
      }
      await copyText('link');
    } catch {
      // Swallow aborts from native share and leave the UI stable.
    }
  }

  async function copyInstagramBrief() {
    try {
      await navigator.clipboard.writeText(`${shareSubject}\n\n${shareBody}\n\n${shareUrl}`);
      await trackVenueReportEvent({
        venueSlug,
        audience,
        eventType: 'INSTAGRAM_BRIEF',
        channel: 'instagram-dm-copy',
      });
      setCopied('brief');
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      setCopied(null);
    }
  }

  async function openWhatsApp() {
    await trackVenueReportEvent({
      venueSlug,
      audience,
      eventType: 'WHATSAPP_BRIEF',
      channel: 'whatsapp-click-to-send',
    });
    const text = encodeURIComponent(`${shareSubject}\n\n${shareBody}\n\n${shareUrl}`);
    window.open(`https://wa.me/?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  async function printHandoff() {
    await trackVenueReportEvent({
      venueSlug,
      audience,
      eventType: 'PRINT_HANDOFF',
      channel: 'browser-print',
    });
    window.print();
  }

  async function toggleQr() {
    const next = !showQr;
    setShowQr(next);
    if (next) {
      await trackVenueReportEvent({
        venueSlug,
        audience,
        eventType: 'QR_HANDOFF',
        channel: 'report-qr',
      });
    }
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
      <div className="flex flex-wrap gap-2">
        <Link
          href={venueLensHref}
          className={`rounded-full border px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.18em] transition ${
            audience === 'venue'
              ? 'border-cyan-300/30 bg-cyan-500/[0.12] text-cyan-100'
              : 'border-white/10 bg-white/[0.04] text-white/58 hover:border-white/16 hover:text-white/78'
          }`}
        >
          Venue lens
        </Link>
        <Link
          href={sponsorLensHref}
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
          onClick={() => void copyText('brief')}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/22 bg-cyan-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-300/34 hover:bg-cyan-500/[0.12]"
        >
          <Copy className="h-3.5 w-3.5" />
          {copied === 'brief' ? 'Copied brief' : 'Copy brief'}
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
              channel: 'mailto',
            });
          }}
          className="inline-flex items-center gap-2 rounded-full border border-amber-400/22 bg-amber-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-amber-100 transition hover:-translate-y-[1px] hover:border-amber-300/34 hover:bg-amber-500/[0.12]"
        >
          <Mail className="h-3.5 w-3.5" />
          Email brief
        </a>
        <button
          type="button"
          onClick={() => void openWhatsApp()}
          className="inline-flex items-center gap-2 rounded-full border border-emerald-400/22 bg-emerald-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-emerald-100 transition hover:-translate-y-[1px] hover:border-emerald-300/34 hover:bg-emerald-500/[0.12]"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          WhatsApp
        </button>
        <button
          type="button"
          onClick={() => void copyInstagramBrief()}
          className="inline-flex items-center gap-2 rounded-full border border-pink-400/22 bg-pink-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-pink-100 transition hover:-translate-y-[1px] hover:border-pink-300/34 hover:bg-pink-500/[0.12]"
        >
          <Instagram className="h-3.5 w-3.5" />
          Copy for IG
        </button>
        <button
          type="button"
          onClick={() => void printHandoff()}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/72 transition hover:-translate-y-[1px] hover:border-white/18 hover:bg-white/[0.08] hover:text-white"
        >
          <Printer className="h-3.5 w-3.5" />
          Print
        </button>
        <button
          type="button"
          onClick={() => void toggleQr()}
          className="inline-flex items-center gap-2 rounded-full border border-cyan-400/22 bg-cyan-500/[0.08] px-3 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-cyan-100 transition hover:-translate-y-[1px] hover:border-cyan-300/34 hover:bg-cyan-500/[0.12]"
        >
          <QrCode className="h-3.5 w-3.5" />
          QR handoff
        </button>
      </div>

      {showQr && shareUrl ? (
        <div className="w-full rounded-[22px] border border-cyan-300/18 bg-black/50 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:max-w-xs">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-100/70">Decision brief QR</p>
              <p className="mt-1 text-xs leading-5 text-white/48">Handoff only. This QR does not prove presence or approve a pilot.</p>
            </div>
            <button type="button" onClick={() => setShowQr(false)} aria-label="Close QR" className="rounded-full border border-white/10 p-1.5 text-white/50 hover:text-white">
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 inline-flex rounded-2xl bg-white p-3">
            <QRCodeSVG value={shareUrl} size={184} level="H" marginSize={4} bgColor="#ffffff" fgColor="#070709" />
          </div>
          <p className="mt-2 break-all font-mono text-[10px] text-white/42">{shareUrl}</p>
        </div>
      ) : null}
    </div>
  );
}
