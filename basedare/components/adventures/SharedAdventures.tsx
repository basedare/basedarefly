"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useDiscovery } from "@/components/DiscoveryProvider";
import { useSocialAction } from "@/hooks/useSocialAction";
import {
  adventureTemplate,
  adventureHashtag,
  type AdventurePost,
} from "@/lib/adventure-sharing";
import { MOMENT_REVIEW_LABEL } from "@/lib/adventure-evidence";
import PlanShareButton from "@/components/community/PlanShareButton";
import MomentMedia from "./MomentMedia";
export default function SharedAdventures({
  compact = false,
  activityId,
  venueSlug,
  creatorTag: explicitCreator,
}: {
  compact?: boolean;
  activityId?: string;
  venueSlug?: string;
  creatorTag?: string;
}) {
  const query = useSearchParams();
  const { area } = useDiscovery();
  const { wallet, headers } = useSocialAction();
  const liveWallet = useRef(wallet);
  liveWallet.current = wallet;
  const [mine, setMine] = useState(
    !activityId &&
      !venueSlug &&
      !explicitCreator &&
      !query.get("creator") &&
      query.get("shared") === "mine",
  );
  const [tag, setTag] = useState(
    activityId ? adventureHashtag(activityId) : (query.get("hashtag") ?? ""),
  );
  const [postScope, setPostScope] = useState<string | null>(null);
  const [posts, setPosts] = useState<AdventurePost[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true),
    [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState("");
  const creatorTag = explicitCreator ?? query.get("creator") ?? undefined;
  const postId = query.get("post"),
    place = venueSlug ?? query.get("place");
  useEffect(() => {
    const restore = () => setRefresh((n) => n + 1);
    window.addEventListener("focus", restore);
    const timer = setInterval(restore, 60000);
    return () => {
      window.removeEventListener("focus", restore);
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setPosts([]);
    setError("");
    setLoading(true);
    const deadline = setTimeout(() => {
      controller.abort();
      setError("Moments are taking too long to load. Please retry.");
      setLoading(false);
    }, 10000);
    const timer = setTimeout(
      () =>
        void (async () => {
          try {
            if (mine && !wallet) {
              setError("Sign in to see your submissions.");
              return;
            }
            const q = new URLSearchParams();
            if (tag) q.set("tag", tag);
            if (activityId) q.set("activityId", activityId);
            if (postId) q.set("id", postId);
            if (place) q.set("place", place);
            if (creatorTag) q.set("creator", creatorTag);
            if (
              !mine &&
              !tag &&
              !postId &&
              !place &&
              !creatorTag &&
              !activityId
            ) {
              q.set("lat", String(area.lat));
              q.set("lng", String(area.lng));
              q.set("radiusKm", String(area.radiusKm));
            }
            if (mine) {
              q.set("mine", "1");
              q.set("wallet", wallet!);
            }
            const auth = mine ? await headers("adventure:read") : {};
            if (controller.signal.aborted) return;
            const r = await fetch("/api/adventure-submissions?" + q, {
              headers: auth,
              cache: "no-store",
              signal: controller.signal,
            });
            const b = await r.json();
            if (!r.ok || !b.success || !Array.isArray(b.data))
              throw Error(b.error || "Moments could not be loaded.");
            if (!controller.signal.aborted) {
              setPosts(b.data);
              setPostScope(mine ? (wallet ?? null) : null);
            }
          } catch (e) {
            if (!controller.signal.aborted)
              setError(
                e instanceof Error ? e.message : "Moments could not be loaded.",
              );
          } finally {
            clearTimeout(deadline);
            if (!controller.signal.aborted) setLoading(false);
          }
        })(),
      200,
    );
    return () => {
      controller.abort();
      clearTimeout(timer);
      clearTimeout(deadline);
    };
    // Only the explicit private view requests authenticated reads.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mine,
    wallet,
    tag,
    refresh,
    postId,
    place,
    creatorTag,
    activityId,
    area.lat,
    area.lng,
    area.radiusKm,
  ]);
  const visible = mine && postScope !== wallet ? [] : posts;
  return (
    <section id="shared-adventures" className="bd-surface mt-6 p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-black">
            {mine ? "My submissions" : "Community Moments"}
          </h2>
          <p className="mt-2 text-sm leading-6 text-white/55">
            {mine
              ? "Private status, review notes and withdrawal."
              : place
                ? "Contributions linked to this place. Not proof of attendance."
                : activityId || tag || creatorTag
                  ? "People’s takes on the same challenge."
                  : "Nearby place stories and challenges you can play anywhere."}
          </p>
        </div>
        <Link
          href="/adventures"
          className="min-h-11 py-3 text-sm font-bold text-cyan-100"
        >
          Play free →
        </Link>
      </div>
      {!compact && !activityId && !venueSlug && !creatorTag ? (
        <div className="my-4 flex flex-wrap gap-2">
          <label className="min-w-0 flex-1 text-xs text-white/60">
            Find a hashtag
            <input
              aria-label="Find Moments by hashtag"
              placeholder="basedare…"
              value={tag}
              maxLength={100}
              onChange={(e) => setTag(e.target.value.replace(/^#/, ""))}
              className="mt-1 min-h-12 w-full rounded-xl border border-white/15 bg-black/30 px-4 text-base text-white"
            />
          </label>
          <button
            aria-pressed={mine}
            className="bd-action self-end min-h-12 !text-sm"
            onClick={() => {
              setPosts([]);
              setMine(!mine);
            }}
          >
            {mine ? "Community" : "My submissions"}
          </button>
        </div>
      ) : null}
      {error ? (
        <p role="status" className="mt-4 text-sm leading-6 text-amber-100">
          {error}{" "}
          <button
            className="min-h-11 underline"
            onClick={() =>
              mine && !wallet
                ? window.dispatchEvent(new Event("basedare:sign-in"))
                : setRefresh((n) => n + 1)
            }
          >
            {mine && !wallet ? "Sign in" : "Retry"}
          </button>
        </p>
      ) : loading ? (
        <p role="status" className="mt-4 text-sm text-white/60">
          Loading Moments…
        </p>
      ) : !visible.length ? (
        <p className="mt-4 text-sm leading-6 text-white/60">
          {mine
            ? "No submissions here yet. Try an adventure, then share your take if you like."
            : "No approved Moments here yet. A first take can inspire the next person."}
        </p>
      ) : null}
      <div
        className={
          "mt-4 grid gap-5 " + (compact ? "md:grid-cols-3" : "sm:grid-cols-2")
        }
      >
        {visible.slice(0, compact ? 3 : 30).map((post) => (
          <article
            key={post.id}
            className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-black/20"
          >
            <MomentMedia
              post={post}
              privateView={mine && post.status !== "APPROVED"}
            />
            <div className="p-4">
              <p className="text-xs font-bold text-cyan-100">
                {post.status === "APPROVED"
                  ? post.featured
                    ? "Creator spotlight · Reviewed creation"
                    : MOMENT_REVIEW_LABEL
                  : post.status === "FLAGGED"
                    ? "Hidden · needs review"
                    : post.status.toLowerCase()}
              </p>
              <h3 className="mt-2 text-lg font-black">
                {adventureTemplate(post.activityId)?.title}
              </h3>
              <p className="mt-3 break-words text-sm leading-6 text-white/75">
                {post.caption}
              </p>
              <p className="mt-3 text-sm text-white/50">
                {post.creatorTag ?? "Community contributor"}
              </p>
              {post.venue ? (
                <Link
                  className="mt-1 inline-flex min-h-11 items-center text-sm text-cyan-100"
                  href={"/venues/" + encodeURIComponent(post.venue.slug)}
                >
                  {post.venue.name} →
                </Link>
              ) : null}
              {post.status === "APPROVED" ? (
                <>
                  <Link
                    href={post.momentHref!}
                    className="mt-3 flex min-h-12 items-center text-sm font-bold text-violet-100"
                  >
                    View Moment & try it →
                  </Link>
                  <PlanShareButton
                    href={post.momentHref!}
                    title={adventureTemplate(post.activityId)!.title}
                    text="Someone tried it. Your turn?"
                    label="Share Moment"
                    analyticsSource="moment_card"
                  />
                </>
              ) : null}
              {mine && post.reviewReason ? (
                <p className="mt-3 text-sm leading-6 text-amber-100">
                  Review: {post.reviewReason}
                </p>
              ) : null}
              {mine && post.status !== "WITHDRAWN" ? (
                <button
                  disabled={busy === post.id}
                  className="mt-3 min-h-12 text-sm text-white/60 underline"
                  onClick={async () => {
                    const owner = wallet;
                    setBusy(post.id);
                    setError("");
                    try {
                      const auth = await headers("adventure:withdraw");
                      if (liveWallet.current !== owner) return;
                      const r = await fetch("/api/adventure-submissions", {
                        method: "DELETE",
                        headers: {
                          "Content-Type": "application/json",
                          ...auth,
                        },
                        body: JSON.stringify({ wallet: owner, id: post.id }),
                        signal: AbortSignal.timeout(10000),
                      });
                      if (!r.ok)
                        throw Error("Withdrawal failed. Please retry.");
                      if (liveWallet.current === owner)
                        setRefresh((n) => n + 1);
                    } catch (e) {
                      if (liveWallet.current === owner)
                        setError(
                          e instanceof Error ? e.message : "Withdrawal failed.",
                        );
                    } finally {
                      setBusy("");
                    }
                  }}
                >
                  {busy === post.id ? "Withdrawing…" : "Withdraw from BaseDare"}
                </button>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {mine ? (
        <p className="mt-5 text-xs leading-5 text-white/50">
          Withdrawal removes BaseDare display. Copies shared elsewhere and
          legacy files previously uploaded to public storage may remain
          accessible.
        </p>
      ) : null}
    </section>
  );
}
