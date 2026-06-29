'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, Loader2 } from 'lucide-react';

import { ControlChip } from '@/components/control/ControlChip';
import { controlInset } from '@/components/control/tokens';
import {
  CREATOR_CAPTAIN_AUDIENCE_LABELS,
  CREATOR_CAPTAIN_AUDIENCE_SIZES,
  CREATOR_CAPTAIN_AVAILABILITY,
  CREATOR_CAPTAIN_AVAILABILITY_LABELS,
  CREATOR_CAPTAIN_CATEGORIES,
  CREATOR_CAPTAIN_CATEGORY_LABELS,
  CREATOR_CAPTAIN_PAYOUT_LABELS,
  CREATOR_CAPTAIN_PAYOUTS,
  CREATOR_CAPTAIN_PLATFORM_LABELS,
  CREATOR_CAPTAIN_PLATFORMS,
  type CreatorCaptainAudienceSize,
  type CreatorCaptainAvailability,
  type CreatorCaptainCategory,
  type CreatorCaptainPayout,
  type CreatorCaptainPlatform,
} from '@/lib/creator-captains';

const MAX_CATEGORIES = 3;

const inputClass = `${controlInset} w-full px-4 py-3 text-sm font-bold text-white outline-none placeholder:text-white/34`;
const labelClass = 'text-[11px] font-black uppercase tracking-[0.16em] text-white/56';

/**
 * Founding creator intake — lightweight, NO wallet required. Posts to the
 * existing POST /api/creator-captains. The wallet/passport step comes second
 * (offered in the success state), so cold creators can express interest first.
 */
