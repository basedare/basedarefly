"use client";

import Link from "next/link";
import {
  CalendarPlus,
  Loader2,
  Radio,
  RefreshCw,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAccount } from "wagmi";

import { useSessionAdminSecret } from "@/hooks/useSessionAdminSecret";

type Venue = {
  id: string;
  slug: string;
  name: string;
  city: string | null;
  timezone: string;
};
type Draft = {
  title?: string;
  category?: string;
  priceLabel?: string | null;
  dateMention?: string | null;
  timeMention?: string | null;
  confidence?: number;
  suggestedTrustLevel?: string;
};
type Signal = {
  id: string;
  sourceKind: string;
  sourceUrl: string | null;
  sourceAccount: string | null;
  rawText: string;
  status: string;
  extractionJson: Draft | null;
  confidence: number;
  createdAt: string;
  venue: { slug: string; name: string } | null;
  event: { id: string; slug: string; status: string } | null;
};
type PublishedEvent = {
  id: string;
  slug: string;
  title: string;
  startsAt: string;
  status: string;
  venue: { slug: string; name: string };
  _count: { rsvps: number };
};
type Payload = { venues: Venue[]; signals: Signal[]; events: PublishedEvent[] };
type Feed = {
  id: string;
  platform: string;
  externalAccountId: string;
  accountHandle: string | null;
  status: string;
  lastCheckedAt: string | null;
  lastSuccessfulAt: string | null;
  lastError: string | null;
  consecutiveFailures: number;
  venue: { slug: string; name: string };
};
type PublishDraft = {
  venueSlug: string;
  title: string;
  category: string;
  startsAt: string;
  endsAt: string;
  priceLabel: string;
  summary: string;
  trustLevel: string;
};

const CATEGORIES = [
  "music",
  "food",
  "market",
  "wellness",
  "surf",
  "sports",
  "nightlife",
  "community",
  "other",
];

