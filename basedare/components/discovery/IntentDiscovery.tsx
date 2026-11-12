"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useAccount } from "wagmi";
import { ArrowUpRight, ChevronDown, Loader2, Search } from "lucide-react";
import { trackClientEvent } from "@/lib/analytics";
import {
  interpretDiscoveryIntent,
  type DiscoveryAreaInput,
  type DiscoveryInterpretation,
  type DiscoveryResponse,
  type DiscoveryResult,
} from "@/lib/discovery-intelligence";
import RelatedDiscovery from "./RelatedDiscovery";
import { adventureHref } from '@/lib/adventure-progress';

type Props = { area: DiscoveryAreaInput; surface: "pulse" | "map" };
type SessionIdentity = {
  walletAddress?: string;
  user?: { id?: string; email?: string | null; walletAddress?: string };
};
const QUICK_INTENTS = [
  "Adventure",
  "Meet people",
  "Live music tonight",
  "Paid opportunities",
];

function durationBucket(minutes: number | null) {
  return minutes === null
    ? "unspecified"
    : minutes <= 30
    ? "up_to_30m"
    : minutes <= 120
    ? "up_to_2h"
    : "over_2h";
}

/** A fresh form for each browsing area/account also clears in-flight private context. */
export default function IntentDiscovery(props: Props) {
  const { address } = useAccount();
  const { data: session, status } = useSession();
  const identity = session as SessionIdentity | null;
  const scope = [
    props.area.lat,
    props.area.lng,
    props.area.radiusKm,
    props.area.label,
    props.area.timeZone,
    address?.toLowerCase(),
    identity?.walletAddress?.toLowerCase(),
    identity?.user?.walletAddress?.toLowerCase(),
    identity?.user?.id,
    identity?.user?.email,
    status,
  ].join("|");
  return <DiscoveryForm key={scope} {...props} />;
}

