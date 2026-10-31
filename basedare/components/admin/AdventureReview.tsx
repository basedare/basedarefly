"use client";
import { useRef, useState } from "react";
import { useSessionAdminSecret } from "@/hooks/useSessionAdminSecret";
import type { AdventurePost } from "@/lib/adventure-sharing";
import MomentMedia from "@/components/adventures/MomentMedia";
import type { spotlightWeek } from "@/lib/moment-motivation";
type Review = AdventurePost & {
  spotlightConsent: boolean;
  creditAllowed: boolean;
  legacyPublicMedia: boolean;
};
export default function AdventureReview() {
  const { adminSecret, setAdminSecret, ensureAdminSession } =
    useSessionAdminSecret();
  const [posts, setPosts] = useState<Review[]>([]),
    [status, setStatus] = useState("PENDING"),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [reasons, setReasons] = useState<Record<string, string>>({});
  const currentQueue = useRef(status);
  const [spotlight, setSpotlight] = useState<
    (ReturnType<typeof spotlightWeek> & { selectedId: string | null }) | null
  >(null);
  currentQueue.current = status;
  async function load() {
    const queue = status;
    setBusy(true);
    setMessage("");
    try {
      if (!(await ensureAdminSession()))
        throw Error("Sign in as an administrator.");
      const r = await fetch("/api/admin/adventures?status=" + queue, {
        cache: "no-store",
        signal: AbortSignal.timeout(10000),
      });
      const b = await r.json();
      if (!r.ok || !b.success) throw Error(b.error || "Queue unavailable.");
      if (currentQueue.current === queue) {
        setPosts(b.data);
        setSpotlight(b.spotlight ?? null);
        setMessage(b.data.length ? "" : "No submissions in this queue.");
      }
    } catch (e) {
      if (currentQueue.current === queue)
        setMessage(e instanceof Error ? e.message : "Could not load queue.");
    } finally {
      setBusy(false);
    }
  }
  async function decide(
    id: string,
    change: { status?: string; featured?: boolean }
  ) {
    setBusy(true);
    setMessage("");
    try {
      if (!(await ensureAdminSession()))
        throw Error("Sign in as an administrator.");
      const r = await fetch("/api/admin/adventures", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id,
          ...change,
          reason: reasons[id],
          ...(change.featured === true
            ? { spotlightWeek: spotlight?.key }
            : {}),
        }),
        signal: AbortSignal.timeout(10000),
      });
      const b = await r.json();
      if (!r.ok || !b.success) throw Error(b.error || "Review failed.");
      await load();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Review failed.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="bd-page-top mx-auto min-h-screen max-w-4xl px-4 pb-24 text-white">
      <h1 className="text-3xl font-black">Moment review</h1>
      <p className="my-4 text-sm leading-6 text-white/65">
        Open the original post or private file. Check the exact challenge,
        permissions, suitability and private details. Social links don’t verify
        account ownership or presence. Approval grants display only—no
        attendance, payment, reposting or commercial rights.
      </p>
      <div className="flex flex-wrap gap-3">
        <input
          aria-label="Admin secret"
          type="password"
          value={adminSecret}
          onChange={(e) => {
            setAdminSecret(e.target.value);
            setPosts([]);
          }}
          className="min-h-12 min-w-0 rounded-xl bg-black/40 p-3"
          placeholder="Admin secret"
        />
        <select
          aria-label="Review queue"
          disabled={busy}
          value={status}
          onChange={(e) => {
            setStatus(e.target.value);
            setPosts([]);
          }}
          className="min-h-12 rounded-xl bg-black p-3"
        >
          {["PENDING", "FLAGGED", "APPROVED", "REJECTED", "WITHDRAWN"].map(
            (value) => (
              <option key={value}>{value}</option>
            )
          )}
        </select>
        <button
          disabled={busy}
          onClick={() => void load()}
          className="bd-action bd-action--gold min-h-12 !text-sm"
        >
          {busy ? "Working…" : "Load queue"}
        </button>
      </div>
      <p role="status" className="my-4 text-sm text-amber-100">
        {message}
      </p>
      {spotlight ? (
        <aside className="bd-well mb-5 p-4 text-sm leading-6">
          <h2 className="font-bold text-violet-100">
            Weekly Spotlight · one editorial pick
          </h2>
          <p className="mt-2 text-white/65">
            {spotlight.label}. Choose an approved creation with current
            spotlight and creator-credit permission. Selecting another replaces
            this week’s pick. This is not a contest or a prize.
          </p>
          {spotlight.selectedId ? (
            <a
              href={spotlight.href}
              className="mt-2 inline-flex min-h-11 items-center font-bold text-cyan-100"
            >
              View this week’s selection →
            </a>
          ) : (
            <p className="mt-2 text-white/65">
              No eligible creation selected this week.
            </p>
          )}
        </aside>
      ) : null}
      <div className="grid gap-5 sm:grid-cols-2">
        {posts.map((p) => (
          <article key={p.id} className="bd-surface min-w-0 overflow-hidden">
            <MomentMedia post={p} privateView adminPreview />
            <div className="p-5">
              <h2 className="font-bold">{p.activityId}</h2>
              <p className="mt-2 text-sm text-cyan-100">
                {p.venue?.name ?? "Anywhere challenge · no venue"} ·{" "}
                {p.creatorTag ?? "No authorized creator credit"}
              </p>
              <p className="my-3 break-words text-base leading-7">
                {p.caption}
              </p>
              <p className="text-xs leading-5 text-white/55">
                {p.legacyPublicMedia
                  ? "Legacy media was previously publicly stored. "
                  : ""}
                Spotlight permission: {p.spotlightConsent ? "yes" : "no"}.
                Display permission never grants reuse rights.
              </p>
              {p.status !== "WITHDRAWN" ? (
                <>
                  <label className="mt-3 block text-sm">
                    Review reason
                    <input
                      minLength={3}
                      maxLength={300}
                      className="mt-2 min-h-12 w-full rounded-xl bg-white/10 p-3 text-base"
                      value={reasons[p.id] ?? ""}
                      onChange={(e) =>
                        setReasons({ ...reasons, [p.id]: e.target.value })
                      }
                    />
                  </label>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(["PENDING", "FLAGGED"].includes(p.status)
                      ? ["APPROVED", "REJECTED"]
                      : p.status === "APPROVED"
                      ? ["REJECTED"]
                      : []
                    ).map((decision) => (
                      <button
                        key={decision}
                        disabled={
                          busy || (reasons[p.id]?.trim().length ?? 0) < 3
                        }
                        className="bd-action min-h-12 !text-sm disabled:opacity-40"
                        onClick={() => void decide(p.id, { status: decision })}
                      >
                        {decision === "APPROVED"
                          ? "Publish Moment"
                          : "Decline / remove"}
                      </button>
                    ))}
                    {p.status === "APPROVED" &&
                    p.spotlightConsent &&
                    p.creditAllowed &&
                    p.creatorTag ? (
                      <button
                        disabled={
                          busy || (reasons[p.id]?.trim().length ?? 0) < 3
                        }
                        className="bd-action min-h-12 !text-sm disabled:opacity-40"
                        onClick={() =>
                          void decide(p.id, {
                            featured: spotlight?.selectedId !== p.id,
                          })
                        }
                      >
                        {spotlight?.selectedId === p.id
                          ? "Remove weekly Spotlight"
                          : p.featured
                          ? "Select for this week"
                          : "Select weekly Spotlight"}
                      </button>
                    ) : null}
                  </div>
                </>
              ) : (
                <p className="mt-3 text-sm text-white/50">
                  Withdrawn by contributor. Cannot republish.
                </p>
              )}
            </div>
          </article>
        ))}
      </div>
    </main>
  );
}
