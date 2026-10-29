import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  getPublicMoment,
  momentInclude,
  momentPosts,
} from "@/lib/moment-server";
import { adventureTemplate } from "@/lib/adventure-sharing";
import {
  MOMENT_REVIEW_LABEL,
  MOMENT_REVIEW_DETAIL,
} from "@/lib/adventure-evidence";
import MomentMedia from "@/components/adventures/MomentMedia";
import MomentViewed from "@/components/adventures/MomentViewed";
import MomentReport from "@/components/adventures/MomentReport";
import CreatorShareKit from "@/components/adventures/CreatorShareKit";
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const post = await getPublicMoment((await params).id);
  if (!post)
    return {
      title: "Moment unavailable | BaseDare",
      robots: { index: false, follow: false },
    };
  const title = `${adventureTemplate(post.activityId)!.title} · A BaseDare Moment`,
    description =
      "One person’s take. Your turn to play it free. Reviewed for display; not verified attendance or paid work.";
  return {
    title,
    description,
    robots: { index: false, follow: true },
    alternates: { canonical: post.momentHref },
    openGraph: { title, description, url: post.momentHref },
    twitter: { card: "summary_large_image" as const, title, description },
  };
}
export default async function MomentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const post = await getPublicMoment((await params).id);
  if (!post) notFound();
  const activity = adventureTemplate(post.activityId)!;
  const owner = await prisma.adventureSubmission.findUniqueOrThrow({
    where: { id: post.id },
    select: { wallet: true },
  });
  const rows = await prisma.adventureSubmission.findMany({
    where: {
      activityId: post.activityId,
      status: "APPROVED",
      wallet: { not: owner.wallet, mode: "insensitive" },
      OR: [
        { id: post.parentMomentId ?? "__none" },
        { parentMomentId: post.id },
      ],
    },
    include: momentInclude,
    orderBy: { createdAt: "asc" },
    take: 12,
  });
  const relay = await momentPosts(rows);
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-2xl px-4 pb-32 text-white sm:px-6">
      <MomentViewed activityId={post.activityId} />
      <Link
        href="/moments"
        className="inline-flex min-h-12 items-center text-sm font-bold text-white/65"
      >
        ← Community Moments
      </Link>
      <article className="bd-surface mt-4 overflow-hidden">
        <MomentMedia post={post} />
        <div className="p-5 sm:p-7">
          <p className="text-sm font-bold text-violet-200">
            {post.featured
              ? "Creator spotlight · permissioned editorial selection"
              : "A BaseDare Moment"}
          </p>
          <h1 className="mt-3 text-3xl font-black leading-tight sm:text-4xl">
            {activity.title}
          </h1>
          <p className="mt-5 whitespace-pre-wrap break-words text-lg leading-8 text-white/85">
            {post.caption}
          </p>
          <p className="mt-4 text-sm text-white/55">
            {post.creatorTag ? (
              <Link
                className="text-cyan-100"
                href={
                  "/creator/" +
                  encodeURIComponent(post.creatorTag.replace(/^@/, ""))
                }
              >
                {post.creatorTag}
              </Link>
            ) : (
              "Community contributor"
            )}{" "}
            ·{" "}
            {new Date(post.createdAt).toLocaleDateString("en-GB", {
              timeZone: "UTC",
            })}
          </p>
          {post.venue ? (
            <Link
              href={"/venues/" + encodeURIComponent(post.venue.slug)}
              className="mt-3 inline-flex min-h-11 items-center text-sm text-cyan-100"
            >
              At {post.venue.name} →
            </Link>
          ) : null}
          <aside className="bd-well mt-5 p-4" aria-label="Reality receipt">
            <p className="text-sm font-bold text-cyan-100">
              Reality receipt · {MOMENT_REVIEW_LABEL}
            </p>
            <p className="mt-2 text-sm leading-6 text-white/60">
              {MOMENT_REVIEW_DETAIL}
            </p>
          </aside>
          <a
            href={`/moments/${post.id}/try`}
            className="bd-action bd-action--gold mt-6 min-h-12 w-full !text-base"
          >
            Beat my dare · play free →
          </a>
          <p className="mt-3 text-sm leading-6 text-white/60">
            About {activity.minutes} minutes. Make your own attempt—no account,
            filming or purchase required. No cash or venue reward.
          </p>
          <CreatorShareKit activityId={post.activityId} momentId={post.id} />
          <MomentReport id={post.id} />
        </div>
      </article>
      {relay.length ? (
        <section className="bd-surface mt-5 p-5">
          <h2 className="text-xl font-black">Reality Relay</h2>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Independent, approved contributions to the same challenge. Each has
            its own review; there’s no contest or winner.
          </p>
          {relay.map((item) => (
            <Link
              className="mt-3 block min-h-12 rounded-xl border border-white/10 p-4 text-sm text-cyan-100"
              key={item.id}
              href={item.momentHref!}
            >
              {item.creatorTag ?? "A community contributor"}’s take →
            </Link>
          ))}
        </section>
      ) : null}
      <Link
        href={`/adventures/${post.activityId}/submit?moment=${post.id}`}
        className="mt-4 inline-flex min-h-12 items-center text-sm font-bold text-violet-100"
      >
        Made your own take? Submit it for review →
      </Link>
    </main>
  );
}
