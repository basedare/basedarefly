import Link from 'next/link';
import type { ActivityArea } from '@/lib/home-activities';
import { inSiargaoChallengeArea, siargaoCampaignOpen, siargaoChallengeHref } from '@/lib/siargao-challenge';

/** Uses the existing discovery section; expires without removing anyone's history. */
export default function FeaturedSiargaoChallenge({ area, now }: { area: ActivityArea; now: Date }) {
  if (!inSiargaoChallengeArea(area) || !siargaoCampaignOpen(now)) return null;
  return <article className="bd-card mb-5 border-violet-200/25 p-5 sm:p-6" aria-label="Siargao challenge">
    <p className="text-xs font-bold uppercase tracking-[0.16em] text-violet-200">Siargao · Free challenge</p>
    <h2 className="mt-3 text-2xl font-black tracking-tight text-white">Is Siargao worth the hype?</h2>
    <p className="mt-3 text-base leading-7 text-white/75">Start with the waves. Find something the crowds missed. Give your verdict.</p>
    <Link href={siargaoChallengeHref()} className="bd-action bd-action--gold mt-4 w-full !text-sm">Take the challenge →</Link>
    <p className="mt-3 text-sm leading-6 text-white/55">30–60 min, plus travel · Daylight · No sign-in or purchase needed</p>
  </article>;
}
