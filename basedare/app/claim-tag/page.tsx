'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
import { ArrowLeft, AtSign, BadgeCheck, RadioTower } from 'lucide-react';
import GradualBlurOverlay from '@/components/GradualBlurOverlay';
import LiquidBackground from '@/components/LiquidBackground';

type Platform = 'twitter' | 'twitch' | 'youtube' | 'kick';

const PLATFORM_OPTIONS: Array<{ value: Platform; label: string }> = [
  { value: 'twitter', label: 'Twitter / X' },
  { value: 'twitch', label: 'Twitch' },
  { value: 'youtube', label: 'YouTube' },
  { value: 'kick', label: 'Kick' },
];

function normalizeTagInput(value: string): string {
  const cleaned = value.trim().replace(/^@+/, '');
  return cleaned ? `@${cleaned}` : '';
}

function normalizeHandleInput(value: string): string {
  return value.trim().replace(/^@+/, '');
}

export default function ClaimTagPage() {
  const { data: session } = useSession();
  const { address, isConnected } = useAccount();

  const sessionToken = (session as { token?: string } | null)?.token;

  const [tag, setTag] = useState('');
  const [platform, setPlatform] = useState<Platform>('twitter');
  const [handle, setHandle] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedMessage, setSubmittedMessage] = useState<string | null>(null);

  const canSubmit = isConnected && tag.trim().length > 0 && handle.trim().length > 0 && !submitting;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setError(null);
    setSubmittedMessage(null);

    try {
      const normalizedTag = normalizeTagInput(tag);
      const normalizedHandle = normalizeHandleInput(handle);

      const response = await fetch('/api/claim-tag', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          tag: normalizedTag,
          platform,
          handle: normalizedHandle,
          walletAddress: address?.toLowerCase(),
        }),
      });

      const payload = await response.json();

      if (!response.ok || !payload.success) {
        setError(payload.error || 'Unable to submit tag claim.');
        return;
      }

      setSubmittedMessage(payload.message || 'Your tag claim is under review');
      setTag('');
      setHandle('');
    } catch {
      setError('Network error while submitting your tag claim.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-transparent text-white">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>
      <div className="relative z-10 container mx-auto px-4 pt-28 pb-24">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(8,10,18,0.9)_100%)] px-4 py-2 text-[11px] font-mono uppercase tracking-[0.2em] text-white/65 shadow-[0_14px_26px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-10px_14px_rgba(0,0,0,0.22)] transition hover:-translate-y-[1px] hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </Link>

          <div className="relative mt-6 overflow-hidden rounded-[32px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_12%,rgba(9,7,19,0.95)_100%)] px-6 py-7 shadow-[0_26px_90px_rgba(0,0,0,0.52),0_0_34px_rgba(168,85,247,0.08),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-16px_22px_rgba(0,0,0,0.24)] sm:px-7">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_0%,rgba(192,132,252,0.15),transparent_34%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%)]" />
            <div className="relative">
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/30 bg-[linear-gradient(180deg,rgba(250,204,21,0.14)_0%,rgba(250,204,21,0.05)_100%)] px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-[#f5c518] shadow-[0_12px_22px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.12)]">
                <BadgeCheck className="h-3.5 w-3.5" />
                Creator Identity
              </div>

              <h1 className="mt-5 text-4xl font-black tracking-[-0.04em] text-white sm:text-6xl">
                Claim Your Tag
              </h1>
              <p className="mt-3 max-w-2xl text-sm text-white/68 sm:text-base">
                Lock your creator identity to your wallet, tune discovery, and give the admin queue the cleanest signal possible.
              </p>

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Format</p>
                  <p className="mt-2 text-sm font-semibold text-white">@yourtag</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Review</p>
                  <p className="mt-2 text-sm font-semibold text-white">Manual admin approval</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-white/38">Anchor</p>
                  <p className="mt-2 text-sm font-semibold text-white">Wallet-backed identity</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-[32px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.02)_10%,rgba(7,9,18,0.96)_58%,rgba(5,6,14,0.98)_100%)] p-6 shadow-[0_28px_100px_rgba(0,0,0,0.56),0_0_34px_rgba(34,211,238,0.06),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-16px_22px_rgba(0,0,0,0.24)] md:p-8">
            {!isConnected && (
              <div className="mb-5 rounded-[22px] border border-yellow-500/24 bg-yellow-500/[0.08] px-4 py-4 text-sm text-yellow-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                <p className="font-semibold">Wallet connection required</p>
                <p className="mt-2 text-yellow-100/70">
                  Connect your wallet first, then submit the tag claim from the same identity you want attached to it.
                </p>
              </div>
            )}

            {submittedMessage && (
              <div className="mb-5 rounded-[22px] border border-green-500/24 bg-green-500/[0.08] px-4 py-4 text-sm text-green-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                <p className="font-semibold">Claim submitted</p>
                <p className="mt-2 text-green-100/75">{submittedMessage}</p>
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-[22px] border border-red-500/24 bg-red-500/[0.08] px-4 py-4 text-sm text-red-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]">
                <p className="font-semibold">Claim failed</p>
                <p className="mt-2 text-red-100/75">{error}</p>
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 md:grid-cols-[1.15fr_0.85fr]">
                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/56">
                    <AtSign className="h-3.5 w-3.5 text-[#f5c518]" />
                    Tag
                  </label>
                  <input
                    value={tag}
                    onChange={(e) => setTag(e.target.value)}
                    placeholder="@yourtag"
                    className="mt-3 h-14 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-white placeholder:text-white/28 shadow-[inset_0_2px_6px_rgba(0,0,0,0.28)] focus:border-[#b87fff]/45 focus:outline-none"
                  />
                </div>

                <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                  <label className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.24em] text-white/56">
                    <RadioTower className="h-3.5 w-3.5 text-cyan-200" />
                    Platform
                  </label>
                  <select
                    value={platform}
                    onChange={(e) => setPlatform(e.target.value as Platform)}
                    className="mt-3 h-14 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-white shadow-[inset_0_2px_6px_rgba(0,0,0,0.28)] focus:border-[#b87fff]/45 focus:outline-none"
                  >
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[#0b0b14] text-white">
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="rounded-[24px] border border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.05)_0%,rgba(7,10,18,0.94)_100%)] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.22)]">
                <label className="text-[11px] font-bold uppercase tracking-[0.24em] text-white/56">Handle</label>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@handle"
                  className="mt-3 h-14 w-full rounded-[18px] border border-white/10 bg-black/20 px-4 text-white placeholder:text-white/28 shadow-[inset_0_2px_6px_rgba(0,0,0,0.28)] focus:border-[#b87fff]/45 focus:outline-none"
                />
                <p className="mt-3 text-xs text-white/42">
                  Use the public handle that admins can actually verify against the platform you selected.
                </p>
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-[20px] border border-[#b87fff]/34 bg-[linear-gradient(180deg,rgba(184,127,255,0.2)_0%,rgba(88,28,135,0.12)_100%)] px-4 py-3 font-bold uppercase tracking-[0.2em] text-[#ead8ff] shadow-[0_18px_28px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-12px_18px_rgba(0,0,0,0.2)] transition hover:-translate-y-[1px] hover:bg-[linear-gradient(180deg,rgba(184,127,255,0.28)_0%,rgba(88,28,135,0.16)_100%)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </form>

            <p className="mt-5 text-xs text-white/55 font-mono">
              After submission, status will be marked as <span className="text-yellow-300">UNDER REVIEW</span>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
