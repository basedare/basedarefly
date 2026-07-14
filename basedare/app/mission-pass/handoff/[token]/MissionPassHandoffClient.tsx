'use client';

import { Check, Copy, ExternalLink, Share2, ShieldCheck } from 'lucide-react';
import { useMemo, useState } from 'react';

import LiquidBackground from '@/components/LiquidBackground';

export default function MissionPassHandoffClient({ token }: { token: string }) {
  const [message, setMessage] = useState<string | null>(null);
  const continueUrl = useMemo(() => {
    if (typeof window === 'undefined') return `/continue/${token}?handoff=1`;
    return `${window.location.origin}/continue/${token}?handoff=1`;
  }, [token]);

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'My BaseDare Mission Pass',
          text: 'Open this BaseDare Mission Pass in Safari or Chrome.',
          url: continueUrl,
        });
        setMessage('Choose a chat, Notes, or another place you can open from your normal browser.');
      } else {
        await navigator.clipboard.writeText(continueUrl);
        setMessage('Private link copied. Paste it into Safari or Chrome.');
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setMessage('Use the browser menu and choose Open in browser, or copy the private link below.');
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(continueUrl);
      setMessage('Private link copied. Paste it into Safari or Chrome.');
    } catch {
      setMessage('Copy was blocked. Use Send Mission Pass instead.');
    }
  };

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#07070b] px-4 py-24 text-white">
      <LiquidBackground />
      <section className="relative z-10 w-full max-w-lg rounded-[28px] border border-[#f5c518]/25 bg-[radial-gradient(circle_at_10%_0%,rgba(109,65,179,.25),transparent_36%),rgba(8,9,14,.94)] p-6 shadow-2xl sm:p-8">
        <div className="grid h-12 w-12 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 text-cyan-200">
          <ExternalLink className="h-5 w-5" />
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.28em] text-[#ffe36a]">Mission Pass ready</p>
        <h1 className="mt-2 text-3xl font-black leading-tight">Move this mission into your real browser.</h1>
        <p className="mt-3 text-sm leading-6 text-white/55">
          Instagram and TikTok are fine for discovery, but unreliable for wallet approvals and proof uploads. Send this private pass somewhere you can reopen it in Safari or Chrome.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-2">
          <button onClick={share} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#f5c518] px-4 text-xs font-black uppercase tracking-[0.13em] text-[#15120c]">
            <Share2 className="h-4 w-4" /> Send pass
          </button>
          <button onClick={copy} className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-white/12 bg-white/[0.05] px-4 text-xs font-black uppercase tracking-[0.13em] text-white">
            <Copy className="h-4 w-4" /> Copy link
          </button>
        </div>

        {message ? <p aria-live="polite" className="mt-4 flex gap-2 rounded-xl border border-emerald-300/15 bg-emerald-400/[0.06] p-3 text-xs leading-5 text-emerald-100/80"><Check className="mt-0.5 h-4 w-4 shrink-0" /> {message}</p> : null}

        <p className="mt-5 flex gap-2 border-t border-white/[0.07] pt-4 text-[11px] leading-5 text-white/35">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" /> The private pass restores your mission. It cannot claim a bounty, sign for a wallet, or release funds.
        </p>
      </section>
    </main>
  );
}