export default function IslandPulseAdminClient() {
  const { address } = useAccount();
  const { adminSecret, setAdminSecret, ensureAdminSession, hasAdminSession } =
    useSessionAdminSecret();
  const [payload, setPayload] = useState<Payload | null>(null);
  const [feeds, setFeeds] = useState<Feed[]>([]);
  const [sourceKind, setSourceKind] = useState("SOCIAL_POST");
  const [sourceUrl, setSourceUrl] = useState("");
  const [sourceAccount, setSourceAccount] = useState("");
  const [sourceVenue, setSourceVenue] = useState("");
  const [rawText, setRawText] = useState("");
  const [feedVenue, setFeedVenue] = useState("");
  const [feedAccountId, setFeedAccountId] = useState("");
  const [feedHandle, setFeedHandle] = useState("");
  const [feedAccessToken, setFeedAccessToken] = useState("");
  const [drafts, setDrafts] = useState<Record<string, PublishDraft>>({});
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const headers = useMemo<Record<string, string>>(() => {
    const next: Record<string, string> = {};
    if (address) next["x-moderator-wallet"] = address;
    return next;
  }, [address]);
  const hasAuth = Boolean(address || hasAdminSession || adminSecret.trim());

  const ensureAuth = useCallback(
    async () =>
      Boolean(address || hasAdminSession || (await ensureAdminSession())),
    [address, ensureAdminSession, hasAdminSession]
  );

  const load = useCallback(async () => {
    if (!(await ensureAuth())) return;
    setLoading(true);
    try {
      const [response, feedResponse] = await Promise.all([
        fetch("/api/admin/venue-events", { cache: "no-store", headers }),
        fetch("/api/admin/venue-event-feeds", { cache: "no-store", headers }),
      ]);
      const [body, feedBody] = await Promise.all([
        response.json(),
        feedResponse.json(),
      ]);
      if (!response.ok || !body.success)
        throw new Error(body.error || "Could not load Island Pulse.");
      if (!feedResponse.ok || !feedBody.success)
        throw new Error(feedBody.error || "Could not load venue feeds.");
      const next = body.data as Payload;
      setPayload(next);
      setFeeds(feedBody.data.feeds as Feed[]);
      setDrafts((current) => {
        const merged = { ...current };
        next.signals.forEach((signal) => {
          if (merged[signal.id]) return;
          const extracted = signal.extractionJson ?? {};
          merged[signal.id] = {
            venueSlug: signal.venue?.slug ?? "",
            title: extracted.title ?? "",
            category: extracted.category ?? "other",
            startsAt: "",
            endsAt: "",
            priceLabel: extracted.priceLabel ?? "",
            summary: "",
            trustLevel: extracted.suggestedTrustLevel ?? "SOURCE_CHECKED",
          };
        });
        return merged;
      });
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not load Island Pulse."
      );
    } finally {
      setLoading(false);
    }
  }, [ensureAuth, headers]);

  useEffect(() => {
    if (address || hasAdminSession) void load();
  }, [address, hasAdminSession, load]);

  const createSignal = async () => {
    if (!rawText.trim()) return;
    if (!(await ensureAuth())) return;
    setWorking("create");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/venue-events", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          sourceKind,
          sourceUrl: sourceUrl || null,
          sourceAccount: sourceAccount || null,
          rawText,
          venueSlug: sourceVenue || null,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || "Could not build draft.");
      setRawText("");
      setSourceUrl("");
      setSourceAccount("");
      setMessage(
        body.data.duplicate
          ? "That source is already in the queue."
          : "Draft created. Confirm the exact place and time below."
      );
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not build draft."
      );
    } finally {
      setWorking(null);
    }
  };

  const connectFeed = async () => {
    if (!feedVenue || !feedAccountId.trim() || !feedAccessToken.trim()) return;
    if (!(await ensureAuth())) return;
    setWorking("connect-feed");
    setMessage(null);
    try {
      const response = await fetch("/api/admin/venue-event-feeds", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({
          venueSlug: feedVenue,
          externalAccountId: feedAccountId,
          accountHandle: feedHandle || null,
          accessToken: feedAccessToken,
        }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || "Could not connect Instagram.");
      setFeedAccountId("");
      setFeedHandle("");
      setFeedAccessToken("");
      setMessage("Instagram connected. New event-like posts will enter this review queue.");
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not connect Instagram.");
    } finally {
      setWorking(null);
    }
  };

  const feedAction = async (
    action: "sync" | "pause" | "resume" | "disconnect",
    feedId: string
  ) => {
    if (
      action === "disconnect" &&
      !window.confirm("Disconnect this feed and delete its stored token?")
    )
      return;
    if (!(await ensureAuth())) return;
    setWorking(`feed:${feedId}`);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/venue-event-feeds", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ action, feedId }),
      });
      const body = await response.json();
      if (!response.ok || !body.success)
        throw new Error(body.error || "Could not update feed.");
      if (action === "sync") {
        setMessage(
          `${body.data.queued} new event candidate${body.data.queued === 1 ? "" : "s"} queued from ${body.data.scanned} recent posts.`
        );
      } else if (action === "disconnect") {
        setMessage("Instagram feed disconnected and its stored token deleted.");
      }
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update feed.");
    } finally {
      setWorking(null);
    }
  };

  const decide = async (body: Record<string, unknown>, key: string) => {
    if (!(await ensureAuth())) return;
    setWorking(key);
    setMessage(null);
    try {
      const response = await fetch("/api/admin/venue-events", {
        method: "PATCH",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error || "Could not update event.");
      await load();
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not update event."
      );
    } finally {
      setWorking(null);
    }
  };

  const pendingSignals =
    payload?.signals.filter((signal) => signal.status === "NEW") ?? [];
  return (
    <main className="relative min-h-screen overflow-hidden bg-[#05060f] px-4 py-24 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_8%,rgba(245,197,24,0.12),transparent_30%),radial-gradient(circle_at_85%_20%,rgba(34,211,238,0.1),transparent_34%)]" />
      <div className="relative mx-auto max-w-6xl">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.24em] text-[#f8dd72]">
              Island Pulse Ops
            </p>
            <h1 className="mt-3 text-4xl font-black uppercase italic tracking-[-0.05em] sm:text-6xl">
              Source → check → live
            </h1>
            <p className="mt-3 max-w-2xl text-sm text-white/52">
              Paste the public post or flyer copy. BaseDare suggests a draft;
              you confirm the exact venue and time before it appears.
            </p>
          </div>
          <div className="flex gap-2">
            <Link
              href="/events"
              className="rounded-full border border-white/10 px-4 py-2 text-[10px] font-black uppercase tracking-[0.12em] text-white/60"
            >
              Public pulse
            </Link>
            <button
              onClick={() => void load()}
              className="rounded-full border border-cyan-200/18 bg-cyan-300/[0.07] p-3 text-cyan-100"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
            </button>
          </div>
        </div>

        {!address && !hasAdminSession ? (
          <div className="mt-6 flex gap-2 rounded-2xl border border-[#f5c518]/18 bg-[#f5c518]/[0.06] p-3">
            <input
              type="password"
              value={adminSecret}
              onChange={(event) => setAdminSecret(event.target.value)}
              placeholder="Admin secret"
              className="min-h-11 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 text-sm outline-none"
            />
            <button
              onClick={() => void load()}
              className="rounded-xl bg-[#f5c518] px-4 text-[10px] font-black uppercase text-[#171006]"
            >
              Unlock
            </button>
          </div>
        ) : null}

        <section className="mt-7 rounded-[1.8rem] border border-cyan-200/12 bg-cyan-300/[0.035] p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/68">
                <Radio className="h-4 w-4" /> Automatic venue feeds
              </p>
              <p className="mt-2 max-w-2xl text-sm text-white/48">
                Connect an opted-in Instagram professional account. Event-like posts become drafts here; nothing publishes without a human time and place check.
              </p>
            </div>
            <span className="rounded-full border border-white/10 px-3 py-1 text-[9px] font-black uppercase tracking-[0.13em] text-white/44">
              Hourly scan · review required
            </span>
          </div>
          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <select
              value={feedVenue}
              onChange={(event) => setFeedVenue(event.target.value)}
              className="min-h-11 rounded-xl border border-white/10 bg-[#090b14] px-3 text-sm"
            >
              <option value="">Canonical venue</option>
              {payload?.venues.map((venue) => (
                <option key={venue.id} value={venue.slug}>{venue.name}</option>
              ))}
            </select>
            <input
              value={feedHandle}
              onChange={(event) => setFeedHandle(event.target.value)}
              placeholder="@venuehandle"
              className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
            />
            <input
              value={feedAccountId}
              onChange={(event) => setFeedAccountId(event.target.value)}
              placeholder="Instagram account ID"
              className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
            />
            <input
              type="password"
              value={feedAccessToken}
              onChange={(event) => setFeedAccessToken(event.target.value)}
              placeholder="Account access token"
              className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
            />
            <button
              disabled={!feedVenue || !feedAccountId.trim() || feedAccessToken.trim().length < 20 || working === "connect-feed"}
              onClick={() => void connectFeed()}
              className="min-h-11 rounded-xl bg-cyan-100 px-4 text-[10px] font-black uppercase tracking-[0.12em] text-[#05202a] disabled:opacity-40"
            >
              {working === "connect-feed" ? "Connecting…" : "Connect feed"}
            </button>
          </div>
          {feeds.length ? (
            <div className="mt-4 grid gap-2 lg:grid-cols-2">
              {feeds.map((feed) => (
                <div key={feed.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/8 bg-black/25 p-3">
                  <div>
                    <p className="text-sm font-black">{feed.venue.name} · {feed.accountHandle || feed.externalAccountId}</p>
                    <p className="mt-1 text-[10px] text-white/40">
                      {feed.status} · {feed.lastSuccessfulAt ? `synced ${new Date(feed.lastSuccessfulAt).toLocaleString()}` : "not synced yet"}
                    </p>
                    {feed.lastError ? <p className="mt-1 text-[10px] font-bold text-rose-200/72">{feed.lastError}</p> : null}
                  </div>
                  <div className="flex gap-2">
                    {feed.status === "ACTIVE" ? (
                      <button
                        disabled={working === `feed:${feed.id}`}
                        onClick={() => void feedAction("sync", feed.id)}
                        className="rounded-full border border-cyan-100/18 px-3 py-2 text-[9px] font-black uppercase text-cyan-100/70 disabled:opacity-40"
                      >Sync now</button>
                    ) : null}
                    {feed.status === "ACTIVE" || feed.status === "PAUSED" ? (
                      <button
                        disabled={working === `feed:${feed.id}`}
                        onClick={() => void feedAction(feed.status === "ACTIVE" ? "pause" : "resume", feed.id)}
                        className="rounded-full border border-white/10 px-3 py-2 text-[9px] font-black uppercase text-white/50 disabled:opacity-40"
                      >{feed.status === "ACTIVE" ? "Pause" : "Resume"}</button>
                    ) : (
                      <span className="self-center text-[9px] font-black uppercase text-rose-200/60">
                        Reconnect above
                      </span>
                    )}
                    <button
                      disabled={working === `feed:${feed.id}`}
                      onClick={() => void feedAction("disconnect", feed.id)}
                      className="rounded-full border border-rose-200/10 px-3 py-2 text-[9px] font-black uppercase text-rose-100/44 disabled:opacity-40"
                    >Disconnect</button>
                  </div>
                </div>
              ))}
            </div>
          ) : null}
        </section>

        <section className="mt-5 grid gap-5 rounded-[1.8rem] border border-white/10 bg-black/28 p-5 lg:grid-cols-[0.75fr_1.25fr]">
          <div>
            <p className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.18em] text-cyan-100/68">
              <CalendarPlus className="h-4 w-4" /> Add public source
            </p>
            <div className="mt-4 grid gap-3">
              <select
                value={sourceKind}
                onChange={(e) => setSourceKind(e.target.value)}
                className="min-h-11 rounded-xl border border-white/10 bg-[#090b14] px-3 text-sm"
              >
                <option value="SOCIAL_POST">Social post</option>
                <option value="FLYER">Flyer</option>
                <option value="CALENDAR">Calendar</option>
                <option value="EVENTBRITE">Eventbrite organizer</option>
                <option value="COMMUNITY">Community tip</option>
              </select>
              <select
                value={sourceVenue}
                onChange={(e) => setSourceVenue(e.target.value)}
                className="min-h-11 rounded-xl border border-white/10 bg-[#090b14] px-3 text-sm"
              >
                <option value="">Venue not matched yet</option>
                {payload?.venues.map((venue) => (
                  <option key={venue.id} value={venue.slug}>
                    {venue.name} · {venue.city}
                  </option>
                ))}
              </select>
              <input
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="Public source link"
                className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
              />
              <input
                value={sourceAccount}
                onChange={(e) => setSourceAccount(e.target.value)}
                placeholder="Venue/account label"
                className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
              />
            </div>
          </div>
          <div>
            <textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder={
                "Paste caption or flyer text\n\nSUNSET VINYL NIGHT\nFriday · 7:30 PM\nFree entry"
              }
              className="min-h-48 w-full resize-none rounded-2xl border border-white/10 bg-black/30 p-4 text-sm leading-6 outline-none placeholder:text-white/24"
            />
            <button
              disabled={
                !hasAuth || working === "create" || rawText.trim().length < 5
              }
              onClick={() => void createSignal()}
              className="mt-3 min-h-12 w-full rounded-full bg-[#f5c518] text-[11px] font-black uppercase tracking-[0.15em] text-[#171006] disabled:opacity-40"
            >
              {working === "create" ? "Building draft…" : "Build draft"}
            </button>
          </div>
        </section>

        {message ? (
          <p
            role="status"
            className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-sm font-bold text-white/65"
          >
            {message}
          </p>
        ) : null}

        <section className="mt-8">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-[#f8dd72]" />
            <h2 className="text-xl font-black">
              Needs a human check · {pendingSignals.length}
            </h2>
          </div>
          <div className="mt-4 grid gap-4">
            {pendingSignals.map((signal) => {
              const draft = drafts[signal.id];
              if (!draft) return null;
              const update = (patch: Partial<PublishDraft>) =>
                setDrafts((current) => ({
                  ...current,
                  [signal.id]: { ...current[signal.id], ...patch },
                }));
              return (
                <article
                  key={signal.id}
                  className="rounded-[1.6rem] border border-white/10 bg-black/30 p-4 sm:p-5"
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-[0.16em] text-cyan-100/60">
                        {signal.sourceKind} ·{" "}
                        {Math.round(signal.confidence * 100)}% draft confidence
                      </p>
                      <p className="mt-2 max-w-2xl whitespace-pre-line text-xs leading-5 text-white/46">
                        {signal.rawText.slice(0, 360)}
                      </p>
                    </div>
                    {signal.sourceUrl ? (
                      <a
                        href={signal.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[9px] font-black uppercase text-cyan-100/60"
                      >
                        Open source
                      </a>
                    ) : null}
                  </div>
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                    <select
                      value={draft.venueSlug}
                      onChange={(e) => update({ venueSlug: e.target.value })}
                      className="min-h-11 rounded-xl border border-white/10 bg-[#090b14] px-3 text-sm"
                    >
                      <option value="">Exact venue</option>
                      {payload?.venues.map((venue) => (
                        <option key={venue.id} value={venue.slug}>
                          {venue.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={draft.title}
                      onChange={(e) => update({ title: e.target.value })}
                      placeholder="Clear event title"
                      className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
                    />
                    <select
                      value={draft.category}
                      onChange={(e) => update({ category: e.target.value })}
                      className="min-h-11 rounded-xl border border-white/10 bg-[#090b14] px-3 text-sm"
                    >
                      {CATEGORIES.map((category) => (
                        <option key={category}>{category}</option>
                      ))}
                    </select>
                    <input
                      value={draft.priceLabel}
                      onChange={(e) => update({ priceLabel: e.target.value })}
                      placeholder="Free / ₱500"
                      className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-sm"
                    />
                    <input
                      type="datetime-local"
                      aria-label="Start in venue local time"
                      value={draft.startsAt}
                      onChange={(e) => update({ startsAt: e.target.value })}
                      className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-xs sm:col-span-2"
                    />
                    <input
                      type="datetime-local"
                      aria-label="Optional end in venue local time"
                      value={draft.endsAt}
                      onChange={(e) => update({ endsAt: e.target.value })}
                      className="min-h-11 rounded-xl border border-white/10 bg-black/30 px-3 text-xs sm:col-span-2"
                    />
                    <textarea
                      value={draft.summary}
                      onChange={(e) => update({ summary: e.target.value })}
                      placeholder="One useful sentence"
                      className="min-h-20 rounded-xl border border-white/10 bg-black/30 p-3 text-sm sm:col-span-2 lg:col-span-3"
                    />
                    <select
                      value={draft.trustLevel}
                      onChange={(e) => update({ trustLevel: e.target.value })}
                      className="min-h-11 rounded-xl border border-white/10 bg-[#090b14] px-3 text-sm"
                    >
                      <option value="SOURCE_CHECKED">Source checked</option>
                      <option value="VENUE_POSTED">Venue posted</option>
                      <option value="VENUE_CONFIRMED">Venue confirmed</option>
                    </select>
                  </div>
                  <div className="mt-4 flex gap-2">
                    <button
                      disabled={
                        working === signal.id ||
                        !draft.venueSlug ||
                        !draft.title ||
                        !draft.startsAt
                      }
                      onClick={() =>
                        void decide(
                          {
                            action: "publish",
                            signalId: signal.id,
                            ...draft,
                            endsAt: draft.endsAt || null,
                            summary: draft.summary || null,
                            priceLabel: draft.priceLabel || null,
                          },
                          signal.id
                        )
                      }
                      className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-full bg-emerald-200 text-[10px] font-black uppercase tracking-[0.13em] text-[#04231a] disabled:opacity-40"
                    >
                      {working === signal.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <ShieldCheck className="h-4 w-4" />
                      )}{" "}
                      Publish checked event
                    </button>
                    <button
                      onClick={() =>
                        void decide(
                          { action: "reject", signalId: signal.id },
                          `reject:${signal.id}`
                        )
                      }
                      className="min-h-11 rounded-full border border-rose-200/18 px-4 text-rose-100"
                    >
                      <XCircle className="h-4 w-4" />
                    </button>
                  </div>
                </article>
              );
            })}
            {!pendingSignals.length && payload ? (
              <p className="rounded-2xl border border-dashed border-white/14 p-6 text-center text-sm text-white/40">
                Queue clear.
              </p>
            ) : null}
          </div>
        </section>
      </div>
    </main>
  );
}
