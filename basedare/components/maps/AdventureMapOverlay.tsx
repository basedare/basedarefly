"use client";

import { useState } from "react";
import { ChevronRight, Loader2, Map, Sparkles, Users, X } from "lucide-react";
import type {
  TonightActivity,
  TonightSnapshot,
} from "@/components/maps/useTonightActivity";

type AdventureMapOverlayProps = {
  enabled: boolean;
  panelOpen: boolean;
  loading: boolean;
  error: string | null;
  snapshot: TonightSnapshot | null;
  obscured: boolean;
  onToggle: () => void;
  onPanelOpenChange: (open: boolean) => void;
  onSelectActivity: (activity: TonightActivity) => void;
  onExploreSecrets: () => void;
};

const PEEBEAR_FIELD_LINES = [
  "Tap a named place for its lore.",
  "Purple stones are reviewed local rumors.",
  "Brighter halos mean more verified activity.",
  "Zoom out to find island secrets.",
];

function formatActivityTiming(activity: TonightActivity) {
  if (!activity.startsAt) {
    if (!activity.endsAt) return "Open now";
    const remainingMs = new Date(activity.endsAt).getTime() - Date.now();
    if (remainingMs <= 0) return "Ending now";
    const remainingMinutes = Math.max(1, Math.round(remainingMs / 60_000));
    if (remainingMinutes < 60) return `${remainingMinutes} min left`;
    return `${Math.round(remainingMinutes / 60)} hr left`;
  }

  const startsAt = new Date(activity.startsAt);
  const deltaMinutes = Math.round((startsAt.getTime() - Date.now()) / 60_000);
  if (deltaMinutes <= 0) return "Happening now";
  if (deltaMinutes < 60) return `Starts in ${deltaMinutes} min`;
  return startsAt.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function getActivityMeta(activity: TonightActivity) {
  const parts = [formatActivityTiming(activity)];
  if (activity.reward?.amountUsdc)
    parts.unshift(`${activity.reward.amountUsdc} USDC`);
  if (activity.goingCount) parts.push(`${activity.goingCount} going`);
  return parts.join(" · ");
}

export default function AdventureMapOverlay({
  enabled,
  panelOpen,
  loading,
  error,
  snapshot,
  obscured,
  onToggle,
  onPanelOpenChange,
  onSelectActivity,
  onExploreSecrets,
}: AdventureMapOverlayProps) {
  const [guideLineIndex, setGuideLineIndex] = useState(0);
  const focalActivity = snapshot?.activities[0] ?? null;
  const activityCount = snapshot?.totals.activities ?? 0;
  const goingCount = snapshot?.totals.going ?? 0;
  const showPanel = enabled && panelOpen && !obscured;

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-[15] flex max-w-[min(22rem,calc(100%-5.25rem))] flex-col items-start gap-2 md:left-5 md:top-5">
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          <button
            type="button"
            aria-pressed={enabled}
            aria-label={
              enabled ? "Turn Adventure mode off" : "Turn Adventure mode on"
            }
            onClick={onToggle}
            className={`group inline-flex min-h-11 items-center gap-2 rounded-full border px-2 pr-2.5 shadow-[0_14px_30px_rgba(0,0,0,0.38),inset_0_1px_0_rgba(255,255,255,0.13)] backdrop-blur-xl transition sm:gap-2.5 sm:px-2.5 sm:pr-3.5 ${
              enabled
                ? "border-[#f5c518]/36 bg-[linear-gradient(180deg,rgba(35,28,12,0.94),rgba(8,9,17,0.94))] text-[#fff0a8]"
                : "border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(7,8,15,0.94))] text-white/72 hover:border-white/24 hover:text-white"
            }`}
          >
            <span className="relative grid h-8 w-8 shrink-0 place-items-center rounded-full border border-[#f5c518]/28 bg-black/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <span
                className="adventure-sprite adventure-sprite--bear-mini"
                aria-hidden="true"
              />
            </span>
            <span className="text-left">
              <span className="hidden text-[9px] font-black uppercase tracking-[0.2em] text-white/40 sm:block">
                Adventure
              </span>
              <span className="block text-[10px] font-black uppercase tracking-[0.08em] sm:mt-0.5 sm:text-[11px]">
                {enabled ? "Adventure on" : "Adventure"}
              </span>
            </span>
            <Sparkles
              className={`hidden h-3.5 w-3.5 sm:block ${
                enabled ? "text-cyan-200" : "text-white/34"
              }`}
            />
          </button>

          {enabled ? (
            <button
              type="button"
              aria-expanded={showPanel}
              onClick={() => onPanelOpenChange(!panelOpen)}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-cyan-200/22 bg-[linear-gradient(180deg,rgba(20,38,48,0.92),rgba(6,9,16,0.94))] px-3.5 text-[10px] font-black uppercase tracking-[0.12em] text-cyan-50 shadow-[0_14px_30px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition hover:border-cyan-100/34"
            >
              {loading && !snapshot ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Map className="h-3.5 w-3.5" />
              )}
              <span>
                {loading && !snapshot
                  ? "Checking nearby"
                  : error && !snapshot
                  ? "Tonight unavailable"
                  : activityCount > 0
                  ? `Tonight · ${activityCount}`
                  : "Quiet nearby"}
              </span>
              {goingCount > 0 ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200/18 bg-emerald-300/[0.09] px-2 py-0.5 text-emerald-100">
                  <Users className="h-3 w-3" />
                  {goingCount}
                </span>
              ) : null}
            </button>
          ) : null}

          {enabled ? (
            <button
              type="button"
              onClick={onExploreSecrets}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-violet-200/22 bg-[linear-gradient(180deg,rgba(41,24,64,0.92),rgba(8,7,17,0.95))] px-2.5 text-[10px] font-black uppercase tracking-[0.12em] text-violet-50 shadow-[0_14px_30px_rgba(0,0,0,0.34),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition hover:border-violet-100/36 sm:px-3.5"
            >
              <span
                className="adventure-sprite adventure-sprite--rumor-mini"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Find secrets</span>
              <span className="sm:hidden">Secrets</span>
            </button>
          ) : null}
        </div>

        {showPanel ? (
          <div className="pointer-events-auto relative w-full overflow-hidden rounded-[24px] border border-white/12 bg-[radial-gradient(circle_at_8%_0%,rgba(245,197,24,0.14),transparent_34%),radial-gradient(circle_at_95%_15%,rgba(34,211,238,0.13),transparent_32%),linear-gradient(180deg,rgba(18,20,31,0.96),rgba(5,7,14,0.975))] p-3.5 shadow-[0_24px_54px_rgba(0,0,0,0.48),inset_0_1px_0_rgba(255,255,255,0.11)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => onPanelOpenChange(false)}
              aria-label="Close Tonight panel"
              className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/44 transition hover:border-white/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>

            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-cyan-100/52">
              {focalActivity ? "PeeBear found nearby" : "Field scan"}
            </p>
            {focalActivity ? (
              <button
                type="button"
                onClick={() => onSelectActivity(focalActivity)}
                className="mt-2.5 block w-full rounded-[19px] border border-[#f5c518]/20 bg-[linear-gradient(180deg,rgba(245,197,24,0.105),rgba(255,255,255,0.025))] px-3.5 py-3.5 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition hover:border-[#f5c518]/38 hover:bg-[#f5c518]/[0.13]"
              >
                <span className="flex items-start justify-between gap-3">
                  <span className="min-w-0">
                    <span className="block text-[9px] font-black uppercase tracking-[0.18em] text-[#f8dd72]/72">
                      {focalActivity.type === "dare"
                        ? "Live Dare"
                        : "Free meetup"}
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-sm font-black leading-5 text-white">
                      {focalActivity.title}
                    </span>
                    <span className="mt-1.5 block text-[11px] font-bold text-white/52">
                      {focalActivity.place.label}
                    </span>
                  </span>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-[#f8dd72]" />
                </span>
                <span className="mt-3 block rounded-full border border-white/10 bg-black/22 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.1em] text-white/68">
                  {getActivityMeta(focalActivity)}
                </span>
              </button>
            ) : loading ? (
              <div className="mt-3 flex items-center gap-2 rounded-[18px] border border-white/8 bg-white/[0.035] px-3.5 py-4 text-sm font-bold text-white/52">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-200" />
                Reading the nearby field...
              </div>
            ) : error ? (
              <div className="mt-3 rounded-[18px] border border-amber-200/12 bg-amber-300/[0.045] px-3.5 py-4">
                <p className="text-sm font-black text-white">
                  The live layer did not refresh.
                </p>
                <p className="mt-1.5 text-xs leading-5 text-white/48">
                  {error} The map and saved place memory still work normally.
                </p>
              </div>
            ) : (
              <div className="mt-3 rounded-[18px] border border-white/8 bg-white/[0.035] px-3.5 py-4">
                <p className="text-sm font-black text-white">
                  Nothing public is scheduled nearby yet.
                </p>
                <p className="mt-1.5 text-xs leading-5 text-white/48">
                  Honest zero. Pick a place to start a free meetup, or seed a
                  paid Dare.
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {enabled && !obscured ? (
        <button
          type="button"
          onClick={() =>
            setGuideLineIndex(
              (current) => (current + 1) % PEEBEAR_FIELD_LINES.length
            )
          }
          aria-label="Ask PeeBear for another field hint"
          className="pointer-events-auto absolute bottom-5 right-4 z-[16] flex max-w-[min(18rem,calc(100%-2rem))] items-end gap-2 text-left md:bottom-6 md:right-6"
        >
          <span className="mb-2 rounded-[17px] border border-cyan-100/18 bg-[linear-gradient(180deg,rgba(15,24,37,0.94),rgba(5,7,14,0.97))] px-3 py-2 text-[10px] font-bold leading-4 text-cyan-50/82 shadow-[0_16px_34px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-xl">
            {PEEBEAR_FIELD_LINES[guideLineIndex]}
          </span>
          <span className="adventure-guide-orb shrink-0" aria-hidden="true">
            <span className="adventure-sprite adventure-sprite--bear" />
            <span className="adventure-guide-orb__spark" />
          </span>
        </button>
      ) : null}
    </>
  );
}
