"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import {
  ChevronRight,
  Compass,
  Footprints,
  Loader2,
  Map,
  Sparkles,
  Users,
  X,
} from "lucide-react";
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
  intent: MapAttentionIntent | null;
  placeSuggestions: MapAttentionPlaceSuggestion[];
  trailCount: number;
  guideOpen: boolean;
  onIntentChange: (intent: MapAttentionIntent | null) => void;
  onSelectPlace: (slug: string) => void;
  onOpenTrail: () => void;
  onGuideOpenChange: (open: boolean) => void;
};

export type MapAttentionIntent = "meet" | "discover" | "now";

export type MapAttentionPlaceSuggestion = {
  slug: string;
  name: string;
  description: string;
  meta: string;
  sprite: "beer" | "surf" | "palm" | "cafe" | "gathering" | "rumor" | "flag";
};

const INTENT_OPTIONS: Array<{
  id: MapAttentionIntent;
  label: string;
  detail: string;
  sprite: MapAttentionPlaceSuggestion["sprite"];
}> = [
  {
    id: "meet",
    label: "Meet people",
    detail: "Public, bounded activities",
    sprite: "gathering",
  },
  {
    id: "discover",
    label: "Find something interesting",
    detail: "Places with a story",
    sprite: "rumor",
  },
  {
    id: "now",
    label: "Do something now",
    detail: "Live, nearby and low-friction",
    sprite: "flag",
  },
];

