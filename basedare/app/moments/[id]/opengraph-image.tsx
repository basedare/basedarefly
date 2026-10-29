import { ImageResponse } from "next/og";
import { getPublicMoment } from "@/lib/moment-server";
import { adventureTemplate } from "@/lib/adventure-sharing";
export const dynamic = "force-dynamic";
export const alt = "A BaseDare Moment. Your turn to play.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function MomentImage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const post = await getPublicMoment((await params).id);
  if (!post)
    return new Response("Not found", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          width: "100%",
          height: "100%",
          padding: 70,
          background: "linear-gradient(135deg, #281440, #080b16 70%)",
          color: "#fff",
          border: "3px solid #bc93ef",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 30,
            color: "#f7cf4b",
            letterSpacing: 5,
          }}
        >
          BASEDARE · COMMUNITY MOMENT
        </div>
        <div
          style={{
            display: "flex",
            fontSize: 70,
            fontWeight: 900,
            lineHeight: 1.08,
          }}
        >
          {adventureTemplate(post.activityId)!.title}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 46,
              fontWeight: 800,
              color: "#f7cf4b",
            }}
          >
            YOUR TURN. PLAY FREE →
          </div>
          <div style={{ display: "flex", fontSize: 22, color: "#aee8ee" }}>
            Reviewed for display
          </div>
        </div>
      </div>
    ),
    { ...size, headers: { "Cache-Control": "private, no-store" } },
  );
}
