import Link from "next/link";
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
  if (!selection) return <Link href="/moments/spotlight" className="mt-4 inline-flex min-h-11 items-center text-sm font-bold text-violet-100">How creator Spotlight works →</Link>;
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
