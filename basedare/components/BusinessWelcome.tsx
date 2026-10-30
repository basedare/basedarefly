import Link from "next/link";
import BusinessGoalPicker from "./BusinessGoalPicker";
import ActivationIntakeForm from "@/app/activations/ActivationIntakeForm";
import {
  BUSINESS_DEFINITION,
  BUSINESS_GOAL_ORDER,
  BUSINESS_REQUESTS,
  BUSINESS_STEPS,
  type BusinessRequestKind,
} from "@/lib/business-request";
type Context = {
  kind?: BusinessRequestKind;
  city?: string | null;
  venue?: string | null;
  venueId?: string | null;
  venueSlug?: string | null;
  creator?: string | null;
  source?: string | null;
};
export default function BusinessWelcome({
  kind,
  city,
  venue,
  venueId,
  venueSlug,
  creator,
  source,
}: Context) {
  const request = kind ? BUSINESS_REQUESTS[kind] : null;
  const allGoalsHref = city
    ? `/brands/portal?${new URLSearchParams({ city })}`
    : "/brands/portal";
  return (
    <main className="bd-page-top relative min-h-screen px-4 pb-24 text-white sm:px-6">
      <div
        className="bd-page-wash pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_25%_0%,rgba(139,92,246,0.10),transparent_50%)]"
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-5xl">
        {kind ? (
          <nav
            aria-label="Business navigation"
            className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm font-bold"
          >
            <Link
              className="inline-flex min-h-11 items-center text-white/60"
              href={kind ? allGoalsHref : "/"}
            >
              {kind ? "← All business goals" : "← Home"}
            </Link>
            <Link
              href="/brands/portal?workspace=1"
              className="inline-flex min-h-11 items-center text-cyan-100"
            >
              Existing workspace →
            </Link>
          </nav>
        ) : null}
        <section className="bd-surface p-5 sm:p-8">
          <p className="text-sm font-bold text-amber-100">
            BaseDare for businesses
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-black leading-tight tracking-tight sm:text-6xl">
            {request ? request.title : "Let’s grow your business."}
          </h1>
          {!request ? (
            <p className="mt-4 max-w-3xl text-sm leading-6 text-white/75 sm:text-base sm:leading-7">
              {BUSINESS_DEFINITION}
            </p>
          ) : null}
          {request ? (
            <p className="mt-3 text-base leading-7 text-violet-100">
              {request.outcome}
            </p>
          ) : (
            <div className="mt-6">
              <BusinessGoalPicker
                city={city}
                source={
                  source === "home-business"
                    ? "home-business"
                    : "buyer-workspace"
                }
              />
            </div>
          )}
        </section>
        {request && kind ? (
          <section
            className="bd-surface mt-6 p-5 sm:p-7"
            aria-labelledby="business-enquiry"
          >
            <h2 id="business-enquiry" className="text-2xl font-black">
              Tell us what you have in mind.
            </h2>
            <p className="mt-2 mb-6 text-sm leading-6 text-white/65">
              Just the essentials. We’ll use your contact details to reply about
              this enquiry.
            </p>
            <ActivationIntakeForm
              key={kind}
              routedMissionType={kind}
              routedGoal={request.goal}
              routedBudgetRange="discuss"
              routedPackageId="pilot-drop"
              routedBuyerType="other"
              routedCity={city}
              routedVenue={venue}
              routedVenueId={venueId}
              routedVenueSlug={venueSlug}
              routedCreator={creator}
              routedSource={source || "buyer-workspace"}
            />
          </section>
        ) : null}
        <section className="mt-6" aria-labelledby="business-next">
          <h2 id="business-next" className="text-xl font-black">
            How it works
          </h2>
          <ol className="mt-3 grid gap-3 sm:grid-cols-3">
            {BUSINESS_STEPS.map((step, i) => (
              <li key={step} className="bd-well flex items-start gap-3 p-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full border border-white/15 text-sm font-black text-amber-100">
                  {i + 1}
                </span>
                <span className="text-sm leading-6 text-white/80">{step}</span>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-sm leading-6 text-white/55">
            This is a request for a proposal. Nothing is published, charged or
            promised before scope, permissions, availability and costs are
            agreed.
          </p>
        </section>
        <details className="bd-surface mt-6 p-5">
          <summary className="min-h-11 cursor-pointer py-2 text-base font-bold">
            What could this look like for your business?
          </summary>
          <p className="mt-2 text-sm text-white/55">
            Illustrative ideas, not client results or available offers.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-3">
            {(kind ? [kind] : BUSINESS_GOAL_ORDER).map((id) => (
              <article key={id}>
                <h3 className="font-bold text-violet-100">
                  {BUSINESS_REQUESTS[id].title}
                </h3>
                <p className="mt-2 text-sm leading-6 text-white/70">
                  {BUSINESS_REQUESTS[id].example}
                </p>
              </article>
            ))}
          </div>
          <p className="mt-4 text-xs leading-5 text-white/50">
            No guaranteed visitors, views, sales or partnerships. Any paid work
            or venue offer needs its own approval and genuine funding.
          </p>
        </details>
        <details className="mt-5 text-sm text-white/65">
          <summary className="min-h-11 cursor-pointer py-3 font-bold">
            Already working with BaseDare?
          </summary>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link
              className="min-h-11 py-3 text-cyan-100"
              href="/brands/portal?workspace=1"
            >
              Open workspace & advanced tools →
            </Link>
            <Link className="min-h-11 py-3 text-cyan-100" href="/map">
              Find or manage your venue →
            </Link>
            <Link
              className="min-h-11 py-3 text-cyan-100"
              href="/activations?missionType=field-mission"
            >
              Request independent on-site checks →
            </Link>
          </div>
        </details>
      </div>
    </main>
  );
}
