"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useSocialAction } from "@/hooks/useSocialAction";
import {
  ADVENTURE_DISPLAY_CONSENT,
  ADVENTURE_MEDIA_LIMIT,
  adventureHashtag,
} from "@/lib/adventure-sharing";
export default function ShareAdventure({
  activityId,
  runId,
  placeSlug,
}: {
  activityId: string;
  runId: string;
  placeSlug?: string;
}) {
  const { wallet, headers } = useSocialAction();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [places, setPlaces] = useState<
    { slug: string; name: string; city: string }[]
  >([]);
  const [place, setPlace] = useState(placeSlug ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  useEffect(() => {
    if (!open || query.length < 2) {
      setPlaces([]);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch(
        "/api/adventure-submissions/places?q=" + encodeURIComponent(query),
        { signal: controller.signal },
      )
        .then((r) => r.json())
        .then((b) => {
          if (!b.success) throw Error(b.error);
          setPlaces(b.data);
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setMessage("Could not search places. Please retry.");
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, open]);
  return (
    <div className="mt-5 border-t border-white/10 pt-5">
      <button
        className="bd-action min-h-11 rounded-full border border-violet-200/30 bg-violet-300/10 px-5 text-sm font-bold"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
      >
        Share what you made · optional
      </button>
      {open ? (
        <div className="mt-4 space-y-4">
          <p className="text-sm text-white/65">
            Add your photo or short clip to this place. After review, others can
            discover it and try the same adventure. #
            {adventureHashtag(activityId)}
          </p>
          {!wallet ? (
            <button
              className="min-h-11 text-cyan-100 underline"
              onClick={() =>
                window.dispatchEvent(new Event("basedare:sign-in"))
              }
            >
              Sign in to submit
            </button>
          ) : sent ? (
            <p role="status" className="text-emerald-200">
              {message}{" "}
              <Link href="/adventures?shared=mine" className="underline">
                See my submissions
              </Link>
            </p>
          ) : (
            <form
              className="space-y-4"
              onSubmit={async (e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const file = form.get("file");
                if (
                  !(file instanceof File) ||
                  file.size > ADVENTURE_MEDIA_LIMIT
                ) {
                  setMessage("Choose a photo or short clip under 4 MB.");
                  return;
                }
                setBusy(true);
                setMessage("");
                try {
                  form.set("wallet", wallet);
                  form.set("activityId", activityId);
                  form.set("runId", runId);
                  form.set("venueSlug", place);
                  const r = await fetch("/api/adventure-submissions", {
                    method: "POST",
                    headers: await headers("adventure:submit"),
                    body: form,
                  });
                  const b = await r.json();
                  if (!r.ok || !b.success) throw Error(b.error);
                  setSent(true);
                  setMessage(
                    b.data.status === "APPROVED"
                      ? "Already published."
                      : "Saved. See your submission for its review status.",
                  );
                } catch (err) {
                  setMessage(
                    err instanceof Error
                      ? err.message
                      : "Could not submit. Please retry.",
                  );
                } finally {
                  setBusy(false);
                }
              }}
            >
              {place ? (
                <p className="text-sm text-cyan-100">
                  Place:{" "}
                  {places.find((p) => p.slug === place)?.name ??
                    place.replaceAll("-", " ")}{" "}
                  <button
                    type="button"
                    className="ml-3 underline"
                    onClick={() => setPlace("")}
                  >
                    Change
                  </button>
                </p>
              ) : (
                <label className="block text-sm">
                  Where did you do it?
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search for a public place"
                    className="mt-2 min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-3"
                  />
                  {places.map((p) => (
                    <button
                      type="button"
                      key={p.slug}
                      className="block min-h-11 text-left text-cyan-100"
                      onClick={() => setPlace(p.slug)}
                    >
                      {p.name} · {p.city}
                    </button>
                  ))}
                </label>
              )}
              <label className="block text-sm">
                Photo or short clip
                <input
                  name="file"
                  type="file"
                  accept="image/jpeg,image/png,image/gif,video/mp4,video/quicktime,video/webm"
                  required
                  className="mt-2 block w-full text-xs"
                />
                <span className="mt-2 block text-xs text-white/55">
                  Up to 4 MB. Uploads use publicly accessible media storage,
                  even before review. Don’t upload private footage.
                </span>
              </label>
              <label className="block text-sm">
                What did you discover?
                <textarea
                  name="caption"
                  required
                  maxLength={280}
                  className="mt-2 w-full rounded-xl border border-white/15 bg-black/30 p-3"
                />
              </label>
              <label className="flex gap-3 text-xs leading-5">
                <input
                  type="checkbox"
                  required
                  name="consent"
                  value={ADVENTURE_DISPLAY_CONSENT}
                />
                I made this and have permission from anyone featured. BaseDare
                may display it publicly with this adventure and place. I can
                withdraw it from BaseDare; copies shared elsewhere may remain.
              </label>
              <label className="flex gap-3 text-xs leading-5">
                <input type="checkbox" name="promotionContact" value="true" />
                BaseDare may ask me about promotional reuse. This does not give
                BaseDare or the venue permission to reuse my footage.
              </label>
              <button
                disabled={busy || !place}
                className="bd-action min-h-11 rounded-full bg-yellow-300 px-6 text-sm font-bold text-black disabled:opacity-40"
              >
                {busy ? "Submitting…" : "Submit for review"}
              </button>
              {message ? (
                <p role="status" className="text-sm text-amber-100">
                  {message}
                </p>
              ) : null}
            </form>
          )}
        </div>
      ) : null}
    </div>
  );
}
