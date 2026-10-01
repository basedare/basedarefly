"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSocialAction } from "@/hooks/useSocialAction";
type Person = { tag: string; bio: string | null; walletAddress: string };
type Connection = {
  requester: string;
  recipient: string;
  status: string;
  otherTag?: string | null;
};
export default function PeoplePanel() {
  const query = useSearchParams();
  const { wallet, headers } = useSocialAction();
  const [open, setOpen] = useState(query.get("people") === "1");
  const [search, setSearch] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch("/api/people?q=" + encodeURIComponent(search), {
        signal: controller.signal,
      })
        .then((r) => r.json())
        .then((b) => {
          if (!b.success) throw Error(b.error);
          setPeople(b.data);
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, search]);
  useEffect(() => {
    setConnections([]);
    setLoaded(false);
  }, [wallet]);
  async function load() {
    if (!wallet) return;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/friends?wallet=" + wallet, {
        headers: await headers("friends:read"),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      setConnections(b.data);
      setLoaded(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load friends.");
    } finally {
      setBusy(false);
    }
  }
  async function action(
    target: string,
    action: "request" | "accept" | "remove",
  ) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/friends", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await headers("friends:write")),
        },
        body: JSON.stringify({ wallet, target, action }),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update friends.");
    } finally {
      setBusy(false);
    }
  }
  const btn =
    "bd-action min-h-11 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-bold disabled:opacity-40";
  return (
    <section className="my-5 rounded-[1.7rem] border border-white/10 bg-black/40 p-5 text-white">
      <button
        className="flex min-h-11 w-full items-center justify-between text-left font-bold"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
      >
        Find people & friends <span>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div className="mt-3 space-y-4">
          <p className="text-sm text-white/60">
            Find public profiles by handle. Friends are private connections, not
            a live location list. Share a meetup link when you want to make a
            plan.
          </p>
          <input
            aria-label="Search people by handle"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search @handle"
            className="min-h-11 w-full rounded-xl border border-white/15 bg-black/30 px-4"
          />
          {wallet ? (
            <button disabled={busy} className={btn} onClick={() => void load()}>
              {busy
                ? "Loading…"
                : loaded
                  ? "Refresh friends & requests"
                  : "Open friends & requests"}
            </button>
          ) : (
            <button
              className={btn}
              onClick={() =>
                window.dispatchEvent(new Event("basedare:sign-in"))
              }
            >
              Sign in to connect
            </button>
          )}
          {error ? (
            <p role="status" className="text-sm text-amber-100">
              {error}
            </p>
          ) : null}
          {loaded ? (
            <div className="space-y-2">
              <h3 className="text-sm font-bold">Friends & requests</h3>
              {connections
                .filter((c) => c.status !== "CLOSED")
                .map((c) => {
                  const other =
                    c.requester === wallet ? c.recipient : c.requester;
                  const incoming =
                    c.recipient === wallet && c.status === "PENDING";
                  return (
                    <div
                      key={other}
                      className="flex flex-wrap items-center gap-3 rounded-xl border border-white/10 p-3"
                    >
                      <span className="text-sm">
                        {c.otherTag ??
                          people.find((p) => p.walletAddress === other)?.tag ??
                          other.slice(0, 6) + "…" + other.slice(-4)}{" "}
                        ·{" "}
                        {c.status === "ACCEPTED"
                          ? "Friends"
                          : incoming
                            ? "Wants to connect"
                            : "Request sent"}
                      </span>
                      {incoming ? (
                        <button
                          disabled={busy}
                          className={btn}
                          onClick={() => void action(other, "accept")}
                        >
                          Accept
                        </button>
                      ) : null}
                      <button
                        disabled={busy}
                        className={btn}
                        onClick={() => void action(other, "remove")}
                      >
                        {incoming
                          ? "Decline"
                          : c.status === "ACCEPTED"
                            ? "Remove"
                            : "Cancel request"}
                      </button>
                    </div>
                  );
                })}
              {!connections.some((c) => c.status !== "CLOSED") ? (
                <p className="text-xs text-white/55">
                  No friends or pending requests yet.
                </p>
              ) : null}
            </div>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            {people.map((p) => (
              <div
                key={p.tag}
                className="rounded-2xl border border-white/10 bg-violet-300/5 p-4"
              >
                <Link
                  href={
                    "/creator/" + encodeURIComponent(p.tag.replace(/^@/, ""))
                  }
                  className="font-bold text-cyan-100"
                >
                  {p.tag}
                </Link>
                <p className="mt-2 line-clamp-2 text-xs text-white/55">
                  {p.bio}
                </p>
                {wallet &&
                wallet !== p.walletAddress &&
                loaded &&
                !connections.some(
                  (c) =>
                    c.requester === p.walletAddress ||
                    c.recipient === p.walletAddress,
                ) ? (
                  <button
                    disabled={busy}
                    className={btn + " mt-3"}
                    onClick={() => void action(p.walletAddress, "request")}
                  >
                    Add friend
                  </button>
                ) : null}
              </div>
            ))}
          </div>
          {!people.length && !error ? (
            <p className="text-sm text-white/55">No profiles found.</p>
          ) : null}
          <Link
            href="/creators"
            className="inline-block min-h-11 py-3 text-xs text-cyan-100"
          >
            Browse public profiles →
          </Link>
        </div>
      ) : null}
    </section>
  );
}
