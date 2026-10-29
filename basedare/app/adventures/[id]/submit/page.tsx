import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { adventureTemplate } from "@/lib/adventure-sharing";
import { adventureHref } from "@/lib/adventure-progress";
import MomentSubmit from "@/components/adventures/MomentSubmit";
export const metadata = {
  title: "Share your take | BaseDare",
  robots: { index: false, follow: false },
};
export default async function SubmitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const activity = adventureTemplate(id);
  if (!activity) notFound();
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-2xl px-4 pb-32 text-white">
      <Link
        href={adventureHref(id)}
        className="inline-flex min-h-12 items-center text-sm font-bold text-cyan-100"
      >
        ← {activity.title}
      </Link>
      <div className="bd-surface mt-4 p-5 sm:p-7">
        <h1 className="text-3xl font-black">Show us your version.</h1>
        <p className="mt-3 text-base leading-7 text-white/65">
          For “{activity.title}”. Playing and finishing don’t require a public
          post. This optional step sends your creation for display review.
        </p>
        <Suspense fallback={<p>Opening submission…</p>}>
          <MomentSubmit activityId={id} />
        </Suspense>
      </div>
    </main>
  );
}
