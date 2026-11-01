"use client";
import { useState } from "react";
import Link from "next/link";
import PlanShareButton from "@/components/community/PlanShareButton";
import { adventureTemplate } from "@/lib/adventure-sharing";
import { adventureHref } from "@/lib/adventure-progress";
import { getBaseDareUrl } from "@/lib/social-share";
import { trackClientEvent } from "@/lib/analytics";
export default function CreatorShareKit({
  activityId,
  momentId,
}: {
  activityId: string;
  momentId?: string;
}) {
  const [message, setMessage] = useState("");
  const activity = adventureTemplate(activityId);
  if (!activity) return null;
  const href = momentId ? "/moments/" + momentId : adventureHref(activityId),
    url = getBaseDareUrl(href);
  const caption = `${momentId ? `Someone tried “${activity.title}”. Think you can bring a different twist?` : activity.creator?.caption ?? `I tried “${activity.title}”. Your turn?`} #BaseDare`;
  const invite = momentId ? `This is one take on ${activity.title}. What would yours look like? Play free on BaseDare.` : `Your turn: ${activity.title}. Play it free on BaseDare.`;
  return (
    <details className="bd-well mt-5 p-4 sm:p-5">
      <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold text-violet-100">
        Share kit · make it your own
      </summary>
      <p className="mt-2 text-sm leading-6 text-white/65">
        Keep the moment, pass on the dare. Filming, posting and tagging are
        optional.
      </p>
      <p className="mt-4 rounded-xl border border-white/10 bg-black/20 p-4 text-base leading-7">
        {caption}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button
          className="bd-action min-h-12 !text-sm"
          onClick={async () => {
            try {
              await navigator.clipboard.writeText(caption);
              setMessage("Caption copied.");
              trackClientEvent("adventure_share_kit_copied", {
                activity_id: activityId,
                method: "caption",
              });
            } catch {
              setMessage("Copying is unavailable. Select the caption above.");
            }
          }}
        >
          Copy caption
        </button>
        <PlanShareButton
          href={href}
          title={activity.title}
          text={invite}
          label="Share / message a friend"
          analyticsSource="moment_share_kit"
        />
        <PlanShareButton
          href={href}
          title={activity.title}
          text={invite}
          label="Copy challenge invite"
          copyOnly
          analyticsSource="moment_share_kit"
        />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-sm font-bold text-cyan-100">
        <a
          className="min-h-11 py-3"
          href={
            "https://wa.me/?text=" + encodeURIComponent(invite + "\n" + url)
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          WhatsApp ↗
        </a>
        <a
          className="min-h-11 py-3"
          href={
            "https://t.me/share/url?url=" +
            encodeURIComponent(url) +
            "&text=" +
            encodeURIComponent(invite)
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          Telegram ↗
        </a>
        <a
          className="min-h-11 py-3"
          href={
            "https://twitter.com/intent/tweet?text=" +
            encodeURIComponent(caption) +
            "&url=" +
            encodeURIComponent(url)
          }
          target="_blank"
          rel="noopener noreferrer"
        >
          Draft on X ↗
        </a>
      </div>
      <p className="text-xs leading-5 text-white/55">
        Use your phone’s share sheet for Messenger and other apps. Instagram and
        TikTok captions don’t always support clickable links—put the challenge
        link in a permitted bio or link sticker. Opening a draft or copying a
        link doesn’t send or publish it.
      </p>
      {activity.creator ? (
        <p className="mt-4 text-sm leading-6 text-white/70">
          <strong className="text-amber-100">Clip idea:</strong>{" "}
          {activity.creator.filming}
        </p>
      ) : null}
      <Link
        href={`/adventures/${activityId}/submit${momentId ? "?moment=" + momentId : ""}`}
        className="mt-3 inline-flex min-h-12 items-center text-sm font-bold text-violet-100"
      >
        Already made your take? Send it for review →
      </Link>
      {message ? (
        <p role="status" className="text-sm text-emerald-100">
          {message}
        </p>
      ) : null}
    </details>
  );
}
