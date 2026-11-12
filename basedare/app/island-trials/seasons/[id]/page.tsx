import { notFound } from "next/navigation";
import Link from "@/components/DiscoveryLink";
import { getPublicPilot } from "@/lib/contribution-pilot-server";
import { pilotIdSchema } from "@/lib/contribution-pilot";
import { ACTIVITY_SUGGESTIONS } from "@/lib/home-activities";
import { adventureHref } from "@/lib/adventure-progress";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Island Trials contribution pilot | BaseDare",
  robots: { index: false, follow: false },
};
export default async function ContributionSeason({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const parsed = pilotIdSchema.safeParse((await params).id);
  const pilot = parsed.success ? await getPublicPilot(parsed.data) : null;
  if (!pilot) notFound();
  const format = (s: string) =>
    new Intl.DateTimeFormat("en", {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: "UTC",
    }).format(new Date(s)) + " UTC";
  const venueSlug = pilot.venue?.href.split("/venues/")[1];
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-3xl px-4 pb-28 text-white">
      <Link
        href="/island-trials"
        className="inline-flex min-h-11 items-center text-sm font-bold text-cyan-100"
      >
        ← Island Trials
      </Link>
      <section className="bd-surface mt-4 p-5 sm:p-8">
        <p className="text-xs font-bold uppercase tracking-widest text-amber-100">
          Contribution pilot · non-cash XP
        </p>
        <h1 className="mt-3 break-words text-3xl font-black sm:text-5xl">
          {pilot.title}
        </h1>
        <p className="mt-4 whitespace-pre-wrap break-words text-base leading-7 text-white/75">
          {pilot.description}
        </p>
        <p className="mt-4 text-sm leading-6 text-white/60">
          {format(pilot.startsAt)} – {format(pilot.endsAt)}
        </p>
        {pilot.venue ? (
          <Link
            href={pilot.venue.href}
            className="inline-flex min-h-11 items-center font-bold text-cyan-100"
          >
            At {pilot.venue.name} →
          </Link>
        ) : null}
        <p className="mt-4 text-sm leading-6 text-white/65">{pilot.notice}</p>
      </section>
      <section className="bd-surface mt-5 p-5">
        <h2 className="text-xl font-black">Choose an eligible adventure</h2>
        <p className="mt-2 text-sm leading-6 text-white/65">
          Trying an adventure is free and does not require a public post. XP is
          awarded separately after eligible evidence is reviewed, under this
          pilot’s rules.
        </p>
        <div className="mt-3 grid gap-2">
          {pilot.activityIds.map((id) => {
            const a = ACTIVITY_SUGGESTIONS.find((a) => a.id === id);
            return a ? (
              <Link
                key={id}
                href={adventureHref(id, venueSlug)}
                className="bd-action !justify-start !text-sm"
              >
                {a.title} · about {a.minutes} min →
              </Link>
            ) : null;
          })}
        </div>
        <details className="mt-4 text-sm leading-6 text-white/65">
          <summary className="min-h-11 cursor-pointer py-2 font-bold text-amber-100">
            How recognition works
          </summary>
          <p>
            Reviewed creation: {pilot.rules.reviewedCreationXp} XP. This
            recognizes creation, not attendance.
          </p>
          <p>
            Confirmed eligible QR + GPS visit: {pilot.rules.venueVisitXp} XP.
            Scanning an invitation alone does not qualify.
          </p>
          <p>
            Maximum {pilot.rules.maxXpPerPerson} XP per person in this pilot.{" "}
            {pilot.rules.repeatRule}
          </p>
          <p>
            Clicks, personal step completion, likes and follower counts do not
            earn these XP. Withdrawn or invalid evidence loses public
            eligibility; corrections remain auditable.
          </p>
        </details>
      </section>
      <section
        className="bd-surface mt-5 p-5"
        aria-label="Pilot contribution standings"
      >
        <h2 className="text-xl font-black">Contributors</h2>
        <p className="mt-2 text-sm leading-6 text-white/60">
          Public names are opt-in. Rankings recognize eligible contributions and
          are not a prize allocation.
        </p>
        {!pilot.standingsAvailable ? (
          <p role="status" className="mt-4 text-sm text-amber-100">
            Standings could not be represented completely. No zero or partial
            total is shown.
          </p>
        ) : !pilot.standings?.length ? (
          <p className="mt-4 text-sm text-white/65">
            No eligible, opted-in contributions to display yet.
          </p>
        ) : (
          <ol className="mt-4 space-y-2">
            {pilot.standings.map((row) => (
              <li
                key={row.profileHref}
                className="bd-well flex items-center gap-3 p-3"
              >
                <span className="text-sm text-white/50">{row.rank}</span>
                <Link
                  href={row.profileHref}
                  className="min-w-0 flex-1 break-words py-2 font-bold text-cyan-100"
                >
                  {row.tag}
                </Link>
                <div className="shrink-0 text-right">
                  <p className="font-black text-amber-100">{row.xp} XP</p>
                  <p className="text-xs text-white/55">
                    {row.contributions} contribution
                    {row.contributions === 1 ? "" : "s"}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="mt-4 text-xs text-white/45">
          Updated {format(pilot.asOf)}
        </p>
        <Link
          href="/contact"
          className="mt-2 inline-flex min-h-11 items-center text-sm font-bold text-cyan-100"
        >
          Questions or want your name hidden? Contact BaseDare →
        </Link>
      </section>
    </main>
  );
}
