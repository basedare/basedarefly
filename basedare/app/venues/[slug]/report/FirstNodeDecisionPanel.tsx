import { CheckCircle2, CircleHelp, FlaskConical, ShieldCheck } from 'lucide-react';

import type { FirstNodeDecisionBrief } from '@/lib/first-node-conversion';
import FirstNodeVenueResponse from './FirstNodeVenueResponse';

const evidenceTone = {
  VERIFIED: 'border-emerald-300/20 bg-emerald-300/[0.07] text-emerald-100',
  'PUBLIC SIGNAL': 'border-cyan-300/20 bg-cyan-300/[0.07] text-cyan-100',
  'PILOT PREVIEW — NOT YET FUNDED': 'border-amber-300/20 bg-amber-300/[0.07] text-amber-100',
} as const;

export default function FirstNodeDecisionPanel({
  brief,
  venue,
  audience,
}: {
  brief: FirstNodeDecisionBrief;
  venue: { id: string; slug: string; name: string; city: string | null };
  audience: 'venue' | 'sponsor';
}) {
  return (
    <section className="relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[radial-gradient(circle_at_10%_0%,rgba(34,211,238,0.09),transparent_34%),radial-gradient(circle_at_92%_12%,rgba(245,197,24,0.09),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.055),rgba(7,6,14,0.95))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32),inset_0_1px_0_rgba(255,255,255,0.09)] sm:p-7">
      <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-100/30 to-transparent" />
      <div className="relative grid gap-6 lg:grid-cols-[1.08fr_0.92fr]">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-white/60">
            <CircleHelp className="h-4 w-4 text-cyan-200" />
            First-node decision brief
          </div>
          <h2 className="mt-4 text-3xl font-black tracking-tight text-white sm:text-4xl">
            Decide whether one real question is worth funding.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">{brief.summary}</p>

          <div className="mt-5 grid gap-3">
            {brief.evidence.map((item) => (
              <article key={`${item.label}-${item.title}`} className={`rounded-[20px] border p-4 ${evidenceTone[item.label]}`}>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] opacity-70">{item.label}</p>
                <h3 className="mt-2 text-base font-black text-white">{item.title}</h3>
                <p className="mt-1 text-sm leading-6 text-white/58">{item.detail}</p>
              </article>
            ))}
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {[
              ['Question', brief.question],
              ['Action', brief.action],
              ['Evidence', brief.evidenceRequired],
              ['Decision', brief.decisionRule],
            ].map(([label, detail]) => (
              <div key={label} className="rounded-[20px] border border-white/[0.08] bg-black/28 p-4">
                <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/35">{label}</p>
                <p className="mt-2 text-sm font-bold leading-6 text-white/64">{detail}</p>
              </div>
            ))}
          </div>

          <div className="mt-5 rounded-[22px] border border-amber-300/15 bg-amber-300/[0.05] p-4">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-amber-100/72">
              <FlaskConical className="h-4 w-4" />
              Pilot boundary
            </div>
            <p className="mt-2 text-sm leading-6 text-white/58">{brief.budget}</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {brief.deliverables.map((item) => (
                <div key={item} className="flex gap-2 text-xs leading-5 text-white/58">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200/70" />
                  {item}
                </div>
              ))}
            </div>
            <div className="mt-4 border-t border-white/[0.08] pt-3">
              {brief.nonPromises.map((item) => (
                <div key={item} className="mt-1.5 flex gap-2 text-xs leading-5 text-white/44 first:mt-0">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-cyan-200/55" />
                  {item}
                </div>
              ))}
            </div>
          </div>
        </div>

        <FirstNodeVenueResponse
          venueId={venue.id}
          venueSlug={venue.slug}
          venueName={venue.name}
          city={venue.city}
          audience={audience}
          pilotQuestion={brief.question}
        />
      </div>
    </section>
  );
}
