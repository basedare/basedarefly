import { Suspense } from "react";
import Link from "next/link";
import SharedAdventures from "@/components/adventures/SharedAdventures";
export const metadata = {
  title: "Community Moments | BaseDare",
  description:
    "Real contributions, reviewed for display. Find a challenge worth trying yourself.",
};
export default function MomentsPage() {
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-5xl px-4 pb-32 text-white">
      <Link
        className="inline-flex min-h-12 items-center text-sm text-cyan-100"
        href="/community"
      >
        ← Community
      </Link>
      <h1 className="mt-3 text-4xl font-black">Someone tried it. Your turn?</h1>
      <p className="mt-3 max-w-xl text-base leading-7 text-white/65">
        Explore people’s takes on BaseDare challenges. Free to try, with sharing
        entirely up to you.
      </p>
      <Suspense fallback={<p className="mt-5">Opening Moments…</p>}>
        <SharedAdventures />
      </Suspense>
    </main>
  );
}
