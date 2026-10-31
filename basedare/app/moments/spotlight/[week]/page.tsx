import Link from "next/link";
import { notFound } from "next/navigation";
import { getWeeklySpotlight } from "@/lib/moment-spotlight-server";
import { adventureTemplate } from "@/lib/adventure-sharing";
import MomentMedia from "@/components/adventures/MomentMedia";
import MomentReport from "@/components/adventures/MomentReport";
import MomentViewed from "@/components/adventures/MomentViewed";
import PlanShareButton from "@/components/community/PlanShareButton";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const selection = await getWeeklySpotlight((await params).week);
  if (!selection)
    return {
      title: "Spotlight unavailable | BaseDare",
      robots: { index: false, follow: false },
    };
  const title = `${
    adventureTemplate(selection.post.activityId)!.title
  } · Weekly Spotlight | BaseDare`;
  const description = `An editorial pick for ${selection.week.label}. See the creation, then try your own version. Free to play; no prize competition.`;
  return {
    title,
    description,
    alternates: { canonical: selection.week.href },
    robots: { index: false, follow: true },
    openGraph: { title, description, url: selection.week.href },
    twitter: { card: "summary_large_image" as const, title, description },
  };
}
export default async function SpotlightPage({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const selection = await getWeeklySpotlight((await params).week);
  if (!selection) notFound();
  const { post, week, current } = selection;
  const activity = adventureTemplate(post.activityId)!;
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-2xl px-4 pb-32 text-white">
      <MomentViewed activityId={post.activityId} surface="spotlight" />
      <Link
        href="/moments"
        className="inline-flex min-h-12 items-center text-sm text-cyan-100"
      >
        ← Community Moments
      </Link>
      <article className="bd-surface mt-4 overflow-hidden">
        <div className="p-5 sm:p-7">
          <p className="text-sm font-bold text-amber-200">
            {current ? "This week’s featured creation" : "A featured creation"}
          </p>
          <h1 className="mt-3 text-3xl font-black sm:text-5xl">
            {activity.title}
          </h1>
          <p className="mt-4 text-base leading-7 text-white/70">{week.label}</p>
          <p className="mt-2 text-base font-bold text-violet-100">
            Created by {post.creatorTag}
          </p>
        </div>
        <MomentMedia post={post} />
        <div className="p-5 sm:p-7">
          <p className="whitespace-pre-wrap break-words text-lg leading-8">
            {post.caption}
          </p>
          <p className="mt-4 text-sm leading-6 text-white/60">
            Picked by a BaseDare editor with permission. Recognition for a
            creation—not a competition result, attendance check or paid reward.
            The creator keeps their rights.
          </p>
          <a
            href={`/moments/${post.id}/try`}
            className="bd-action bd-action--gold mt-6 min-h-12 w-full !text-base"
          >
            Think you can make your own? Play free →
          </a>
          <p className="mt-3 text-sm leading-6 text-white/60">
            About {activity.minutes} minutes. No account, filming or purchase
            required to play. Sharing and editorial selection are optional.
          </p>
          <div className="mt-4">
            <PlanShareButton
              href={week.href}
              title={activity.title + " · Weekly Spotlight"}
              text="A BaseDare editor picked this take. What would yours look like?"
              label="Share the Spotlight"
              analyticsSource="moment_spotlight"
            />
          </div>
          <Link
            href={post.momentHref!}
            className="mt-3 inline-flex min-h-12 items-center text-sm font-bold text-cyan-100"
          >
            View the original Moment →
          </Link>
          <MomentReport id={post.id} />
        </div>
      </article>
    </main>
  );
}
