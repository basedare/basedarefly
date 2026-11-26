import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { redirect } from "next/navigation";
import { getWeeklySpotlight } from "@/lib/moment-spotlight-server";
import { spotlightWeek } from "@/lib/moment-motivation";
export const dynamic = "force-dynamic";
export const metadata = { title: "Creator Spotlight | BaseDare", description: "A little recognition for a great creation. Play free, make your own take and optionally submit it for display review." };
export default async function SpotlightEntry() {
  const selection = await getWeeklySpotlight();
  if (selection) redirect(selection.week.href);
  return (
    <main className="mx-auto w-full max-w-5xl px-3 pb-12 pt-3 text-white sm:px-6 sm:pt-6 sm:pb-20">
      <Link href="/moments" className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-cyan-100"><ArrowLeft size={16} aria-hidden="true" /> Watch</Link>
      <section className="bd-surface mt-2 grid overflow-hidden md:grid-cols-[minmax(0,0.85fr)_minmax(0,1fr)]">
        <div aria-hidden="true" className="relative flex min-h-44 items-center justify-center overflow-hidden border-b border-violet-200/15 bg-[radial-gradient(ellipse_at_50%_52%,rgba(166,88,255,0.35),transparent_62%),linear-gradient(150deg,#171027,#080910)] md:min-h-[21rem] md:border-b-0 md:border-r">
          <div className="absolute h-40 w-40 rounded-full border border-violet-300/20 shadow-[0_0_45px_rgba(167,91,255,0.22)] sm:h-48 sm:w-48" />
          <div className="absolute h-32 w-32 rounded-full border border-dashed border-amber-200/35 sm:h-40 sm:w-40" />
          <Image src="/assets/peebear-head.webp" alt="" width={180} height={180} className="relative z-10 h-28 w-28 object-contain drop-shadow-[0_12px_24px_rgba(0,0,0,0.55)] sm:h-36 sm:w-36" />
          <span className="absolute left-3 top-3 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-amber-200"><Sparkles size={13} /> Editorial pick</span>
          <span className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-black/45 px-2 py-1 font-mono text-[10px] uppercase tracking-widest text-white/65">Awaiting selection</span>
        </div>
        <div className="min-w-0 p-4 sm:p-7">
          <p className="bd-page-kicker !text-amber-200">Creator Spotlight</p>
          <h1 className="mt-2 text-3xl font-black italic uppercase leading-[0.98] tracking-tight sm:text-5xl">Your take.<br /><span className="text-yellow-300">In the spotlight.</span></h1>
          <p className="mt-3 text-sm leading-6 text-white/75">Real creations, picked by BaseDare editors with your permission and creator credit.</p>
          <div className="mt-4 border-l-2 border-violet-400/60 pl-3">
            <p className="text-sm font-bold text-white">No creation selected for this week.</p>
            <p className="mt-1 text-xs leading-5 text-white/60">{spotlightWeek().label}</p>
          </div>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Link href="/earn" className="bd-action bd-action--gold w-full">Browse paid dares <ArrowRight size={15} aria-hidden="true" /></Link>
            <Link href="/adventures" className="bd-action bd-action--violet w-full">Try a free dare <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
          <p className="mt-4 text-xs leading-5 text-white/60">Sharing is optional. Selection is editorial, never guaranteed, and is not a competition, cash reward or promise of views.</p>
        </div>
      </section>
    </main>
  );
}
