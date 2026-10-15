"use client";
import Link from "@/components/DiscoveryLink";
import { useEffect, useRef, useState } from "react";
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
  const [connectionSnapshot, setConnectionSnapshot] = useState<{ wallet: string; items: Connection[] } | null>(null);
  const connections = connectionSnapshot && connectionSnapshot.wallet === wallet ? connectionSnapshot.items : [];
  const loaded = Boolean(connectionSnapshot && connectionSnapshot.wallet === wallet);
  const currentWallet = useRef(wallet);
  const loadVersion = useRef(0);
  const [loadingPeople, setLoadingPeople] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (query.get("people") === "1") setOpen(true); }, [query]);
  useEffect(() => {
    if (!open) return;
    setError("");
    setLoadingPeople(true);
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void fetch("/api/people?q=" + encodeURIComponent(search), {
        signal: controller.signal,
      })
        .then(async (r) => { const data = await r.json(); if (!r.ok) throw Error('People could not load. Try searching again.'); return data; })
        .then((b) => {
          if (!b.success) throw Error(b.error);
          if (!controller.signal.aborted) { setError(""); setPeople(b.data); }
        })
        .catch((e) => {
          if (!controller.signal.aborted) setError(e.message);
        }).finally(() => { if (!controller.signal.aborted) setLoadingPeople(false); });
    }, 250);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, search]);
  useEffect(() => {
    currentWallet.current = wallet;
    loadVersion.current += 1;
    setConnectionSnapshot(null);
    setBusy(false);
  }, [wallet]);
  async function load() {
    if (!wallet || currentWallet.current !== wallet) return;
    const version = ++loadVersion.current;
    const current = () => currentWallet.current === wallet && loadVersion.current === version;
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/friends?wallet=" + wallet, {
        headers: await headers("friends:read"),
        cache: 'no-store',
        signal: AbortSignal.timeout(10_000),
      });
      const b = await r.json();
      if (!r.ok) throw Error(b.error);
      if (current()) setConnectionSnapshot({ wallet, items: b.data });
    } catch (e) {
      if (current()) setError(e instanceof Error ? e.message : "Could not load friends.");
    } finally {
      if (current()) setBusy(false);
    }
  }
  async function action(
    target: string,
    action: "request" | "accept" | "remove",
  ) {
    if (!wallet || currentWallet.current !== wallet) return;
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
      if (currentWallet.current === wallet) await load();
    } catch (e) {
      if (currentWallet.current === wallet) setError(e instanceof Error ? e.message : "Could not update friends.");
    } finally {
      if (currentWallet.current === wallet) setBusy(false);
    }
  }
  const btn =
    "bd-action min-h-11 rounded-full border border-white/15 bg-white/5 px-4 text-xs font-bold disabled:opacity-40";
  return (
    <section id="people" className="bd-surface scroll-mt-28 my-5 p-5 text-white">
      <button
        className="flex min-h-11 w-full items-center justify-between text-left font-bold"
        aria-expanded={open}
        aria-controls="people-content"
        onClick={() => setOpen(!open)}
      >
        Find people & friends <span>{open ? "−" : "+"}</span>
      </button>
      {open ? (
        <div id="people-content" className="mt-3 space-y-4">
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
            className="bd-field min-h-11 w-full px-4"
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
                          'Explorer'}{" "}
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
                className="bd-card p-4"
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
                !connections.some(
                  (c) =>
                    c.status !== "CLOSED" && (c.requester === p.walletAddress ||
                    c.recipient === p.walletAddress),
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
          {loadingPeople ? <p role="status" className="text-sm text-white/65">Finding public profiles…</p> : null}
          {!loadingPeople && !people.length && !error ? (
            <p className="text-sm text-white/55">No profiles found.</p>
          ) : null}
          <Link href="/now?participation=meet" className={btn}>Find a public plan</Link>
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
