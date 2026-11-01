import Link from "next/link";
import { notFound } from "next/navigation";
import { getMomentComparison } from "@/lib/moment-spotlight-server";
import { adventureTemplate } from "@/lib/adventure-sharing";
import MomentMedia from "@/components/adventures/MomentMedia";
import MomentReport from "@/components/adventures/MomentReport";
import MomentViewed from "@/components/adventures/MomentViewed";
import PlanShareButton from "@/components/community/PlanShareButton";
export const dynamic = "force-dynamic";
type Props = { params: Promise<{ id: string; otherId: string }> };
export async function generateMetadata({ params }: Props) {
  const { id, otherId } = await params;
  const pair = await getMomentComparison(id, otherId);
  if (!pair)
    return {
      title: "Creations unavailable | BaseDare",
      robots: { index: false, follow: false },
    };
  const title = `${
      adventureTemplate(pair.left.activityId)!.title
    } · Two takes | BaseDare`,
    description =
      "Same dare. Two real, approved creations. What would your version look like? Free to play.";
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: pair.href },
    openGraph: { title, description, url: pair.href },
    twitter: { card: "summary_large_image" as const, title, description },
  };
}
export default async function ComparisonPage({ params }: Props) {
  const { id, otherId } = await params;
  const pair = await getMomentComparison(id, otherId);
  if (!pair) notFound();
  const activity = adventureTemplate(pair.left.activityId)!;
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-5xl px-4 pb-32 text-white sm:px-6">
      <MomentViewed activityId={activity.id} surface="comparison" />
      <Link
        href={pair.left.momentHref!}
        className="inline-flex min-h-12 items-center text-sm text-cyan-100"
      >
        ← Original Moment
      </Link>
      <p className="mt-4 text-sm font-bold text-violet-200">
        Same dare. Two takes.
      </p>
      <h1 className="mt-3 text-3xl font-black sm:text-5xl">{activity.title}</h1>
      <p className="mt-4 max-w-2xl text-lg leading-8 text-white/75">
        One creation inspired another. Think you can bring a different twist?
      </p>
      <div className="mt-6 grid items-start gap-5 md:grid-cols-2">
        {[pair.left, pair.right].map((post, index) => (
          <article key={post.id} className="bd-surface min-w-0 overflow-hidden">
            <p className="p-4 text-sm font-bold text-amber-100">
              {index === 0 ? "The first take" : "The reply"} ·{" "}
              {post.creatorTag ?? "Community contributor"}
            </p>
            <MomentMedia post={post} />
            <div className="p-5">
              <p className="whitespace-pre-wrap break-words text-base leading-7 text-white/85">
                {post.caption}
              </p>
              <Link
                href={post.momentHref!}
                className="mt-3 inline-flex min-h-12 items-center text-sm font-bold text-cyan-100"
              >
                View this Moment →
              </Link>
              <MomentReport id={post.id} />
            </div>
          </article>
        ))}
      </div>
      <section className="bd-well mt-6 p-5 sm:p-7">
        <h2 className="text-2xl font-black">Make the next version.</h2>
        <p className="mt-3 text-base leading-7 text-white/70">
          Play for fun or challenge a willing friend. You keep your own
          progress. Both creations were reviewed for display; this comparison
          has no voting, scores, winner or prize.
        </p>
        <a
          href={`/moments/${pair.left.id}/try`}
          className="bd-action bd-action--gold mt-5 min-h-12 !text-base"
        >
          Play free · about {activity.minutes} min →
        </a>
        <div className="mt-4">
          <PlanShareButton
            href={pair.href}
            title={activity.title + " · Two takes"}
            text="Same dare. Two takes. What would your version look like?"
            label="Dare a friend to try"
            analyticsSource="moment_comparison"
          />
        </div>
      </section>
    </main>
  );
}
