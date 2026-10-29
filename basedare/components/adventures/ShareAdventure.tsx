"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSocialAction } from "@/hooks/useSocialAction";
import {
  ADVENTURE_DISPLAY_CONSENT,
  ADVENTURE_MEDIA_LIMIT,
  adventureHashtag,
} from "@/lib/adventure-sharing";
import { publicSocialPost } from "@/lib/social-post-url";
const input =
  "mt-2 min-h-12 w-full rounded-xl border border-white/15 bg-black/30 p-3 text-base";
export default function ShareAdventure({
  activityId,
  runId,
  placeSlug,
  parentMomentId,
  initiallyOpen = false,
}: {
  activityId: string;
  runId: string;
  placeSlug?: string;
  parentMomentId?: string;
  initiallyOpen?: boolean;
}) {
  const { wallet, headers } = useSocialAction();
  const liveWallet = useRef(wallet);
  liveWallet.current = wallet;
  const [open, setOpen] = useState(initiallyOpen),
    [mode, setMode] = useState<"link" | "file">("link");
  const [query, setQuery] = useState(""),
    [places, setPlaces] = useState<
      { slug: string; name: string; city: string }[]
    >([]);
  const [place, setPlace] = useState(placeSlug ?? ""),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [sent, setSent] = useState(false);
  useEffect(() => {
    setSent(false);
    setMessage("");
    setBusy(false);
  }, [wallet, activityId, runId]);
  useEffect(() => {
    if (!open || query.trim().length < 2) {
      setPlaces([]);
      return;
    }
    const controller = new AbortController();
    const deadline = setTimeout(() => controller.abort(), 8000);
    const timer = setTimeout(() => {
      void fetch(
        "/api/adventure-submissions/places?q=" + encodeURIComponent(query),
        { signal: controller.signal },
      )
        .then(async (r) => {
          const b = await r.json();
          if (!r.ok || !b.success) throw Error();
          if (!controller.signal.aborted) setPlaces(b.data);
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setMessage("Could not search places. Leave it blank or retry.");
        })
        .finally(() => clearTimeout(deadline));
    }, 250);
    return () => {
      clearTimeout(timer);
      clearTimeout(deadline);
      controller.abort();
    };
  }, [query, open]);
  return (
    <section
      className="mt-5 border-t border-white/10 pt-5"
      aria-label="Optional Moment submission"
    >
      {!initiallyOpen ? (
        <button
          className="bd-action min-h-12 !text-sm"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
        >
          Share your take · optional
        </button>
      ) : null}
      {open ? (
        <div className="mt-4 space-y-4">
          <h2 className="text-xl font-black">
            Your take could start the next adventure.
          </h2>
          <p className="text-sm leading-6 text-white/65">
            Already posted? Paste the full post link. Or send an original photo
            or short clip. After review it can become a BaseDare Moment with a
            link for others to try. #{adventureHashtag(activityId)}
          </p>
          {!wallet ? (
            <div className="bd-well p-4">
              <p className="text-sm leading-6 text-white/70">
                Playing stays free and open. Sign in only to send and manage a
                public contribution.
              </p>
              <button
                className="bd-action mt-3 min-h-12 !text-sm"
                onClick={() =>
                  window.dispatchEvent(new Event("basedare:sign-in"))
                }
              >
                Sign in to submit
              </button>
            </div>
          ) : sent ? (
            <p role="status" className="text-sm leading-6 text-emerald-200">
              {message}{" "}
              <Link href="/adventures?shared=mine" className="underline">
                My submissions →
              </Link>
            </p>
          ) : (
            <form
              key={`${wallet}:${activityId}:${runId}`}
              className="space-y-5"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const submittingWallet = wallet;
                if (mode === "link") {
                  form.delete("file");
                  const social = publicSocialPost(
                    String(form.get("socialUrl") ?? ""),
                  );
                  if (!social) {
                    setMessage(
                      "Use a full public TikTok video, Instagram post/Reel or X post link.",
                    );
                    return;
                  }
                  form.set("socialUrl", social.url);
                } else {
                  form.delete("socialUrl");
                  const file = form.get("file");
                  if (
                    !(file instanceof File) ||
                    !file.size ||
                    file.size > ADVENTURE_MEDIA_LIMIT
                  ) {
                    setMessage("Choose an original photo or video under 4 MB.");
                    return;
                  }
                }
                setBusy(true);
                setMessage("");
                const controller = new AbortController();
                const deadline = setTimeout(() => controller.abort(), 35000);
                try {
                  form.set("wallet", submittingWallet);
                  form.set("activityId", activityId);
                  form.set("runId", runId);
                  if (place) form.set("venueSlug", place);
                  if (parentMomentId)
                    form.set("parentMomentId", parentMomentId);
                  const auth = await headers("adventure:submit");
                  if (liveWallet.current !== submittingWallet) return;
                  const r = await fetch("/api/adventure-submissions", {
                    method: "POST",
                    headers: auth,
                    body: form,
                    signal: controller.signal,
                  });
                  const b = await r.json();
                  if (!r.ok || !b.success)
                    throw Error(b.error || "Could not submit.");
                  if (liveWallet.current === submittingWallet) {
                    setSent(true);
                    setMessage(
                      b.data.status === "APPROVED"
                        ? "This contribution is already published."
                        : b.data.status === "PENDING"
                          ? "Saved privately for review. Nothing is published yet."
                          : "This attempt already has a submission. Check its current status.",
                    );
                  }
                } catch (err) {
                  if (liveWallet.current === submittingWallet)
                    setMessage(
                      controller.signal.aborted
                        ? "The response timed out. Check My submissions before retrying; this attempt won’t be added twice."
                        : err instanceof Error
                          ? err.message
                          : "Could not submit. Please retry.",
                    );
                } finally {
                  clearTimeout(deadline);
                  if (liveWallet.current === submittingWallet) setBusy(false);
                }
              }}
            >
              <fieldset>
                <legend className="text-sm font-bold">
                  What would you like to share?
                </legend>
                <div className="mt-2 flex flex-wrap gap-2">
                  {(["link", "file"] as const).map((choice) => (
                    <button
                      key={choice}
                      type="button"
                      aria-pressed={mode === choice}
                      className={
                        "bd-action min-h-12 !text-sm " +
                        (mode === choice ? "bd-action--cyan" : "")
                      }
                      onClick={() => setMode(choice)}
                    >
                      {choice === "link" ? "Public post link" : "Original file"}
                    </button>
                  ))}
                </div>
              </fieldset>
              {mode === "link" ? (
                <label className="block text-sm font-bold">
                  TikTok, Instagram or X post
                  <input
                    className={input}
                    type="url"
                    name="socialUrl"
                    maxLength={1024}
                    required
                    placeholder="https://www.instagram.com/reel/…"
                  />
                  <span className="mt-2 block text-xs font-normal leading-5 text-white/55">
                    Full post URLs only. BaseDare links to the original; it
                    doesn’t copy it or verify ownership of the social account.
                  </span>
                </label>
              ) : (
                <label className="block text-sm font-bold">
                  Original photo or short clip
                  <input
                    className={input}
                    name="file"
                    type="file"
                    required
                    accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm"
                  />
                  <span className="mt-2 block text-xs font-normal leading-5 text-white/55">
                    Up to 4 MB. Stored privately for review, then displayed only
                    while approved. Leave out sensitive information, location
                    metadata and people without permission.
                  </span>
                </label>
              )}
              <label className="block text-sm font-bold">
                What happened?
                <textarea
                  name="caption"
                  required
                  maxLength={280}
                  className={input}
                  placeholder="The best bit, the plot twist, your verdict…"
                />
              </label>
              <details className="bd-well p-4">
                <summary className="min-h-11 cursor-pointer py-2 text-sm font-bold">
                  Add a place · optional
                </summary>
                <p className="mt-2 text-sm leading-6 text-white/60">
                  Only choose a real public place where this happened. A place
                  link isn’t verified attendance.
                </p>
                {place ? (
                  <p className="mt-3 break-words text-sm text-cyan-100">
                    {places.find((p) => p.slug === place)?.name ??
                      place.replaceAll("-", " ")}{" "}
                    <button
                      className="min-h-11 px-3 underline"
                      type="button"
                      onClick={() => {
                        setPlace("");
                        setQuery("");
                      }}
                    >
                      Remove
                    </button>
                  </p>
                ) : (
                  <>
                    <label className="block text-sm">
                      Search public places
                      <input
                        className={input}
                        value={query}
                        maxLength={80}
                        onChange={(e) => setQuery(e.target.value)}
                      />
                    </label>
                    {places.map((p) => (
                      <button
                        key={p.slug}
                        type="button"
                        className="block min-h-12 py-2 text-left text-sm text-cyan-100"
                        onClick={() => setPlace(p.slug)}
                      >
                        {p.name} · {p.city}
                      </button>
                    ))}
                  </>
                )}
              </details>
              <label className="flex gap-3 text-sm leading-6">
                <input
                  className="mt-1 size-5 shrink-0"
                  type="checkbox"
                  required
                  name="consent"
                  value={ADVENTURE_DISPLAY_CONSENT}
                />
                I made this, have permission from everyone featured, and allow
                BaseDare to display this contribution with its challenge and
                optional place. I can withdraw it from BaseDare; copies shared
                elsewhere may remain.
              </label>
              <label className="flex gap-3 text-sm leading-6">
                <input
                  className="mt-1 size-5 shrink-0"
                  type="checkbox"
                  name="creatorCreditConsent"
                  value="true"
                />
                Show my existing Baretag as creator credit, if I have one.
              </label>
              <label className="flex gap-3 text-sm leading-6">
                <input
                  className="mt-1 size-5 shrink-0"
                  type="checkbox"
                  name="spotlightConsent"
                  value="true"
                />
                Allow editorial spotlight inside BaseDare, with my creator
                credit. This grants no reposting, editing, advertising or
                commercial-use rights.
              </label>
              <label className="flex gap-3 text-sm leading-6">
                <input
                  className="mt-1 size-5 shrink-0"
                  type="checkbox"
                  name="promotionContact"
                  value="true"
                />
                BaseDare may ask me separately about promotional reuse. No
                rights are granted by this checkbox.
              </label>
              <button
                disabled={busy}
                className="bd-action bd-action--gold min-h-12 w-full !text-sm disabled:opacity-50"
              >
                {busy ? "Sending for review…" : "Submit for review"}
              </button>
              <p className="text-xs leading-5 text-white/50">
                A display review doesn’t verify attendance, social-account
                ownership, paid-task completion or a reward.
              </p>
              {message ? (
                <p role="status" className="text-sm leading-6 text-amber-100">
                  {message}
                </p>
              ) : null}
            </form>
          )}
        </div>
      ) : null}
    </section>
  );
}