const PEEBEAR_FIELD_LINES = [
  "Tap a named place for its lore.",
  "Purple stones are reviewed local rumors.",
  "Brighter halos mean more verified activity.",
  "Zoom closer and the hidden details come into focus.",
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
  intent,
  placeSuggestions,
  trailCount,
  guideOpen,
  onIntentChange,
  onSelectPlace,
  onOpenTrail,
  onGuideOpenChange,
}: AdventureMapOverlayProps) {
  const [guideLineIndex, setGuideLineIndex] = useState(0);
  const [guideSpeechOpen, setGuideSpeechOpen] = useState(false);
  const rankedActivities = useMemo(() => {
    const activities = [...(snapshot?.activities ?? [])];
    if (intent === "meet") {
      return activities.filter((activity) => activity.type === "meetup");
    }
    if (intent === "now") {
      return activities.sort((a, b) => {
        const aTime = a.startsAt ? new Date(a.startsAt).getTime() : 0;
        const bTime = b.startsAt ? new Date(b.startsAt).getTime() : 0;
        return aTime - bTime;
      });
    }
    return [];
  }, [intent, snapshot?.activities]);
  const focalActivity = rankedActivities[0] ?? null;
  const activityCount = snapshot?.totals.activities ?? 0;
  const goingCount = snapshot?.totals.going ?? 0;
  const showPanel = enabled && panelOpen && !obscured;
  const showIntentCard = !obscured && !intent && guideOpen;
  const showRecommendationCard = !obscured && Boolean(intent) && guideOpen;
  const guideLines = useMemo(() => {
    const personalLine =
      intent === "meet"
        ? goingCount > 0
          ? `${goingCount} people are joining public activities nearby.`
          : "I’ll show public activities when people opt in."
        : intent === "now"
        ? focalActivity
          ? `${focalActivity.title} is your strongest live option.`
          : "No fake urgency. I’m looking for a useful move now."
        : intent === "discover"
        ? "Purple stones mark reviewed clues, not random pins."
        : "Tell me what would make your next two hours better.";

    return [
      personalLine,
      trailCount > 0
        ? `Your trail remembers ${trailCount} verified ${
            trailCount === 1 ? "place" : "places"
          }.`
        : "Your first verified place will start a permanent trail.",
      ...PEEBEAR_FIELD_LINES,
    ];
  }, [focalActivity, goingCount, intent, trailCount]);

  return (
    <>
      <div className="pointer-events-none absolute left-3 top-3 z-[15] flex max-w-[min(22rem,calc(100%-5.25rem))] flex-col items-start gap-2 md:left-5 md:top-5">
        <div className="pointer-events-auto hidden flex-wrap items-center gap-2 md:flex">
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
              <Image
                src="/assets/peebear-head.webp"
                alt=""
                width={1200}
                height={670}
                unoptimized
                className="adventure-guide-mini"
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
              className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-violet-200/22 bg-[linear-gradient(180deg,rgba(41,24,64,0.92),rgba(8,7,17,0.95))] px-3 text-[9px] font-black uppercase tracking-[0.11em] text-violet-50 shadow-[0_10px_24px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.1)] backdrop-blur-xl transition hover:border-violet-100/36"
            >
              <span
                className="adventure-sprite adventure-sprite--rumor-mini"
                aria-hidden="true"
              />
              <span className="hidden sm:inline">Find secrets</span>
              <span className="sm:hidden">Secrets</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={onOpenTrail}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-emerald-200/16 bg-[linear-gradient(180deg,rgba(17,42,36,0.88),rgba(5,9,13,0.95))] px-3 text-[10px] font-black uppercase tracking-[0.12em] text-emerald-50/80 shadow-[0_14px_30px_rgba(0,0,0,0.3),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl transition hover:border-emerald-100/28"
          >
            <Footprints className="h-3.5 w-3.5 text-emerald-200" />
            Trail · {trailCount}
          </button>
        </div>

        {showIntentCard ? (
          <section className="map-attention-card pointer-events-auto relative mt-1 max-h-[min(24rem,55dvh)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-[26px] border border-[#f5c518]/24 bg-[radial-gradient(circle_at_92%_0%,rgba(34,211,238,0.13),transparent_34%),radial-gradient(circle_at_5%_0%,rgba(245,197,24,0.16),transparent_36%),linear-gradient(180deg,rgba(18,20,31,0.97),rgba(5,7,14,0.985))] p-3 shadow-[0_28px_64px_rgba(0,0,0,0.56),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:p-4">
            <button
              type="button"
              onClick={() => onGuideOpenChange(false)}
              aria-label="Close PeeBear suggestions"
              className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/48 transition hover:border-white/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="text-[9px] font-black uppercase tracking-[0.24em] text-[#f8dd72]/70">
              PeeBear reads the field
            </p>
            <h2 className="mt-2 max-w-[18rem] pr-7 text-lg font-black leading-5 text-white sm:text-xl sm:leading-6">
              What would make your next two hours better?
            </h2>
            <p className="mt-2 text-xs leading-5 text-white/52">
              Pick a mood. I’ll narrow the map to three useful possibilities.
            </p>
            <div className="mt-3 grid gap-2">
              {INTENT_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onIntentChange(option.id)}
                  className="map-attention-choice group flex min-h-12 items-center gap-2 rounded-[18px] border border-white/9 bg-white/[0.035] px-2.5 text-left transition hover:-translate-y-0.5 hover:border-cyan-100/24 hover:bg-cyan-300/[0.055] sm:min-h-14 sm:gap-3 sm:px-3"
                >
                  <span
                    className={`adventure-sprite adventure-sprite--${option.sprite}`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-black text-white">
                      {option.label}
                    </span>
                    <span className="mt-0.5 block text-[10px] font-semibold text-white/44">
                      {option.detail}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-white/28 transition group-hover:text-cyan-100" />
                </button>
              ))}
              <button
                type="button"
                onClick={() => onGuideOpenChange(false)}
                className="group flex min-h-12 items-center gap-3 rounded-[18px] border border-emerald-100/14 bg-emerald-300/[0.045] px-3 text-left transition hover:border-emerald-100/28 hover:bg-emerald-300/[0.075]"
              >
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-emerald-100/14 bg-black/25">
                  <Compass className="h-4 w-4 text-emerald-100" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-black text-white">
                    Free roam
                  </span>
                  <span className="mt-0.5 block text-[10px] font-semibold text-white/44">
                    Just explore the map
                  </span>
                </span>
                <ChevronRight className="h-4 w-4 text-white/28 transition group-hover:text-emerald-100" />
              </button>
            </div>
          </section>
        ) : null}

        {showRecommendationCard ? (
          <section className="map-attention-card pointer-events-auto relative mt-1 max-h-[min(21rem,45dvh)] w-[min(24rem,calc(100vw-2rem))] overflow-y-auto rounded-[24px] border border-cyan-100/15 bg-[linear-gradient(180deg,rgba(13,21,32,0.95),rgba(5,7,14,0.975))] p-3.5 shadow-[0_24px_54px_rgba(0,0,0,0.46),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-xl">
            <button
              type="button"
              onClick={() => onGuideOpenChange(false)}
              aria-label="Close PeeBear recommendations"
              className="absolute right-2.5 top-2.5 grid h-8 w-8 place-items-center rounded-full border border-white/10 bg-black/30 text-white/48 transition hover:border-white/20 hover:text-white"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-black uppercase tracking-[0.22em] text-cyan-100/52">
                  For your next move
                </p>
                <p className="mt-1 text-sm font-black text-white">
                  {intent === "meet"
                    ? "People, without the social gamble"
                    : intent === "discover"
                    ? "A place worth having a story about"
                    : "Something useful you can do now"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onIntentChange(null)}
                className="mr-8 shrink-0 rounded-full border border-white/10 bg-white/[0.035] px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.12em] text-white/48 transition hover:text-white"
              >
                Change
              </button>
            </div>

            <div className="mt-3 grid gap-2">
              {focalActivity ? (
                <button
                  type="button"
                  onClick={() => onSelectActivity(focalActivity)}
                  className="group flex min-h-16 items-center gap-3 rounded-[18px] border border-[#f5c518]/24 bg-[#f5c518]/[0.08] px-3 text-left transition hover:border-[#f5c518]/42 hover:bg-[#f5c518]/[0.12]"
                >
                  <span
                    className={`adventure-sprite adventure-sprite--${
                      focalActivity.type === "dare" ? "flag" : "gathering"
                    }`}
                    aria-hidden="true"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[9px] font-black uppercase tracking-[0.16em] text-[#f8dd72]/72">
                      Best match
                    </span>
                    <span className="mt-1 line-clamp-1 block text-sm font-black text-white">
                      {focalActivity.title}
                    </span>
                    <span className="mt-1 block text-[10px] font-bold text-white/50">
                      {getActivityMeta(focalActivity)}
                    </span>
                  </span>
                  <ChevronRight className="h-4 w-4 text-[#f8dd72]" />
                </button>
              ) : null}

              {placeSuggestions
                .slice(0, focalActivity ? 2 : 3)
                .map((place, index) => (
                  <button
                    key={place.slug}
                    type="button"
                    onClick={() => onSelectPlace(place.slug)}
                    className="group flex min-h-14 items-center gap-3 rounded-[17px] border border-white/9 bg-white/[0.035] px-3 text-left transition hover:border-violet-100/22 hover:bg-violet-300/[0.045]"
                  >
                    <span
                      className={`adventure-sprite adventure-sprite--${place.sprite}`}
                      aria-hidden="true"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-[8px] font-black uppercase tracking-[0.15em] text-violet-100/48">
                        {!focalActivity && index === 0
                          ? "Best match"
                          : (!focalActivity && index === 1) ||
                            (focalActivity && index === 0)
                          ? "Easy alternative"
                          : "Mystery choice"}
                      </span>
                      <span className="mt-0.5 line-clamp-1 block text-xs font-black text-white">
                        {place.name}
                      </span>
                      <span className="mt-1 line-clamp-1 block text-[9px] font-semibold text-white/46">
                        {place.description}
                      </span>
                      <span className="mt-1 line-clamp-1 block text-[9px] font-semibold text-white/42">
                        {place.meta}
                      </span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-white/24 transition group-hover:text-violet-100" />
                  </button>
                ))}

              {!focalActivity && placeSuggestions.length === 0 ? (
                <button
                  type="button"
                  onClick={onExploreSecrets}
                  className="flex min-h-14 items-center gap-3 rounded-[17px] border border-violet-200/18 bg-violet-300/[0.055] px-3 text-left"
                >
                  <Compass className="h-5 w-5 text-violet-100" />
                  <span>
                    <span className="block text-xs font-black text-white">
                      Widen the search
                    </span>
                    <span className="mt-1 block text-[9px] text-white/44">
                      No fake recommendations. Scan a larger area.
                    </span>
                  </span>
                </button>
              ) : null}
            </div>
          </section>
        ) : null}

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

      {!showIntentCard ? (
        <button
          type="button"
          onClick={() => {
            setGuideSpeechOpen(true);
            if (guideSpeechOpen) {
              setGuideLineIndex((current) => (current + 1) % guideLines.length);
            }
          }}
          aria-label="Ask PeeBear for another field hint"
          className={`pointer-events-auto absolute right-4 z-[16] flex max-w-[min(18rem,calc(100%-2rem))] items-end gap-2 text-left md:bottom-6 md:right-6 ${
            obscured ? "bottom-28" : "bottom-5"
          }`}
        >
          {guideSpeechOpen ? (
            <span className="mb-2 max-w-[12rem] rounded-[17px] border border-cyan-100/18 bg-[linear-gradient(180deg,rgba(15,24,37,0.96),rgba(5,7,14,0.98))] px-3 py-2 text-[10px] font-bold leading-4 text-cyan-50/86 shadow-[0_16px_34px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.09)] backdrop-blur-xl sm:max-w-[15rem]">
              {guideLines[guideLineIndex % guideLines.length]}
            </span>
          ) : null}
          <span className="adventure-guide-orb shrink-0" aria-hidden="true">
            <Image
              src="/assets/peebear-head.webp"
              alt=""
              width={1200}
              height={670}
              unoptimized
              className="adventure-guide-face"
            />
            <span className="adventure-guide-orb__spark" />
          </span>
        </button>
      ) : null}
    </>
  );
}
