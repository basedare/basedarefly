import Link from "next/link";
import { redirect } from "next/navigation";
import { getWeeklySpotlight } from "@/lib/moment-spotlight-server";
import { spotlightWeek } from "@/lib/moment-motivation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Creator Spotlight | BaseDare", description: "A little recognition for a great creation. Play free, make your own take and optionally submit it for display review." };
export default async function SpotlightEntry() {
  const selection = await getWeeklySpotlight();
  if (selection) redirect(selection.week.href);
  return <main className="bd-page-top mx-auto min-h-screen max-w-2xl px-4 pb-32 text-white">
    <Link href="/moments" className="inline-flex min-h-12 items-center text-sm text-cyan-100">← Community Moments</Link>
    <section className="bd-surface mt-4 p-5 sm:p-8">
      <p className="text-sm font-bold text-amber-200">Creator Spotlight</p>
      <h1 className="mt-3 text-3xl font-black sm:text-5xl">Great takes deserve a little spotlight.</h1>
      <p className="mt-5 text-lg leading-8 text-white/80">Make something funny, surprising or unmistakably you. If you choose to share it, a BaseDare editor can feature an approved creation—with your permission and creator credit.</p>
      <p className="bd-well mt-5 p-4 text-sm leading-6 text-white/65">No creation selected for {spotlightWeek().label} yet. Selection is editorial and never guaranteed. This isn’t a competition, cash reward or promise of views.</p>
      <Link href="/adventures" className="bd-action bd-action--gold mt-6 min-h-12 !text-base">Find a free dare →</Link>
      <p className="mt-3 text-sm leading-6 text-white/60">You can play, keep your personal card and challenge a friend without posting or signing in.</p>
    </section>
  </main>;
}
