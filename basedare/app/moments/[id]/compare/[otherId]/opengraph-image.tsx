import { adventureOg } from "@/lib/adventure-og";
import { getMomentComparison } from "@/lib/moment-spotlight-server";
import { adventureTemplate } from "@/lib/adventure-sharing";
export const dynamic = "force-dynamic";
export const alt = "Same dare. Two takes. Make your own on BaseDare.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image({
  params,
}: {
  params: Promise<{ id: string; otherId: string }>;
}) {
  const { id, otherId } = await params;
  const pair = await getMomentComparison(id, otherId);
  if (!pair)
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  const response = await adventureOg({
    eyebrow: "SAME DARE. TWO TAKES.",
    title: adventureTemplate(pair.left.activityId)!.title,
    invitation: `${pair.left.creatorTag ?? "A community contributor"} + ${
      pair.right.creatorTag ?? "a community contributor"
    }. Make the next version.`,
    footer: "Two approved creations · Free to play · No scores or prize",
  });
  const latest = await getMomentComparison(id, otherId);
  if (
    !latest ||
    latest.left.creatorTag !== pair.left.creatorTag ||
    latest.right.creatorTag !== pair.right.creatorTag
  )
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