function DiscoveryForm({ area, surface }: Props) {
  const searchedRadius = Math.min(25, Math.max(0.1, area.radiusKm));
  const inputId = useId();
  const helpId = useId();
  const [query, setQuery] = useState("");
  const [lastQuery, setLastQuery] = useState("");
  const [snapshot, setSnapshot] = useState<DiscoveryResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);
  const request = useRef<{
    version: number;
    controller: AbortController | null;
  }>({ version: 0, controller: null });

  useEffect(
    () => () => {
      request.current.version += 1;
      request.current.controller?.abort();
    },
    []
  );

  const search = async (value: string) => {
    const text = value.trim();
    if (!text) return;
    request.current.controller?.abort();
    const controller = new AbortController();
    const version = ++request.current.version;
    request.current.controller = controller;
    setQuery(text);
    setLastQuery(text);
    setSnapshot(null);
    setError(null);
    setLoading(true);
    const interpretation = interpretDiscoveryIntent(text);
    trackClientEvent("discovery_query", {
      intent: interpretation.intent,
      window: interpretation.when,
      surface,
      duration_bucket: durationBucket(interpretation.maxMinutes),
    });
    try {
      const response = await fetch("/api/discovery", {
        method: "POST",
        cache: "no-store",
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: text,
          lat: Math.round(area.lat * 1000) / 1000,
          lng: Math.round(area.lng * 1000) / 1000,
          radiusKm: searchedRadius,
          areaLabel: area.label,
          ...(area.timeZone ? { timeZone: area.timeZone } : {}),
        }),
      });
      const payload = await response.json().catch(() => null);
      if (
        !response.ok ||
        !payload?.success ||
        !payload.data ||
        !Array.isArray(payload.data.results)
      ) {
        throw new Error(
          response.status === 429
            ? "PeeBear needs a moment. Please wait, then try again."
            : "PeeBear couldn’t check this area. Please try again."
        );
      }
      if (controller.signal.aborted || version !== request.current.version)
        return;
      setSnapshot(payload.data as DiscoveryResponse);
      setRevision(version);
    } catch (cause) {
      if (controller.signal.aborted || version !== request.current.version)
        return;
      setError(
        cause instanceof Error
          ? cause.message
          : "PeeBear couldn’t check this area. Please try again."
      );
    } finally {
      if (!controller.signal.aborted && version === request.current.version)
        setLoading(false);
    }
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void search(query);
  };
  const notices = snapshot
    ? [...new Set([...snapshot.interpretation.notices, ...snapshot.notices])]
    : [];

  return (
    <div className="min-w-0 text-white">
      <form onSubmit={submit} className="ph-no-capture">
        <label
          htmlFor={inputId}
          className="block text-base font-black text-white"
        >
          What are you up for?
        </label>
        <p id={helpId} className="mt-1 text-xs leading-5 text-white/55">
          {area.label} · within {searchedRadius} km. Add a time, mood or PHP
          budget.
        </p>
        <Link
          href={
            "/map?" +
            new URLSearchParams({
              lat: String(area.lat),
              lng: String(area.lng),
              areaLabel: area.label,
              ...(area.timeZone ? { timeZone: area.timeZone } : {}),
            })
          }
          className="inline-flex min-h-11 items-center text-xs font-bold text-cyan-100"
        >
          Choose another area on the map →
        </Link>
        <div className="bd-well mt-3 flex items-center gap-1 p-1.5">
          <input
            id={inputId}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            maxLength={240}
            autoComplete="off"
            aria-describedby={helpId}
            placeholder="Two hours free, something adventurous…"
            className="ph-no-capture min-h-11 min-w-0 flex-1 rounded-xl bg-transparent px-2 text-sm text-white outline-none placeholder:text-white/35 focus-visible:ring-2 focus-visible:ring-cyan-200/70"
          />
          <button
            type="submit"
            disabled={!query.trim() || loading}
            aria-label="Find matching ideas"
            className="bd-action bd-action--gold !min-h-11 !px-3"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            ) : (
              <Search className="h-4 w-4" aria-hidden="true" />
            )}
            <span className="sr-only">Find ideas</span>
          </button>
        </div>
        <div className="mt-2 flex flex-wrap gap-1.5" aria-label="Quick ideas">
          {QUICK_INTENTS.map((intent) => (
            <button
              key={intent}
              type="button"
              disabled={loading}
              onClick={() => void search(intent)}
              className="bd-action !min-h-11 !px-2.5 !py-1 !text-[10px] !normal-case !tracking-normal"
            >
              {intent}
            </button>
          ))}
        </div>
      </form>
      {loading ? (
        <p
          role="status"
          className="mt-3 flex items-center gap-2 text-xs text-cyan-100/80"
        >
          <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />{" "}
          Checking published ideas in this area…
        </p>
      ) : null}
      {error ? (
        <div
          role="alert"
          className="mt-3 rounded-xl border border-rose-200/20 bg-rose-300/[0.06] p-3 text-xs leading-5 text-rose-100"
        >
          <p>{error}</p>
          <button
            type="button"
            onClick={() => void search(lastQuery)}
            className="mt-1 min-h-11 font-bold underline underline-offset-4"
          >
            Retry search
          </button>
        </div>
      ) : null}
      {snapshot ? (
        <section className="mt-4" aria-label="PeeBear discovery results">
          <p
            role="status"
            className="text-xs font-bold leading-5 text-yellow-100/85"
          >
            {snapshot.interpretation.summary}
          </p>
          {!snapshot.complete ? (
            <div className="mt-2 rounded-xl border border-amber-100/15 bg-amber-200/[0.05] px-3 py-2 text-xs leading-5 text-amber-50/75">
              <p>
                This is a small selection of eligible matches, rather than a
                complete list.
              </p>
              <button
                type="button"
                onClick={() => void search(lastQuery)}
                className="min-h-11 font-bold underline underline-offset-4"
              >
                Refresh ideas
              </button>
            </div>
          ) : null}
          {snapshot.results.length === 0 ? (
            <div className="bd-well mt-3 p-3 text-xs leading-5 text-white/65">
              <p className="font-bold text-white">
                {snapshot.complete
                  ? "Nothing fits that request in this area yet."
                  : "No matches could be confirmed right now."}
              </p>
              <p className="mt-1">
                Try a broader idea or another time. You can still explore the
                map or choose an adventure.
              </p>
            </div>
          ) : (
            <>
              {snapshot.results.length < 3 ? (
                <p className="mt-2 text-xs leading-5 text-white/55">
                  Just{" "}
                  {snapshot.results.length === 1
                    ? "one idea"
                    : "a couple of ideas"}{" "}
                  here. Try another mood for more ideas.
                </p>
              ) : null}
              <div className="mt-3 grid gap-2">
                {snapshot.results.map((result) => (
                  <ResultCard
                    key={`${revision}:${result.kind}:${result.key}`}
                    result={result}
                    interpretation={snapshot.interpretation}
                    surface={surface}
                    count={snapshot.results.length}
                    timeZone={snapshot.area.timeZone ?? area.timeZone}
                  />
                ))}
              </div>
            </>
          )}
          {notices.length ? (
            <details className="mt-3 text-xs leading-5 text-white/55">
              <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 font-bold text-white/70 [&::-webkit-details-marker]:hidden">
                About these matches{" "}
                <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
              </summary>
              {notices.map((notice) => (
                <p key={notice} className="mt-2">
                  {notice}
                </p>
              ))}
            </details>
          ) : null}
          {!snapshot.results.length ? <Link href={adventureHref(undefined,undefined,area)} className="mt-2 inline-flex min-h-11 items-center text-xs font-bold text-cyan-100">Try a free adventure instead →</Link> : null}
        </section>
      ) : null}
    </div>
  );
}

