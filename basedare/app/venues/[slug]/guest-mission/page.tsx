import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowRight, CheckCircle2, MapPin, Sparkles, Users } from 'lucide-react';

import { getVenueDetailBySlug } from '@/lib/venues';
import { buildVenueGuestMission, buildVenueGuestMissionActivationHref } from '@/lib/venue-guest-missions';
import VenuePageShell from '../../VenuePageShell';
import SquircleLink from '@/components/ui/SquircleLink';

export const metadata: Metadata = {
  title: 'Guest Mission | BaseDare',
  description: 'A simple BaseDare venue guest mission: check in, complete one action, unlock one perk, and leave a receipt.',
};

const raisedPanelClass =
  'relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]';

const insetCardClass =
  'rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.06),inset_0_-10px_16px_rgba(0,0,0,0.26)]';

type VenueGuestMissionPageProps = {
  params: Promise<{ slug: string }>;
};

export default async function VenueGuestMissionPage({ params }: VenueGuestMissionPageProps) {
  const { slug } = await params;
  const venue = await getVenueDetailBySlug(slug);

  if (!venue) {
    notFound();
  }

  const venueAreaLabel = [venue.city, venue.country].filter(Boolean).join(', ') || null;
  const mission = buildVenueGuestMission({
    venueName: venue.name,
    categories: venue.categories,
    activePerk: venue.activePerk,
    liveSession: venue.liveSession,
    hasActiveDrops: venue.activeDares.length > 0,
  });
  const launchHref = buildVenueGuestMissionActivationHref({
    source: 'venue-guest-mission',
    venueName: venue.name,
    venueSlug: venue.slug,
    city: venueAreaLabel,
    mission,
  });
  const venueHref = `/venues/${encodeURIComponent(venue.slug)}`;
  const mapHref = `/map?place=${encodeURIComponent(venue.slug)}`;
  const steps = [
    {
      title: 'Guests check in',
      detail: mission.proofLabel,
    },
    {
      title: 'One perk unlocks',
      detail: venue.activePerk?.description ?? mission.perkLabel,
    },
    {
      title: 'The venue gets a receipt',
      detail: 'Proof, check-ins, and the next repeat move stay attached to this place.',
    },
  ];

  return (
    <VenuePageShell mapHref={mapHref}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(34,211,238,0.12),transparent_28%),radial-gradient(circle_at_90%_85%,rgba(250,204,21,0.07),transparent_22%)]" />
      <main className="relative mx-auto max-w-5xl px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-6 sm:px-6 sm:pt-10 lg:px-8">
        <div className="mb-4 flex items-center justify-between gap-3">
          <Link
            href={venueHref}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Venue
          </Link>
          <Link
            href={mapHref}
            className="inline-flex min-h-10 items-center gap-2 rounded-full border border-cyan-300/16 bg-cyan-500/[0.08] px-4 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100 transition hover:border-cyan-300/28 hover:bg-cyan-500/[0.12]"
          >
            <MapPin className="h-4 w-4" />
            Map
          </Link>
        </div>

        <section className={`${raisedPanelClass} px-5 py-7 sm:px-8 sm:py-8`}>
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_90%_12%,rgba(245,197,24,0.11),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,transparent_45%,rgba(0,0,0,0.24)_100%)]" />
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/34 to-transparent" />
          <div className="relative grid gap-6 lg:grid-cols-[1fr_0.72fr] lg:items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-300/20 bg-cyan-500/[0.09] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-cyan-100">
                <Users className="h-4 w-4" />
                Guest Mission
              </div>
              <h1 className="mt-4 text-4xl font-black uppercase italic leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl">
                {mission.missionTitle}
              </h1>
              <p className="mt-4 max-w-2xl text-base leading-7 text-white/64">
                {mission.guestMission}
              </p>
              <div className="mt-5 flex flex-wrap gap-2">
                {[mission.statusLabel, mission.urgencyLabel, mission.perkLabel].map((chip) => (
                  <span
                    key={chip}
                    className="rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[9px] font-black uppercase tracking-[0.16em] text-white/58 shadow-[inset_0_1px_0_rgba(255,255,255,0.07)]"
                  >
                    {chip}
                  </span>
                ))}
              </div>
            </div>

            <div className={`${insetCardClass} px-4 py-4`}>
              <p className="text-[10px] font-black uppercase tracking-[0.22em] text-white/34">One-night pilot</p>
              <p className="mt-3 text-2xl font-black text-white">Keep it light.</p>
              <p className="mt-2 text-sm leading-6 text-white/56">
                No big campaign setup. One action, one perk, one receipt. If people join, repeat it.
              </p>
              <div className="mt-5 grid gap-2">
                <SquircleLink
                  href={launchHref}
                  label="Request Setup"
                  tone="yellow"
                  fullWidth
                  height={46}
                  labelClassName="text-[0.7rem] tracking-[0.06em] sm:text-[0.78rem]"
                >
                  Request Setup
                  <ArrowRight className="h-4 w-4" />
                </SquircleLink>
                <Link
                  href={venueHref}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] px-4 text-[11px] font-black uppercase tracking-[0.16em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
                >
                  Open Venue
                </Link>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-5 grid gap-3 md:grid-cols-3">
          {steps.map((step, index) => (
            <div key={step.title} className={`${insetCardClass} px-4 py-4`}>
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-cyan-200/16 bg-cyan-300/[0.08] text-xs font-black text-cyan-100">
                  {index + 1}
                </span>
                <h2 className="text-base font-black text-white">{step.title}</h2>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/54">{step.detail}</p>
            </div>
          ))}
        </section>

        <section className={`${raisedPanelClass} mt-5 px-5 py-5 sm:px-7`}>
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/24 to-transparent" />
          <div className="relative flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[#f5c518]/18 bg-[#f5c518]/[0.08] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.2em] text-[#f8dd72]">
                <Sparkles className="h-4 w-4" />
                Venue value
              </div>
              <h2 className="mt-3 text-2xl font-black text-white">Guest energy without a heavy creator buy.</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-white/58">
                Creators can seed the night, but guests make the venue feel alive. The perk is the hook; the receipt is the memory.
              </p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 md:min-w-[24rem]">
              {['Low spend', 'Proofable', 'Repeatable'].map((label) => (
                <div key={label} className="rounded-[18px] border border-white/8 bg-white/[0.035] px-3 py-3">
                  <CheckCircle2 className="h-4 w-4 text-emerald-200" />
                  <p className="mt-2 text-sm font-black text-white">{label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>
      </main>
    </VenuePageShell>
  );
}
