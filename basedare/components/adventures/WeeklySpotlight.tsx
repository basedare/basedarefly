import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { getWeeklySpotlight } from "@/lib/moment-spotlight-server";
import { adventureTemplate } from "@/lib/adventure-sharing";
export default async function WeeklySpotlight() {
  let selection;
  try {
    selection = await getWeeklySpotlight();
  } catch {
    return (
      <p role="status" className="bd-well mt-5 p-4 text-sm text-white/65">
        The weekly Spotlight couldn’t load. You can still explore Moments below.
      </p>
    );
  }
  if (!selection) return (
    <Link href="/moments/spotlight" className="bd-card mt-4 flex min-h-16 items-center gap-3 px-4 py-3 text-sm transition-colors hover:border-violet-300/40 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-cyan-200">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-amber-200/20 bg-amber-200/10 text-amber-200"><Sparkles size={20} aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="block font-black text-white">Creator Spotlight</span><span className="mt-0.5 block text-xs text-white/65">No weekly pick yet.</span></span>
      <ArrowRight size={17} className="shrink-0 text-violet-200" aria-hidden="true" />
    </Link>
  );
  return (
    <aside
      className="bd-surface my-6 p-5 sm:p-7"
      aria-label="Weekly creator Spotlight"
    >
      <p className="text-sm font-bold text-amber-200">
        This week’s featured creation
      </p>
      <h2 className="mt-2 text-2xl font-black">
        {adventureTemplate(selection.post.activityId)!.title}
      </h2>
      <p className="mt-3 text-base leading-7 text-white/75">
        {selection.post.creatorTag} went first. What would your version look
        like?
      </p>
      <p className="mt-2 text-sm leading-6 text-white/55">
        {selection.week.label}. An editorial pick, with the creator’s
        permission.
      </p>
      <Link
        href={selection.week.href}
        className="bd-action bd-action--gold mt-4 min-h-12 !text-sm"
      >
        See the featured take →
      </Link>
    </aside>
  );
}
