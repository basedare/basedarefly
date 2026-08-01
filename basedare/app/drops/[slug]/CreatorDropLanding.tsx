'use client';

import { ArrowRight, Copy, ExternalLink, Loader2, Share2, ShieldCheck, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import { MissionPassSheet } from '@/components/mission-pass/MissionPassSheet';
import type { AttributionTargetType } from '@/lib/creator-attribution-policy';
import { creatorDropCategoryLabel, type CreatorDropMetadata } from '@/lib/creator-drops';

type CreatorDropLandingProps = {
  creatorCode: string;
  contentCode: string;
  campaignCode: string | null;
  targetType: AttributionTargetType;
  targetId: string;
  publicPath: string;
  metadata: CreatorDropMetadata;
};

export default function CreatorDropLanding({
  creatorCode,
  contentCode,
  campaignCode,
  targetType,
  targetId,
  publicPath,
  metadata,
}: CreatorDropLandingProps) {
  const [missionPassOpen, setMissionPassOpen] = useState(false);
  const [opening, setOpening] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const categoryLabel = creatorDropCategoryLabel(metadata.category);
  const publicUrl = useMemo(() => {
    if (typeof window === 'undefined') return publicPath;
    return `${window.location.origin}${publicPath}`;
  }, [publicPath]);

  async function lockAndOpenAction() {
    setOpening(true);
    setMessage(null);
    try {
      await fetch('/api/attribution/intents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType,
          targetId,
          targetHref: metadata.actionHref,
          title: metadata.title,
        }),
      }).catch(() => null);
    } finally {
      window.location.href = metadata.actionHref;
    }
  }

  async function shareDrop() {
    const text = `${metadata.title}\n${metadata.hook}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: metadata.title, text, url: publicUrl });
        setMessage('Share sheet opened.');
      } else {
        await navigator.clipboard.writeText(publicUrl);
        setMessage('Creator link copied.');
      }
    } catch (shareError) {
      if (shareError instanceof DOMException && shareError.name === 'AbortError') return;
      setMessage('Share was blocked. Copy the link instead.');
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setMessage('Creator link copied.');
    } catch {
      setMessage(publicUrl);
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05050b] text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(126,66,255,0.24),transparent_34%),radial-gradient(circle_at_86%_32%,rgba(0,240,255,0.13),transparent_30%),linear-gradient(180deg,#07070d,#040407_62%,#030305)]" />
      <div className="pointer-events-none absolute inset-0 opacity-[0.18] [background-image:linear-gradient(rgba(255,255,255,.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.05)_1px,transparent_1px)] [background-size:36px_36px]" />

      <section className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-4 py-14 sm:px-6">
        <div className="grid gap-5 lg:grid-cols-[1.12fr_0.88fr] lg:items-stretch">
          <div className="relative overflow-hidden rounded-[30px] border border-[#f5c518]/18 bg-[linear-gradient(150deg,rgba(255,255,255,.08),rgba(12,10,19,.9)_48%,rgba(4,5,10,.98))] p-6 shadow-[0_34px_110px_rgba(0,0,0,.58),inset_0_1px_0_rgba(255,255,255,.1)] sm:p-8">
            <div className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-[#f5c518]/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 left-8 h-64 w-64 rounded-full bg-cyan-300/10 blur-3xl" />

            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/25 bg-[#f5c518]/[0.08] px-4 py-2 text-[10px] font-black uppercase tracking-[0.24em] text-[#ffe36a]">
                <Sparkles className="h-4 w-4" />
                Creator drop · {categoryLabel}
              </div>

              <h1 className="mt-6 max-w-3xl text-4xl font-black leading-[0.98] tracking-[-0.045em] text-white sm:text-6xl">
                {metadata.title}
              </h1>
              <p className="mt-5 max-w-2xl text-lg font-semibold leading-8 text-white/68">{metadata.hook}</p>

              <div className="mt-6 flex flex-wrap gap-2">
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                  @{creatorCode}
                </span>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-white/55">
                  {contentCode}
                </span>
                {campaignCode ? (
                  <span className="rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-cyan-100/70">
                    {campaignCode}
                  </span>
                ) : null}
                {metadata.cityLabel ? (
                  <span className="rounded-full border border-[#f5c518]/20 bg-[#f5c518]/[0.07] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-[#ffe36a]/85">
                    {metadata.cityLabel}
                  </span>
                ) : null}
              </div>

              {metadata.rewardLabel ? (
                <div className="mt-6 rounded-[22px] border border-[#f5c518]/20 bg-[#f5c518]/[0.07] p-4">
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#ffe36a]/80">What is on the table</p>
                  <p className="mt-1 text-lg font-black text-white">{metadata.rewardLabel}</p>
                </div>
              ) : null}
            </div>
          </div>

          <aside className="rounded-[30px] border border-white/10 bg-black/42 p-5 shadow-[0_24px_80px_rgba(0,0,0,.45),inset_0_1px_0_rgba(255,255,255,.08)] backdrop-blur-xl sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-cyan-100/70">Open the action</p>
            <h2 className="mt-2 text-2xl font-black tracking-tight">Start here, save it if you might come back.</h2>
            <p className="mt-2 text-sm leading-6 text-white/52">
              BaseDare remembers that this creator sent you here, but only server-verified completions count as outcomes.
            </p>

            <button
              type="button"
              disabled={opening}
              onClick={() => void lockAndOpenAction()}
              className="mt-5 inline-flex min-h-14 w-full items-center justify-center gap-2 rounded-[18px] bg-[#f5c518] px-5 text-sm font-black uppercase tracking-[0.14em] text-[#111009] shadow-[0_18px_48px_rgba(245,197,24,.2),inset_0_2px_0_rgba(255,255,255,.36)] transition hover:-translate-y-[1px] disabled:opacity-60"
            >
              {opening ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
              {metadata.actionLabel}
            </button>

            <button
              type="button"
              onClick={() => setMissionPassOpen(true)}
              className="mt-3 inline-flex min-h-13 w-full items-center justify-center gap-2 rounded-[16px] border border-cyan-300/24 bg-cyan-300/[0.08] px-5 text-xs font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:bg-cyan-300/[0.13]"
            >
              <ExternalLink className="h-4 w-4" />
              Save Mission Pass
            </button>

            <div className="mt-3 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void shareDrop()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.055] px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white/62 transition hover:text-white"
              >
                <Share2 className="h-4 w-4" />
                Share
              </button>
              <button
                type="button"
                onClick={() => void copyLink()}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-[14px] border border-white/10 bg-white/[0.055] px-3 text-[11px] font-black uppercase tracking-[0.12em] text-white/62 transition hover:text-white"
              >
                <Copy className="h-4 w-4" />
                Copy
              </button>
            </div>

            {message ? <p className="mt-3 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs text-white/60">{message}</p> : null}

            <div className="mt-5 rounded-[20px] border border-emerald-300/15 bg-emerald-300/[0.055] p-4">
              <div className="flex gap-3">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                <p className="text-xs leading-5 text-emerald-50/68">
                  No automatic commissions or fake “views = visits.” The path is measured, but the result only lands when BaseDare accepts proof, check-in, or the linked action.
                </p>
              </div>
            </div>

            {metadata.creatorBrief || metadata.proofPrompt || metadata.suggestedCaption ? (
              <div className="mt-5 space-y-3 text-sm leading-6 text-white/55">
                {metadata.creatorBrief ? <p><span className="font-black text-white/80">Creator brief:</span> {metadata.creatorBrief}</p> : null}
                {metadata.proofPrompt ? <p><span className="font-black text-white/80">Proof angle:</span> {metadata.proofPrompt}</p> : null}
                {metadata.suggestedCaption ? <p><span className="font-black text-white/80">Caption seed:</span> {metadata.suggestedCaption}</p> : null}
              </div>
            ) : null}
          </aside>
        </div>
      </section>

      <MissionPassSheet
        open={missionPassOpen}
        onClose={() => setMissionPassOpen(false)}
        targetType={targetType}
        targetId={targetId}
        targetHref={metadata.actionHref}
        title={metadata.title}
        description="Save this BaseDare mission to email or a private link so you can leave Instagram/TikTok and continue in Safari or Chrome."
      />
    </main>
  );
}
