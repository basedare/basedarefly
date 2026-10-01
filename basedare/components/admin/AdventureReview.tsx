"use client";
import { useState } from "react";
import { useSessionAdminSecret } from "@/hooks/useSessionAdminSecret";
type Review = {
  id: string;
  caption: string;
  activityId: string;
  venueSlug: string;
  mediaUrl: string;
  mediaType: string;
  promotionContact: boolean;
};
export default function AdventureReview() {
  const { adminSecret, setAdminSecret, ensureAdminSession } =
    useSessionAdminSecret();
  const [posts, setPosts] = useState<Review[]>([]);
  const [status, setStatus] = useState("PENDING");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [reasons, setReasons] = useState<Record<string, string>>({});
  async function load() {
    setBusy(true);
    try {
      if (!(await ensureAdminSession()))
        throw Error("Sign in as an administrator.");
      const r = await fetch("/api/admin/adventures?status=" + status);
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setPosts(b.data);
      setMessage(b.data.length ? "" : "No submissions in this queue.");
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : "Could not load review queue.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="mx-auto min-h-screen max-w-4xl px-4 py-8 text-white">
      <h1 className="text-3xl font-black">Adventure review</h1>
      <p className="my-4 text-sm text-white/60">
        Check that the media matches the activity and place, is suitable for
        public display, and does not reveal private information or infringe
        anyone’s rights. Approval is not verified attendance, a reward, or a
        promotional licence.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Admin secret"
          type="password"
          value={adminSecret}
          onChange={(e) => setAdminSecret(e.target.value)}
          className="rounded-xl bg-black/40 p-3"
          placeholder="Admin secret"
        />
        <select
          aria-label="Review queue"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPosts([]);
          }}
          className="rounded-xl bg-black p-3"
        >
          <option value="PENDING">Waiting for review</option>
          <option value="APPROVED">Published</option>
        </select>
        <button
          disabled={busy}
          onClick={() => void load()}
          className="bd-action min-h-11 rounded-full bg-yellow-300 px-5 text-black"
        >
          Load queue
        </button>
      </div>
      <p role="status" className="my-4 text-amber-100">
        {message}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {posts.map((p) => (
          <article
            key={p.id}
            className="rounded-2xl border border-white/15 bg-black/60 p-5"
          >
            {p.mediaType === "VIDEO" ? (
              <video
                src={p.mediaUrl}
                controls
                preload="none"
                className="w-full"
              />
            ) : (
              <img src={p.mediaUrl} alt={p.caption} className="w-full" />
            )}
            <h2 className="mt-3 font-bold">
              {p.activityId} · {p.venueSlug}
            </h2>
            <p className="my-3">{p.caption}</p>
            <p className="text-xs text-white/60">
              {p.promotionContact
                ? "Open to a separate reuse request"
                : "Display only; no promotional reuse permission"}
            </p>
            <label className="mt-3 block text-sm">
              Review note
              <input
                className="mt-2 min-h-11 w-full rounded-xl bg-white/10 px-3"
                value={reasons[p.id] ?? ""}
                onChange={(e) =>
                  setReasons({ ...reasons, [p.id]: e.target.value })
                }
              />
            </label>
            <div className="mt-3 flex gap-3">
              {(status === "PENDING"
                ? ["APPROVED", "REJECTED"]
                : ["REJECTED"]
              ).map((decision) => (
                <button
                  key={decision}
                  disabled={busy || !reasons[p.id]?.trim()}
                  className="bd-action min-h-11 rounded-full border border-white/20 px-4 disabled:opacity-40"
                  onClick={async () => {
                    setBusy(true);
                    try {
                      const r = await fetch("/api/admin/adventures", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          id: p.id,
                          status: decision,
                          reason: reasons[p.id],
                        }),
                      });
                      const b = await r.json();
                      if (!r.ok) throw Error(b.error);
                      await load();
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : "Review failed.",
                      );
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  {decision === "APPROVED" ? "Publish" : "Remove / decline"}
                </button>
              ))}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
