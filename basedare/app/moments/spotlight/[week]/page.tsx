import Link from "next/link";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
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
    <main className="mx-auto w-full max-w-5xl px-3 pb-12 pt-3 text-white sm:px-6 sm:pt-6 sm:pb-20">
      <MomentViewed activityId={post.activityId} surface="spotlight" />
      <Link
        href="/moments"
        className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-cyan-100"
      >
        <ArrowLeft size={16} aria-hidden="true" /> Watch
      </Link>
      <article className="bd-surface mt-2 grid overflow-hidden md:grid-cols-[minmax(0,0.95fr)_minmax(0,1fr)] md:items-start">
        <div className="min-w-0 p-4 pb-3 sm:p-6 md:col-start-2 md:row-start-1 md:pb-3">
          <p className="bd-page-kicker !text-amber-200"><Sparkles size={14} aria-hidden="true" />
            {current ? "Spotlight · This week" : "Spotlight · Featured creation"}
          </p>
          <h1 className="mt-2 break-words text-3xl font-black leading-tight tracking-tight sm:text-4xl">
            {activity.title}
          </h1>
          <p className="mt-2 break-words text-sm font-bold text-violet-100">
            Created by {post.creatorTag}
          </p>
          <p className="mt-1 text-xs leading-5 text-white/65">{week.label}</p>
        </div>
        <div className="min-w-0 border-violet-200/10 bg-[radial-gradient(ellipse_at_50%_20%,rgba(166,88,255,0.18),transparent_70%)] p-2 md:col-start-1 md:row-span-2 md:row-start-1 md:border-r md:p-4">
          <MomentMedia post={post} presentation="spotlight" />
        </div>
        <div className="min-w-0 p-4 pt-3 sm:p-6 md:col-start-2 md:row-start-2 md:pt-0">
          <p className="whitespace-pre-wrap break-words text-base leading-7 text-white/85">
            {post.caption}
          </p>
          <a
            href={`/moments/${post.id}/try`}
            className="bd-action bd-action--gold mt-4 min-h-12 w-full !text-sm"
          >
            Try your own take · Free <ArrowRight size={15} aria-hidden="true" />
          </a>
          <p className="mt-3 text-xs leading-5 text-white/65">
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
          <p className="mt-3 border-t border-white/10 pt-3 text-xs leading-5 text-white/60">
            Picked by a BaseDare editor with permission. This is recognition, not a competition result, attendance check or paid reward. The creator keeps their rights.
          </p>
        </div>
      </article>
    </main>
  );
}
