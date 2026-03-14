'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useAccount } from 'wagmi';
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
    <main className="relative min-h-screen overflow-hidden bg-black text-white">
      <LiquidBackground />
      <div className="relative z-10 container mx-auto px-4 pt-28 pb-24">
        <div className="max-w-2xl mx-auto">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-xs font-mono text-white/60 hover:text-white transition-colors"
          >
            ← Back to Dashboard
          </Link>

          <h1 className="mt-4 text-4xl md:text-6xl font-black italic uppercase tracking-tight">
            Claim Your Tag
          </h1>
          <p className="mt-2 text-sm md:text-base text-white/70 font-mono">
            Submit your tag and platform handle. Admin will review it manually.
          </p>

          <div className="mt-8 rounded-2xl border border-white/15 bg-black/30 backdrop-blur-xl p-6 md:p-8">
            {!isConnected && (
              <p className="mb-5 rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
                Connect your wallet first, then submit your claim.
              </p>
            )}

            {submittedMessage && (
              <div className="mb-5 rounded-lg border border-green-500/30 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                {submittedMessage}
              </div>
            )}

            {error && (
              <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70">Tag</label>
                <input
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  placeholder="@yourtag"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70">Platform</label>
                <select
                  value={platform}
                  onChange={(e) => setPlatform(e.target.value as Platform)}
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white focus:outline-none focus:border-purple-400"
                >
                  {PLATFORM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-[#0b0b14] text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-white/70">Handle</label>
                <input
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  placeholder="@handle"
                  className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white placeholder:text-white/35 focus:outline-none focus:border-purple-400"
                />
              </div>

              <button
                type="submit"
                disabled={!canSubmit}
                className="w-full rounded-xl border border-purple-500/40 bg-purple-500/20 px-4 py-3 font-bold uppercase tracking-wider text-purple-200 transition-colors hover:bg-purple-500/30 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Claim'}
              </button>
            </form>

            <p className="mt-4 text-xs text-white/55 font-mono">
              After submission, status will be marked as <span className="text-yellow-300">UNDER REVIEW</span>.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