function ResultCard({
  result,
  interpretation,
  surface,
  count,
  timeZone,
}: {
  result: DiscoveryResult;
  interpretation: DiscoveryInterpretation;
  surface: Props["surface"];
  count: number;
  timeZone?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const { kind, minutes } = result;
  const { intent, when } = interpretation;
  useEffect(() => {
    if (!ref.current || !("IntersectionObserver" in window)) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        trackClientEvent("discovery_result_impression", {
          intent,
          window: when,
          kind,
          result_count: count,
          surface,
          duration_bucket: durationBucket(minutes),
        });
        observer.disconnect();
      },
      { threshold: 0.3 }
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [intent, when, kind, count, surface, minutes]);
  let timing: string | null = null;
  if (result.startsAt && Number.isFinite(Date.parse(result.startsAt))) {
    timing = new Intl.DateTimeFormat("en", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      ...(timeZone ? { timeZone } : { timeZone: "UTC", timeZoneName: "short" }),
    }).format(new Date(result.startsAt));
  }
  const relation =
    kind === "PLACE"
      ? { kind: "VENUE" as const, targetKey: result.place?.slug ?? result.key }
      : kind === "MOMENT" || kind === "STORY"
      ? { kind, targetKey: result.key }
      : null;
  return (
    <article
      ref={ref}
      className="rounded-2xl border border-white/10 bg-[linear-gradient(160deg,rgba(255,255,255,0.055),rgba(7,8,16,0.75))] p-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]"
    >
      <p className="text-[9px] font-black uppercase tracking-[0.14em] text-cyan-100/65">
        {result.label}
      </p>
      <h3 className="mt-1 break-words text-sm font-black text-white">
        {result.title}
      </h3>
      {result.summary ? (
        <p className="mt-1 break-words text-xs leading-5 text-white/65">
          {result.summary}
        </p>
      ) : null}
      <p className="mt-2 text-xs font-semibold leading-5 text-yellow-100/75">
        {result.reason}
      </p>
      {result.place ? <p className="mt-2 text-xs leading-5 text-white/65">{result.place.name}{result.distanceKm !== null ? ` · ${result.distanceKm} km from the selected area` : ''}</p> : null}
      <p className="mt-2 text-[11px] leading-5 text-white/55">
        {result.pricePhp === null
          ? result.priceLabel || "Price unconfirmed"
          : result.priceLabel ||
            (result.pricePhp === 0 ? "Free" : `₱${result.pricePhp}`)}{" "}
        · {minutes === null ? "Duration unconfirmed" : `About ${minutes} min`}
        {timing ? ` · ${timing}` : ""}
      </p>
      <Link
        href={result.href}
        prefetch={false}
        onClick={() =>
          trackClientEvent("discovery_result_open", {
            intent,
            window: when,
            kind,
            result_count: count,
            surface,
            duration_bucket: durationBucket(minutes),
          })
        }
        className="mt-2 inline-flex min-h-11 items-center gap-1.5 text-xs font-black text-cyan-100 underline decoration-cyan-100/25 underline-offset-4"
      >
        {result.actionLabel}
        <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
      </Link>
      {relation ? <RelatedDiscovery {...relation} /> : null}
    </article>
  );
}
