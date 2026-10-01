"use client";
import Link from "@/components/DiscoveryLink";
import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useSocialAction } from "@/hooks/useSocialAction";
import { adventureTemplate, type AdventurePost } from "@/lib/adventure-sharing";
import PlanShareButton from "@/components/community/PlanShareButton";
import { useDiscovery } from "@/components/DiscoveryProvider";
import { calculateDistance } from "@/lib/geo";
export default function SharedAdventures({
  compact = false,
}: {
  compact?: boolean;
}) {
  const query = useSearchParams();
  const { area } = useDiscovery();
  const { wallet, headers } = useSocialAction();
  const [mine, setMine] = useState(query.get("shared") === "mine");
  const [tag, setTag] = useState(query.get("hashtag") ?? "");
  const [posts, setPosts] = useState<AdventurePost[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const queryTag = query.get("hashtag") ?? "";
  useEffect(() => { setTag(queryTag); }, [queryTag]);
  useEffect(() => {
    const restore = () => setRefresh((n) => n + 1);
    const interval = window.setInterval(restore, 60000);
    window.addEventListener("focus", restore);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", restore); };
  }, []);
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");
    setPosts([]);
    const load = async () => {
      try {
        if (mine && !wallet) {
          setError("Sign in to see your submissions.");
          return;
        }
        const q = new URLSearchParams();
        if (tag) q.set("tag", tag);
        if (query.get("post")) q.set("id", query.get("post")!);
        if (query.get("place")) q.set("place", query.get("place")!);
        if (!mine && !tag && !query.get("post") && !query.get("place")) {
          q.set("lat", String(area.lat));
          q.set("lng", String(area.lng));
          q.set("radiusKm", String(area.radiusKm));
        }
        if (mine) {
          q.set("mine", "1");
          q.set("wallet", wallet!);
        }
        const r = await fetch("/api/adventure-submissions?" + q, {
          headers: mine ? await headers("adventure:read") : {},
          cache: "no-store",
        });
        const b = await r.json();
        if (!r.ok || !b.success) throw Error(b.error);
        if (!cancelled) setPosts(b.data);
      } catch (e) {
        if (!cancelled)
          setError(
            e instanceof Error ? e.message : "Could not load adventures.",
          );
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    const timer = setTimeout(() => void load(), 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
    // Authentication is requested only for the explicitly selected private view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mine, wallet, tag, refresh, query, area.lat, area.lng, area.radiusKm]);
  const visible = posts
    .filter(
      (p) =>
        mine ||
        tag ||
        query.get("post") ||
        query.get("place") ||
        calculateDistance(
          area.lat,
          area.lng,
          p.venue.latitude,
          p.venue.longitude,
        ) <= area.radiusKm,
    )
    .slice(0, compact ? 3 : 30);
  return (
    <section
      id="shared-adventures"
      className="mt-7 rounded-[1.7rem] border border-white/10 bg-black/40 p-5 sm:p-7"
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white">
            Adventures people shared
          </h2>
          <p className="mt-2 text-xs text-white/55">
            {tag
              ? "Hashtag results · all places"
              : mine
                ? "Your uploads and review status"
                : area.label + " · community photos and clips"}
          </p>
        </div>
        <Link
          href="/adventures"
          className="min-h-11 py-3 text-xs font-bold text-cyan-100"
        >
          Try an adventure →
        </Link>
      </div>
      <div className="my-4 flex flex-wrap gap-2">
        <input
          aria-label="Find adventures by hashtag"
          placeholder="Find a #hashtag"
          value={tag}
          onChange={(e) => setTag(e.target.value.replace(/^#/, ""))}
          className="min-h-11 min-w-0 rounded-full border border-white/15 bg-black/30 px-4 text-sm text-white"
        />
        {!compact ? (
          <button
            aria-pressed={mine}
            className="bd-action min-h-11 rounded-full border border-white/15 px-4 text-xs text-white"
            onClick={() => setMine(!mine)}
          >
            {mine ? "Show community" : "My submissions"}
          </button>
        ) : null}
      </div>
      {error ? (
        <p role="status" className="text-sm text-amber-100">
          {error}{" "}
          <button
            className="underline"
            onClick={() => mine && !wallet ? window.dispatchEvent(new Event("basedare:sign-in")) : setRefresh((n) => n + 1)}
          >
            {mine && !wallet ? "Sign in" : "Retry"}
          </button>
        </p>
      ) : loading ? (
        <p className="text-sm text-white/55">Loading adventures…</p>
      ) : !visible.length ? (
        <p className="text-sm text-white/55">
          {mine
            ? "No submissions yet. Finish an adventure, then choose Share what you made."
            : "No shared adventures here yet. Yours could inspire the next person."}
        </p>
      ) : null}
      <div
        className={
          "grid gap-4 " + (compact ? "md:grid-cols-3" : "sm:grid-cols-2")
        }
      >
        {visible.map((p) => (
          <article
            key={p.id}
            className="min-w-0 rounded-2xl border border-white/10 bg-[#131020]/80 p-4"
          >
            {p.mediaType === "VIDEO" ? (
              <video
                src={p.mediaUrl}
                controls
                preload="none"
                className="aspect-video w-full rounded-xl object-contain"
              />
            ) : (
              <img
                src={p.mediaUrl}
                alt={p.caption}
                loading="lazy"
                className="aspect-video w-full rounded-xl object-cover"
              />
            )}
            <h3 className="mt-3 font-bold text-white">
              {adventureTemplate(p.activityId)?.title}
            </h3>
            <p className="mt-2 break-words text-sm text-white/75">
              {p.caption}
            </p>
            <p className="mt-2 text-xs text-white/50">
              {p.creatorTag ? (
                <Link
                  href={
                    "/creator/" +
                    encodeURIComponent(p.creatorTag.replace(/^@/, ""))
                  }
                >
                  {p.creatorTag}
                </Link>
              ) : (
                "Community contributor"
              )}{" "}
              · {new Date(p.createdAt).toLocaleDateString()} ·{" "}
              {p.status === "APPROVED"
                ? "Shared adventure · self-reported"
                : p.status.toLowerCase()}
            </p>
            <Link
              className="mt-3 block text-xs text-cyan-100"
              href={"/map?place=" + encodeURIComponent(p.venue.slug)}
            >
              📍 {p.venue.name}
            </Link>
            <Link
              className="mt-3 block break-all text-xs text-violet-200"
              href={"/?hashtag=" + p.hashtag + "#shared-adventures"}
            >
              #{p.hashtag}
            </Link>
            {p.reviewReason && mine ? (
              <p className="mt-3 text-xs text-amber-100">
                Review: {p.reviewReason}
              </p>
            ) : null}
            {p.status === "APPROVED" ? (
              <div className="mt-4 flex flex-wrap gap-3">
                <PlanShareButton
                  href={"/adventures?post=" + p.id}
                  title={
                    adventureTemplate(p.activityId)?.title ??
                    "BaseDare adventure"
                  }
                  text={p.caption + " #" + p.hashtag + " #BaseDare"}
                  label="Share"
                  analyticsSource="shared-adventure"
                />
                <Link
                  className="min-h-11 py-3 text-xs font-bold text-yellow-200"
                  href={
                    "/adventures/" + p.activityId + "?place=" + p.venue.slug
                  }
                >
                  Try this adventure →
                </Link>
              </div>
            ) : null}
            <Link
              className="mt-3 inline-block min-h-11 py-3 text-xs text-white/45 underline"
              href={
                "/chat?support=1&subject=Report%20adventure&message=" +
                encodeURIComponent(
                  "Please review adventure " +
                    p.id +
                    " at " +
                    p.venue.name +
                    ": ",
                )
              }
            >
              Report
            </Link>
            {mine && p.status !== "WITHDRAWN" ? (
              <button
                className="mt-3 min-h-11 text-xs text-white/55 underline"
                onClick={async () => {
                  try {
                    const r = await fetch("/api/adventure-submissions", {
                      method: "DELETE",
                      headers: {
                        "Content-Type": "application/json",
                        ...(await headers("adventure:withdraw")),
                      },
                      body: JSON.stringify({ wallet, id: p.id }),
                    });
                    if (!r.ok) throw Error("Withdrawal failed. Retry.");
                    setRefresh((n) => n + 1);
                  } catch (e) {
                    setError(
                      e instanceof Error ? e.message : "Withdrawal failed.",
                    );
                  }
                }}
              >
                Withdraw from BaseDare
              </button>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
