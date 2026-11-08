"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import Link from "@/components/DiscoveryLink";
import { useDiscovery } from "@/components/DiscoveryProvider";
import { useSocialAccount } from "@/hooks/useSocialAccount";
import { type SocialTarget } from "@/lib/social-retention";
import SocialActions from "./SocialActions";
type Snapshot = {
  items: SocialTarget[];
  followingCount: number;
  hasMore: boolean;
};
export default function FollowingFeed() {
  const { wallet } = useSocialAccount();
  const { area } = useDiscovery();
  return <Feed key={`${wallet}:${area.lat}:${area.lng}:${area.radiusKm}`} />;
}
function Feed() {
  const { wallet, headers } = useSocialAccount(),
    { area, ready } = useDiscovery();
  const [data, setData] = useState<Snapshot>(),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const alive = useRef(true),
    version = useRef(0);
  const load = useCallback(
    async (prompt = false) => {
      if (!wallet || !ready) return;
      const current = ++version.current;
      setBusy(true);
      setError("");
      try {
        const auth = await headers("social:read", prompt);
        if (!alive.current) return;
        const query = new URLSearchParams({
          view: "following",
          wallet,
          lat: String(area.lat),
          lng: String(area.lng),
          radiusKm: String(area.radiusKm),
        });
        const r = await fetch("/api/social?" + query, {
          headers: auth,
          cache: "no-store",
          signal: AbortSignal.timeout(10000),
        });
        const b = await r.json();
        if (!r.ok || !b.success)
          throw Error(b.error || "Following could not load.");
        if (alive.current && version.current === current) setData(b.data);
      } catch (e) {
        if (alive.current && version.current === current) {
          setData(undefined);
          setError(
            e instanceof Error ? e.message : "Following unavailable. Retry.",
          );
        }
      } finally {
        if (alive.current && version.current === current) setBusy(false);
      }
    },
    [wallet, ready, headers, area.lat, area.lng, area.radiusKm],
  );
  useEffect(() => {
    alive.current = true;
    void load(false);
    const refresh = () => {
      if (document.visibilityState === "visible") void load(false);
    };
    window.addEventListener("basedare:social-updated", refresh);
    document.addEventListener("visibilitychange", refresh);
    const interval = setInterval(refresh, 60000);
    return () => {
      alive.current = false;
      clearInterval(interval);
      window.removeEventListener("basedare:social-updated", refresh);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [load]);
  return (
    <section className="bd-surface mt-5 p-5 sm:p-7" aria-label="Following feed">
      <h2 className="text-2xl font-black">People and places you follow</h2>
      <p className="mt-3 text-base leading-7 text-white/65">
        Recent stories and Moments, plus the next week’s plans around{" "}
        {area.label}. Only currently public content appears; following does not
        join a plan.
      </p>
      {!wallet ? (
        <button
          type="button"
          className="bd-action mt-4 min-h-11 !text-sm"
          onClick={() => window.dispatchEvent(new Event("basedare:sign-in"))}
        >
          Sign in to open Following
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          className="bd-action mt-4 min-h-11 !text-sm"
          onClick={() => void load(true)}
        >
          {busy
            ? "Reading Following…"
            : data
              ? "Refresh Following"
              : "Confirm account & load"}
        </button>
      )}
      {error ? (
        <p role="status" className="mt-3 text-sm text-amber-100">
          {error}
        </p>
      ) : null}
      {data ? (
        <>
          <p className="mt-4 text-sm text-white/60">
            {data.followingCount} currently available{" "}
            {data.followingCount === 1 ? "account" : "accounts"} followed.{" "}
            <Link href="/dashboard#saved-social" className="underline">
              Manage
            </Link>
          </p>
          {data.items.length ? (
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {data.items.map((item) => (
                <article className="bd-well p-5" key={item.kind + item.key}>
                  <p className="text-sm text-cyan-100">{item.label}</p>
                  <h3 className="mt-3 text-xl font-black">{item.title}</h3>
                  <p className="mt-3 line-clamp-3 whitespace-pre-line text-base leading-7 text-white/70">
                    {item.summary}
                  </p>
                  {item.kind === "ACTIVITY" && item.at ? (
                    <p className="mt-2 text-sm text-white/65">
                      {new Intl.DateTimeFormat(undefined, {
                        dateStyle: "medium",
                        timeStyle: "short",
                        timeZone: area.timeZone,
                      }).format(new Date(item.at))}
                    </p>
                  ) : null}
                  <Link
                    href={item.href}
                    className="mt-3 inline-flex min-h-11 items-center font-bold text-amber-100"
                  >
                    {item.kind === "ACTIVITY" ? "View plan" : "Read post"} →
                  </Link>
                  <SocialActions
                    kind={item.kind}
                    targetKey={item.key}
                    mode="save"
                  />
                </article>
              ))}
            </div>
          ) : (
            <div className="bd-well mt-5 p-5">
              <h3 className="text-lg font-bold">
                {data.followingCount
                  ? "No new public posts or upcoming plans here yet."
                  : "Start with someone worth following."}
              </h3>
              <p className="mt-2 text-base leading-7 text-white/65">
                Find people whose stories you enjoy or follow a verified venue.
                You can explore real places and free Dares while this community
                grows.
              </p>
            </div>
          )}
          {data.hasMore ? (
            <p className="mt-4 text-sm text-white/60">
              Showing a recent selection. Visit followed profiles for more.
            </p>
          ) : null}
        </>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-3">
        <Link
          className="bd-action min-h-11 !text-sm"
          href="/community?people=1#people"
        >
          Discover people
        </Link>
        <Link className="bd-action min-h-11 !text-sm" href="/map">
          Explore places
        </Link>
        <Link className="bd-action min-h-11 !text-sm" href="/adventures">
          Try a free Dare
        </Link>
      </div>
    </section>
  );
}
