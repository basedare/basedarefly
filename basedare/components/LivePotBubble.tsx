"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Coins, RefreshCw, X, ArrowUpRight } from "lucide-react";
import { useView } from "@/app/context/ViewContext";
import {
  readCreatorPoolSummary,
  type CreatorPoolSummary,
} from "@/lib/creator-pool-display";
import styles from "./LivePotBubble.module.css";

function usd(value: number, compact = false) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    ...(compact && value >= 100000 ? { notation: "compact" as const } : {}),
  }).format(value);
}
export default function LivePotBubble({
  className = "",
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const { isControlMode } = useView();
  const [desktop, setDesktop] = useState(false);
  const [open, setOpen] = useState(false);
  const [pool, setPool] = useState<CreatorPoolSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [stale, setStale] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const request = useRef<AbortController | null>(null);
  const version = useRef(0);
  const load = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    const current = ++version.current;
    const timeout = window.setTimeout(() => controller.abort(), 8000);
    setLoading(true);
    try {
      const response = await fetch("/api/live-pot", {
        signal: controller.signal,
        cache: "no-store",
      });
      const source = response.headers.get("X-BaseDare-Data-Source");
      const value = readCreatorPoolSummary(
        response.ok ? await response.json() : null,
        source
      );
      if (current === version.current) {
        setPool(value);
        setStale(source === "stale");
      }
    } catch {
      if (current === version.current) setPool(null);
    } finally {
      window.clearTimeout(timeout);
      if (current === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)");
    const sync = () => setDesktop(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);
  useEffect(() => {
    if (pathname !== "/" || !desktop) return;
    void load();
    return () => {
      version.current += 1;
      request.current?.abort();
    };
  }, [desktop, load, pathname]);
  const close = useCallback(() => {
    setOpen(false);
    trigger.current?.focus();
  }, []);
  useEffect(() => {
    if (!open) return;
    closeButton.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    const outside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !panel.current?.contains(event.target) &&
        !trigger.current?.contains(event.target)
      )
        setOpen(false);
    };
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", outside);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", outside);
    };
  }, [close, open]);
  if (pathname !== "/" || !desktop) return null;
  const amount = pool?.liveDares.amount ?? null;
  return (
    <>
      <button
        ref={trigger}
        type="button"
        aria-label="Open dare reward summary"
        aria-expanded={open}
        aria-controls="dare-reward-summary"
        onClick={() => setOpen(!open)}
        className={`${styles.dial} ${className}`}
        data-control={isControlMode}
      >
        <Coins size={19} className="text-amber-200" aria-hidden="true" />
        <span className="text-[10px] font-bold tracking-wide text-white/70">
          Dare rewards
        </span>
        <span className="text-2xl font-black tracking-tight text-[#ffe69a]">
          {amount === null ? "—" : usd(amount, true)}
        </span>
        <span className="text-[9px] text-white/55">
          {loading
            ? "Checking…"
            : !pool
            ? "Tap to retry"
            : stale
            ? "Last recorded"
            : "Recorded active"}
        </span>
      </button>
      {open ? (
        <div
          ref={panel}
          id="dare-reward-summary"
          role="dialog"
          aria-labelledby="dare-reward-title"
          className={`${styles.panel} bd-surface bottom-44 right-6 z-50 max-h-[min(75dvh,680px)] w-[min(380px,calc(100vw-3rem))] overflow-y-auto p-5 text-white`}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="bd-page-kicker">Dare rewards</p>
              <h2 id="dare-reward-title" className="mt-2 text-xl font-black">
                What’s in play
              </h2>
            </div>
            <button
              ref={closeButton}
              type="button"
              aria-label="Close dare reward summary"
              onClick={close}
              className="bd-action !h-11 !w-11 !p-0"
            >
              <X size={19} aria-hidden="true" />
            </button>
          </div>
          <p className="mt-4 text-sm leading-6 text-white/65">
            Recorded rewards belong to individual dares. They can include
            assigned work and are separate from your wallet balance.
          </p>
          <div className="bd-well mt-4 p-4">
            <p className="text-xs text-white/60">
              {stale ? "Last recorded active rewards" : "Active dare rewards"}
            </p>
            <p className="mt-2 text-3xl font-black text-[#ffe69a]">
              {amount === null
                ? loading
                  ? "Checking…"
                  : "Unavailable"
                : usd(amount)}
            </p>
            <p className="mt-2 text-xs leading-5 text-white/55">
              {pool
                ? `${pool.liveDares.count} recorded dares · ${new Date(
                    pool.updatedAt
                  ).toLocaleString()}`
                : loading
                ? "Fetching recorded reward data…"
                : "We couldn’t confirm the total. Check individual briefs or retry."}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="bd-action mt-3 w-full !text-xs"
          >
            <RefreshCw
              size={14}
              className={
                loading ? "animate-spin motion-reduce:animate-none" : ""
              }
              aria-hidden="true"
            />
            {loading ? "Checking rewards…" : "Refresh rewards"}
          </button>
          <details className="mt-4 border-t border-white/10">
            <summary className="flex min-h-11 cursor-pointer items-center text-sm font-bold text-white/75">
              Budgets &amp; past settlements
            </summary>
            <dl className="space-y-3 pb-3 text-sm">
              <div>
                <dt className="text-white/55">Campaign budgets</dt>
                <dd className="mt-1 font-bold">
                  {pool ? usd(pool.venueActivations.amount) : "Unavailable"}
                  <span className="ml-2 text-xs font-normal text-white/50">
                    Separate from dare rewards
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-white/55">Past settled rewards</dt>
                <dd className="mt-1 font-bold">
                  {pool ? usd(pool.paidOut.amount) : "Unavailable"}
                  <span className="ml-2 text-xs font-normal text-white/50">
                    Historical · not available
                  </span>
                </dd>
              </div>
            </dl>
          </details>
          <p className="mt-2 text-xs leading-5 text-white/55">
            These totals are not a claimable balance. Read the brief for
            availability, requirements and your net reward.
          </p>
          <Link
            href="/earn?source=creator-pool"
            onClick={() => setOpen(false)}
            className="bd-action bd-action--gold mt-4 w-full !text-sm"
          >
            Explore paid dares
            <ArrowUpRight size={16} aria-hidden="true" />
          </Link>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <Link
              href="/create?sparkType=paid&source=creator-pool"
              onClick={() => setOpen(false)}
              className="bd-action !text-xs"
            >
              Fund a dare
            </Link>
            <Link
              href="/brands/portal?from=home&source=creator-pool"
              onClick={() => setOpen(false)}
              className="bd-action !text-xs"
            >
              For businesses
            </Link>
          </div>
        </div>
      ) : null}
    </>
  );
}
