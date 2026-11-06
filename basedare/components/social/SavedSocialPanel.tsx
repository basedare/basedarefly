"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/DiscoveryLink";
import { useSocialAccount } from "@/hooks/useSocialAccount";
import {
  type SocialReference,
  type SocialTarget,
} from "@/lib/social-retention";
type Row = SocialReference & { target: SocialTarget | null };
type Library = { follows: Row[]; saves: Row[] };
export default function SavedSocialPanel() {
  const { wallet } = useSocialAccount();
  return <Panel key={wallet ?? "guest"} />;
}
function Panel() {
  const { wallet, headers } = useSocialAccount();
  const [data, setData] = useState<Library>(),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState("");
  const alive = useRef(true),
    version = useRef(0),
    opened = useRef(false);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const load = useCallback(
    async (prompt = true) => {
      opened.current = true;
      if (!wallet) {
        window.dispatchEvent(new Event("basedare:sign-in"));
        return;
      }
      const current = ++version.current;
      setBusy(true);
      setMessage("");
      try {
        const auth = await headers("social:read", prompt);
        if (!alive.current) return;
        const r = await fetch("/api/social?view=library&wallet=" + wallet, {
          headers: auth,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        const b = await r.json();
        if (!r.ok || !b.success)
          throw Error(b.error || "Your saved items could not load.");
        if (alive.current && current === version.current) setData(b.data);
      } catch (e) {
        if (alive.current && current === version.current) {
          setData(undefined);
          setMessage(e instanceof Error ? e.message : "Could not load. Retry.");
        }
      } finally {
        if (alive.current && current === version.current) setBusy(false);
      }
    },
    [wallet, headers],
  );
  useEffect(() => {
    const refresh = () => {
      if (opened.current && document.visibilityState === "visible")
        void load(false);
    };
    window.addEventListener("basedare:social-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    const timer = setInterval(refresh, 60000);
    return () => {
      clearInterval(timer);
      window.removeEventListener("basedare:social-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  async function remove(row: Row, action: "unfollow" | "unsave") {
    if (!wallet) return;
    setBusy(true);
    setMessage("");
    try {
      const auth = await headers("social:write", true);
      if (!alive.current) return;
      const r = await fetch("/api/social", {
        method: "POST",
        headers: { ...auth, "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, kind: row.kind, key: row.key, action }),
        signal: AbortSignal.timeout(10000),
      });
      const b = await r.json();
      if (!r.ok || !b.success || b.data?.active !== false)
        throw Error(b.error || "Removal was not confirmed.");
      if (!alive.current) return;
      window.dispatchEvent(new Event("basedare:social-updated"));
      await load(false);
    } catch (e) {
      if (alive.current)
        setMessage(e instanceof Error ? e.message : "Could not remove. Retry.");
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  return (
    <section id="saved-social" className="bd-surface my-5 p-5 sm:p-7">
      <h2 className="text-2xl font-black">Saved & Following</h2>
      <p className="mt-2 text-sm leading-6 text-white/65">
        Keep places, posts and upcoming plans close. Your saved list is private.
        Following is separate from friends and private chats.
      </p>
      <button
        type="button"
        disabled={busy}
        className="bd-action mt-4 min-h-11 !text-sm"
        onClick={() => void load()}
      >
        {busy
          ? "Loading…"
          : data
            ? "Refresh my lists"
            : wallet
              ? "Open my lists"
              : "Sign in to open my lists"}
      </button>
      {message ? (
        <p role="status" className="mt-3 text-sm text-amber-100">
          {message}
        </p>
      ) : null}
      {data ? (
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          {(["saves", "follows"] as const).map((group) => (
            <div key={group}>
              <h3 className="text-lg font-black">
                {group === "saves" ? "Saved for later" : "Accounts I follow"} ·{" "}
                {data[group].filter((r) => r.target).length}
              </h3>
              {data[group].length === 0 ? (
                <p className="mt-3 text-sm text-white/65">
                  {group === "saves"
                    ? "Nothing saved yet. Save a place or story from the Pulse."
                    : "Follow a public person or verified venue to see their updates."}
                </p>
              ) : (
                data[group].map((row) => (
                  <div key={row.kind + row.key} className="bd-well mt-3 p-4">
                    {row.target ? (
                      <>
                        <p className="text-sm text-cyan-100">
                          {row.target.label}
                        </p>
                        <Link
                          href={row.target.href}
                          className="mt-2 block min-h-11 py-2 text-base font-bold"
                        >
                          {row.target.title} →
                        </Link>
                      </>
                    ) : (
                      <p className="text-sm text-white/60">
                        No longer available. Its former content is hidden.
                      </p>
                    )}
                    <button
                      type="button"
                      disabled={busy}
                      className="bd-action mt-2 min-h-11 !text-sm"
                      onClick={() =>
                        void remove(
                          row,
                          group === "saves" ? "unsave" : "unfollow",
                        )
                      }
                    >
                      {group === "saves" ? "Remove saved item" : "Unfollow"}
                    </button>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      ) : null}
      <Link
        href="/now?feed=following"
        className="mt-4 inline-flex min-h-11 items-center font-bold text-cyan-100"
      >
        Open Following in the Pulse →
      </Link>
    </section>
  );
}
