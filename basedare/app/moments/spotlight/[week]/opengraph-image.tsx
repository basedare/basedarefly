import { adventureOg } from "@/lib/adventure-og";
import { getWeeklySpotlight } from "@/lib/moment-spotlight-server";
import { adventureTemplate } from "@/lib/adventure-sharing";
export const dynamic = "force-dynamic";
export const alt =
  "BaseDare Weekly Spotlight. An editorial pick, not a competition result.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({
  params,
}: {
  params: Promise<{ week: string }>;
}) {
  const selection = await getWeeklySpotlight((await params).week);
  if (!selection)
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  const response = await adventureOg({
    eyebrow: "WEEKLY SPOTLIGHT",
    title: adventureTemplate(selection.post.activityId)!.title,
    invitation: `${selection.post.creatorTag} · An editor’s pick. What would your version look like?`,
    footer: selection.week.label + " · Free to try",
  });
  const latest = await getWeeklySpotlight(selection.week.key);
  if (
    !latest ||
    latest.post.id !== selection.post.id ||
    latest.post.creatorTag !== selection.post.creatorTag
  )
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