export default function FoundingCreatorForm({ defaultCity = 'Siargao / General Luna' }: { defaultCity?: string }) {
  const [creatorName, setCreatorName] = useState('');
  const [primaryHandle, setPrimaryHandle] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState(defaultCity);
  const [socialLinks, setSocialLinks] = useState('');
  const [primaryPlatform, setPrimaryPlatform] = useState<CreatorCaptainPlatform>('instagram');
  const [audienceSize, setAudienceSize] = useState<CreatorCaptainAudienceSize | ''>('');
  const [categories, setCategories] = useState<CreatorCaptainCategory[]>([]);
  const [availability, setAvailability] = useState<CreatorCaptainAvailability | ''>('');
  const [expectedPayout, setExpectedPayout] = useState<CreatorCaptainPayout | ''>('');
  const [contentStyle, setContentStyle] = useState('');
  const [dareIdeas, setDareIdeas] = useState('');
  const [referralSource, setReferralSource] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [companyWebsite, setCompanyWebsite] = useState(''); // honeypot

  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [error, setError] = useState('');

  const toggleCategory = (value: CreatorCaptainCategory) =>
    setCategories((prev) =>
      prev.includes(value)
        ? prev.filter((c) => c !== value)
        : prev.length >= MAX_CATEGORIES
          ? prev
          : [...prev, value]
    );

  const validate = (): string | null => {
    if (creatorName.trim().length < 2) return 'Add your name.';
    if (primaryHandle.trim().length < 2) return 'Add your @handle.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) return 'Add a valid email so we can reach you.';
    if (city.trim().length < 2) return 'Add your home city.';
    if (categories.length < 1) return 'Pick at least one thing you make.';
    if (!audienceSize) return 'Pick your audience size.';
    if (!availability) return 'Tell us when you can start.';
    if (!expectedPayout) return 'Pick what makes this worth your time.';
    if (contentStyle.trim().length < 12) return 'Tell us a bit more about the night you could start (12+ chars).';
    if (dareIdeas.trim().length < 12) return 'Tell us how you could bring people (12+ chars).';
    return null;
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      setStatus('error');
      return;
    }
    setStatus('submitting');
    setError('');
    try {
      const res = await fetch('/api/creator-captains', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          creatorName: creatorName.trim(),
          email: email.trim(),
          city: city.trim(),
          primaryHandle: primaryHandle.trim(),
          primaryPlatform,
          socialLinks: socialLinks.trim(),
          categories,
          audienceSize,
          contentStyle: contentStyle.trim(),
          dareIdeas: dareIdeas.trim(),
          availability,
          expectedPayout,
          walletAddress: walletAddress.trim(),
          referralSource: referralSource.trim(),
          companyWebsite, // honeypot
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json?.success) {
        setStatus('success');
        return;
      }
      setError(json?.error || 'Something went wrong. Try again.');
      setStatus('error');
    } catch {
      setError('Network error. Try again.');
      setStatus('error');
    }
  };

  if (status === 'success') {
    return (
      <div className="rounded-[26px] border border-emerald-300/30 bg-emerald-400/[0.06] p-6 text-center sm:p-8">
        <span className="inline-flex h-12 w-12 items-center justify-center rounded-full border border-emerald-300/40 bg-emerald-400/[0.14] text-emerald-200">
          <Check className="h-6 w-6" />
        </span>
        <h3 className="mt-4 text-2xl font-black italic uppercase tracking-[-0.02em] text-white">
          You&apos;re on the founding creator list
        </h3>
        <p className="mx-auto mt-2 max-w-md text-sm font-bold leading-6 text-white/64">
          We&apos;ll reach out about the next night in {city.trim() || 'your city'}. Two quick next steps:
        </p>
        <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Link
            href="/creators/onboard"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300 px-6 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200"
          >
            Claim your BaseDare tag
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link
            href="/markets"
            className="inline-flex min-h-12 items-center gap-2 rounded-full border border-white/14 bg-white/[0.05] px-6 text-sm font-black uppercase tracking-[0.14em] text-white/76 transition hover:bg-white/[0.09] hover:text-white"
          >
            See the markets
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {/* Identity */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Your name</span>
          <input className={inputClass} value={creatorName} onChange={(e) => setCreatorName(e.target.value)} placeholder="Jane Cruz" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Your @handle</span>
          <input className={inputClass} value={primaryHandle} onChange={(e) => setPrimaryHandle(e.target.value)} placeholder="@janecruz" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Email</span>
          <input type="email" className={inputClass} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@email.com" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Home city</span>
          <input className={inputClass} value={city} onChange={(e) => setCity(e.target.value)} placeholder="Siargao / General Luna" />
        </label>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Profile link <span className="text-white/34">(optional)</span></span>
        <input className={inputClass} value={socialLinks} onChange={(e) => setSocialLinks(e.target.value)} placeholder="instagram.com/janecruz" />
      </label>

      {/* Platform */}
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Main platform</span>
        <div className="flex flex-wrap gap-2">
          {CREATOR_CAPTAIN_PLATFORMS.map((p) => (
            <ControlChip key={p} label={CREATOR_CAPTAIN_PLATFORM_LABELS[p]} active={primaryPlatform === p} onClick={() => setPrimaryPlatform(p)} />
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="flex flex-col gap-2">
        <span className={labelClass}>What do you make? <span className="text-white/34">(pick up to {MAX_CATEGORIES})</span></span>
        <div className="flex flex-wrap gap-2">
          {CREATOR_CAPTAIN_CATEGORIES.map((c) => (
            <ControlChip key={c} label={CREATOR_CAPTAIN_CATEGORY_LABELS[c]} active={categories.includes(c)} onClick={() => toggleCategory(c)} />
          ))}
        </div>
      </div>

      {/* Audience size */}
      <div className="flex flex-col gap-2">
        <span className={labelClass}>Audience size</span>
        <div className="flex flex-wrap gap-2">
          {CREATOR_CAPTAIN_AUDIENCE_SIZES.map((a) => (
            <ControlChip key={a} label={CREATOR_CAPTAIN_AUDIENCE_LABELS[a]} active={audienceSize === a} onClick={() => setAudienceSize(a)} />
          ))}
        </div>
      </div>

      {/* Availability */}
      <div className="flex flex-col gap-2">
        <span className={labelClass}>When can you start?</span>
        <div className="flex flex-wrap gap-2">
          {CREATOR_CAPTAIN_AVAILABILITY.map((a) => (
            <ControlChip key={a} label={CREATOR_CAPTAIN_AVAILABILITY_LABELS[a]} active={availability === a} onClick={() => setAvailability(a)} />
          ))}
        </div>
      </div>

      {/* Expected payout */}
      <div className="flex flex-col gap-2">
        <span className={labelClass}>What makes this worth your time?</span>
        <div className="flex flex-wrap gap-2">
          {CREATOR_CAPTAIN_PAYOUTS.map((p) => (
            <ControlChip key={p} label={CREATOR_CAPTAIN_PAYOUT_LABELS[p]} active={expectedPayout === p} onClick={() => setExpectedPayout(p)} />
          ))}
        </div>
      </div>

      {/* Open prompts */}
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>What kind of night could you help start?</span>
        <textarea className={`${inputClass} min-h-[88px] resize-y`} value={contentStyle} onChange={(e) => setContentStyle(e.target.value)} placeholder="e.g. a pool-bar mixer where strangers leave as a crew…" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className={labelClass}>Could you bring 3–10 real people? How?</span>
        <textarea className={`${inputClass} min-h-[88px] resize-y`} value={dareIdeas} onChange={(e) => setDareIdeas(e.target.value)} placeholder="e.g. my surf crew + hostel friends, plus a story post the day before…" />
      </label>

      {/* Optional */}
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Who invited you? <span className="text-white/34">(optional)</span></span>
          <input className={inputClass} value={referralSource} onChange={(e) => setReferralSource(e.target.value)} placeholder="@scout or venue name" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={labelClass}>Wallet <span className="text-white/34">(optional — add later)</span></span>
          <input className={inputClass} value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} placeholder="0x… (skip for now)" />
        </label>
      </div>

      {/* Honeypot — hidden from humans, catches bots */}
      <div aria-hidden="true" className="pointer-events-none absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Company website
          <input tabIndex={-1} autoComplete="off" value={companyWebsite} onChange={(e) => setCompanyWebsite(e.target.value)} />
        </label>
      </div>

      {status === 'error' && error ? (
        <p className="rounded-2xl border border-red-400/30 bg-red-500/[0.08] px-4 py-3 text-sm font-bold text-red-200">{error}</p>
      ) : null}

      <button
        type="submit"
        disabled={status === 'submitting'}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-yellow-300/30 bg-yellow-300 px-7 text-sm font-black uppercase tracking-[0.16em] text-black transition hover:bg-yellow-200 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {status === 'submitting' ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
        {status === 'submitting' ? 'Joining…' : 'Join the founding creator list'}
      </button>
      <p className="text-center text-[11px] font-bold leading-5 text-white/40">
        No wallet needed to join. We&apos;ll reach out, then you can claim your tag.
      </p>
    </form>
  );
}
