"use client";

import React from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Users, CheckCircle, ArrowRight, Star, MapPin, Clock, Briefcase, Radio } from "lucide-react";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import HoneyGooAccent from "@/components/HoneyGooAccent";
import { buildCreatorMissionActivationHref } from "@/lib/mission-routing";

type Creator = {
  tag: string;
  totalEarned: number;
  completedDares: number;
  status: string;
  tags?: string[];
  pfpUrl?: string | null;
  pfpScale?: number | null;
  pfpOffsetX?: number | null;
  pfpOffsetY?: number | null;
  reviews?: {
    count: number;
    averageRating: number | null;
  };
  trust?: {
    level: number;
    label: string;
    score: number;
  };
  stats?: {
    approved: number;
    payoutQueued: number;
    live: number;
    acceptRate: number;
  };
  businessMetrics?: {
    venueReach: number;
    firstMarks: number;
  };
};

const raisedPanelClass =
  "relative overflow-hidden rounded-[30px] border border-white/[0.09] bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_14%,rgba(10,9,18,0.9)_58%,rgba(7,6,14,0.96)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.4),0_0_28px_rgba(168,85,247,0.07),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-18px_24px_rgba(0,0,0,0.24)]";

const softCardClass =
  "bd-raised-surface relative overflow-hidden rounded-[26px] border border-white/[0.1]";

const insetCardClass =
  "bd-dent-surface bd-dent-surface--soft rounded-[22px] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(4,5,10,0.72)_0%,rgba(11,11,18,0.92)_100%)]";

const creatorCardClass =
  "bd-raised-surface group rounded-[24px] border border-white/[0.1] p-4 transition-[transform,border-color,filter] duration-200 hover:-translate-y-[2px] hover:border-purple-300/24 hover:filter hover:brightness-[1.04]";

const creatorMetricWellClass =
  "rounded-[18px] border border-white/[0.09] bg-[linear-gradient(145deg,rgba(255,255,255,0.06)_0%,rgba(11,11,22,0.88)_42%,rgba(5,6,14,0.96)_100%)] px-3 py-2 shadow-[inset_6px_7px_14px_rgba(0,0,0,0.38),inset_-3px_-4px_10px_rgba(255,255,255,0.035),0_8px_14px_rgba(0,0,0,0.18)]";

const creatorChipClass =
  "rounded-full border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.07)_0%,rgba(255,255,255,0.025)_100%)] px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.12em] text-white/60 shadow-[0_6px_10px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-5px_8px_rgba(0,0,0,0.18)]";

const ghostButtonClass =
  "bd-tactile-button inline-flex min-h-11 items-center justify-center rounded-full border px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.14em]";

const goldButtonClass =
  "bd-tactile-button bd-tactile-button--gold inline-flex min-h-11 items-center justify-center rounded-full border px-3 py-2 text-center text-[11px] font-black uppercase tracking-[0.14em]";

const sectionLabelClass =
  "inline-flex items-center gap-2 rounded-full border border-fuchsia-400/25 bg-[linear-gradient(180deg,rgba(217,70,239,0.16)_0%,rgba(88,28,135,0.08)_100%)] px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-fuchsia-100 shadow-[0_12px_24px_rgba(0,0,0,0.18),inset_0_1px_0_rgba(255,255,255,0.12),inset_0_-10px_14px_rgba(0,0,0,0.22)]";

const createMissionHref = "/create?source=creator-directory";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function getCreatorAvatarStyle(creator: Creator): React.CSSProperties {
  const scale = clamp(creator.pfpScale ?? 1, 1, 2.5);
  const offsetX = clamp(creator.pfpOffsetX ?? 50, 0, 100);
  const offsetY = clamp(creator.pfpOffsetY ?? 50, 0, 100);

  return {
    objectPosition: `${offsetX}% ${offsetY}%`,
    transform: `scale(${scale})`,
    transformOrigin: "center center",
  };
}

function getCreatorAvailability(creator: Creator): {
  label: string;
  detail: string;
  dotClass: string;
  badgeClass: string;
} {
  if ((creator.stats?.live ?? 0) > 0) {
    return {
      label: "Working now",
      detail: `${creator.stats?.live ?? 0} active mission${(creator.stats?.live ?? 0) === 1 ? "" : "s"}`,
      dotClass: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.7)]",
      badgeClass: "border-emerald-300/30 bg-emerald-400/10 text-emerald-100",
    };
  }

  if ((creator.stats?.approved ?? creator.completedDares) > 0 || (creator.businessMetrics?.venueReach ?? 0) > 0) {
    return {
      label: "Work history",
      detail: "Completed BaseDare work",
      dotClass: "bg-cyan-300 shadow-[0_0_14px_rgba(103,232,249,0.7)]",
      badgeClass: "border-cyan-300/30 bg-cyan-400/10 text-cyan-100",
    };
  }

  return {
    label: "New contributor",
    detail: "No completed work yet",
    dotClass: "bg-[#f5c518] shadow-[0_0_14px_rgba(245,197,24,0.6)]",
    badgeClass: "border-[#f5c518]/30 bg-[#f5c518]/10 text-[#f9e27a]",
  };
}

function getCreatorAreaLabel(creator: Creator): string {
  const tags = creator.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const knownArea = tags.find((tag) =>
    ["siargao", "sydney", "bondi", "manila", "general luna", "bali"].some((area) => tag.includes(area))
  );

  if (knownArea) return knownArea.replace(/\b\w/g, (letter) => letter.toUpperCase());
  if ((creator.businessMetrics?.venueReach ?? 0) > 0) return "Venue circuit";
  return "Area shared after invite";
}

function getCreatorSkillChips(creator: Creator): string[] {
  const tags = creator.tags?.map((tag) => tag.toLowerCase()) ?? [];
  const skills = new Set<string>();

  tags.forEach((tag) => {
    if (tag.includes("food") || tag.includes("cafe") || tag.includes("coffee")) skills.add("Food");
    if (tag.includes("beach") || tag.includes("surf")) skills.add("Beach");
    if (tag.includes("night") || tag.includes("bar")) skills.add("Nightlife");
    if (tag.includes("event")) skills.add("Events");
    if (tag.includes("fitness") || tag.includes("gym")) skills.add("Fitness");
  });

  if ((creator.businessMetrics?.venueReach ?? 0) > 0) skills.add("Venue scout");
  if ((creator.businessMetrics?.firstMarks ?? 0) > 0) skills.add("First spark");
  if ((creator.stats?.acceptRate ?? 0) >= 70) skills.add("Reliable");

  ["Place updates", "Local clips"].forEach((skill) => skills.add(skill));
  return Array.from(skills).slice(0, 4);
}

export default function CreatorsPage() {
  const [creators, setCreators] = React.useState<Creator[]>([]);
  const [loadingCreators, setLoadingCreators] = React.useState(true);
  const [creatorFetchFailed, setCreatorFetchFailed] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [filterMode, setFilterMode] = React.useState<"all" | "verified">("all");
  const [sortMode, setSortMode] = React.useState<"trust" | "earned" | "dares" | "az">("trust");

  React.useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2800);

    async function fetchCreators() {
      try {
        const res = await fetch("/api/creators", {
          cache: "no-store",
          signal: controller.signal,
        });
        const data = await res.json();
        if (!cancelled && data.success) {
          setCreators(data.data);
          setCreatorFetchFailed(false);
        }
      } catch (err) {
        if (!cancelled && !controller.signal.aborted) {
          console.error("Failed to fetch creators", err);
        }
        if (!cancelled) setCreatorFetchFailed(true);
      } finally {
        window.clearTimeout(timeoutId);
        if (!cancelled) setLoadingCreators(false);
      }
    }
    fetchCreators();

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      controller.abort();
    };
  }, []);

  const STREAMER_IMAGES: Record<string, string> = {
    kaicenat: "/assets/KAICENAT.jpeg",
    "kai cenat": "/assets/KAICENAT.jpeg",
    adinross: "/assets/adinross.webp",
    "adin ross": "/assets/adinross.webp",
    ishowspeed: "/assets/Ishowspeed.jpg",
    speed: "/assets/Ishowspeed.jpg",
  };

  const filteredCreators = React.useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    const visible = creators.filter((creator) => {
      const matchesFilter = filterMode === "all" || creator.status === "VERIFIED";
      const matchesSearch =
        !normalizedSearch ||
        creator.tag.toLowerCase().includes(normalizedSearch) ||
        creator.tags?.some((tag) => tag.toLowerCase().includes(normalizedSearch));

      return matchesFilter && matchesSearch;
    });

    return [...visible].sort((a, b) => {
      if (sortMode === "az") {
        return a.tag.localeCompare(b.tag);
      }

      if (sortMode === "dares") {
        return b.completedDares - a.completedDares || b.totalEarned - a.totalEarned;
      }

      if (sortMode === "trust") {
        return (b.trust?.score ?? 0) - (a.trust?.score ?? 0) || b.totalEarned - a.totalEarned;
      }

      return b.totalEarned - a.totalEarned || b.completedDares - a.completedDares;
    });
  }, [creators, filterMode, searchQuery, sortMode]);

  const availableCreators = React.useMemo(() => {
    return [...creators]
      .sort((a, b) => {
        const liveDelta = (b.stats?.live ?? 0) - (a.stats?.live ?? 0);
        if (liveDelta !== 0) return liveDelta;
        const venueDelta = (b.businessMetrics?.venueReach ?? 0) - (a.businessMetrics?.venueReach ?? 0);
        if (venueDelta !== 0) return venueDelta;
        return (b.trust?.score ?? 0) - (a.trust?.score ?? 0);
      })
      .slice(0, 3);
  }, [creators]);

  return (
    <div className="relative min-h-screen flex flex-col">
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay />
      </div>

      <div className="container mx-auto max-w-6xl px-4 py-24 sm:px-6 flex-grow relative z-20">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-12"
        >
          <div className={`${raisedPanelClass} px-5 py-8 sm:px-8 sm:py-10 text-center`}>
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_0%,rgba(168,85,247,0.12),transparent_32%),radial-gradient(circle_at_88%_100%,rgba(34,211,238,0.1),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.05)_0%,transparent_32%,transparent_72%,rgba(0,0,0,0.24)_100%)]" />
            <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-white/26 to-transparent" />
            <HoneyGooAccent className="absolute right-4 top-[-2px] hidden xl:block" size="sm" />

            <div className="relative">
              <div className={sectionLabelClass}>
                <Users className="w-4 h-4 text-fuchsia-300" />
                CREATOR DIRECTORY
              </div>

              <h1 className="mt-5 text-4xl md:text-6xl font-black text-white tracking-tight">
                Find people who{" "}
                <span className="mt-1 block whitespace-nowrap text-[#f5c518] drop-shadow-[0_0_18px_rgba(245,197,24,0.2)] sm:mt-0 sm:inline sm:bg-gradient-to-r sm:from-yellow-300 sm:via-yellow-400 sm:to-amber-500 sm:bg-clip-text sm:text-transparent sm:drop-shadow-none">
                  make it real
                </span>
              </h1>

              <p className="mt-4 text-gray-400 font-mono text-sm max-w-xl mx-auto mb-8">
                Browse contributors by completed work, places reached, and local experience. Open a profile or invite someone to a paid mission.
              </p>

              <div className="flex flex-col sm:flex-row gap-3 justify-center max-w-xl mx-auto">
                <Link href={createMissionHref} className="flex-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="bd-tactile-button bd-tactile-button--gold w-full relative overflow-hidden px-6 py-3.5 rounded-[18px] border text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 hover:-translate-y-[1px]"
                  >
                    <Briefcase className="w-4 h-4" />
                    Fund a mission
                  </motion.button>
                </Link>
                <Link href="/earn?source=creator-directory" className="flex-1">
                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    className="bd-tactile-button bd-tactile-button--cyan w-full relative overflow-hidden px-6 py-3.5 rounded-[18px] border text-sm font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 hover:-translate-y-[1px]"
                  >
                    <ArrowRight className="w-4 h-4" />
                    Find paid work
                  </motion.button>
                </Link>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          className="max-w-5xl mx-auto mb-10"
        >
          <div className={`${softCardClass} p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            <div className="relative">
              <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-400/10 px-4 py-2 text-[10px] font-semibold uppercase tracking-[0.24em] text-emerald-100 shadow-[0_10px_18px_rgba(0,0,0,0.16),inset_0_1px_0_rgba(255,255,255,0.08)]">
                    <Radio className="h-3.5 w-3.5" />
                    Featured contributors
                  </div>
                  <h2 className="mt-4 text-xl font-black tracking-tight text-white italic">
                    People with local work history
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-white/55">
                    Compare area, completed work, and strengths. Exact location stays private until a mission is accepted.
                  </p>
                </div>
                <Link
                  href={createMissionHref}
                  className={`${goldButtonClass} min-h-[2.75rem] gap-2 px-4 text-[11px]`}
                >
                  <Briefcase className="h-3.5 w-3.5" />
                  Fund a mission
                </Link>
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-3">
                {loadingCreators
                  ? [1, 2, 3].map((item) => (
                    <div key={item} className={`h-44 animate-pulse ${creatorCardClass}`} />
                  ))
                  : availableCreators.length > 0 ? availableCreators.map((creator) => {
                    const plainTag = creator.tag.replace("@", "").toLowerCase();
                    const profileAvatar = creator.pfpUrl?.trim() || null;
                    const avatarImg = profileAvatar || STREAMER_IMAGES[plainTag];
                    const availability = getCreatorAvailability(creator);
                    const creatorTag = creator.tag.startsWith("@") ? creator.tag : `@${creator.tag}`;
                    const creatorArea = getCreatorAreaLabel(creator);
                    const creatorSkills = getCreatorSkillChips(creator);
                    const inviteHref = buildCreatorMissionActivationHref({
                      creator: creatorTag,
                      source: "available-creators",
                      city: creatorArea,
                      skills: creatorSkills,
                    });

                    return (
                      <div key={`ready-${creator.tag}`} className={creatorCardClass}>
                        <div className="relative flex items-start gap-3">
                          <Link href={`/creator/${plainTag}`} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/14 bg-[radial-gradient(circle_at_30%_18%,rgba(255,255,255,0.24),transparent_25%),linear-gradient(145deg,rgba(168,85,247,0.85),rgba(245,197,24,0.72))] shadow-[0_16px_28px_rgba(0,0,0,0.4),0_0_22px_rgba(168,85,247,0.16),inset_0_1px_0_rgba(255,255,255,0.18),inset_0_-10px_14px_rgba(0,0,0,0.22)]">
                            {profileAvatar ? (
                              // eslint-disable-next-line @next/next/no-img-element -- user avatars can live on configurable media gateways.
                              <img
                                src={profileAvatar}
                                alt={creator.tag}
                                className="h-full w-full object-cover"
                                style={getCreatorAvatarStyle(creator)}
                              />
                            ) : avatarImg ? (
                              <Image
                                src={avatarImg}
                                alt={creator.tag}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.28),transparent_25%),linear-gradient(145deg,#a855f7_0%,#f5c518_100%)] text-xl font-black text-white">
                                {creator.tag.charAt(creator.tag.startsWith("@") ? 1 : 0).toUpperCase()}
                              </div>
                            )}
                            <span className="pointer-events-none absolute inset-x-4 top-2 h-1 rounded-full bg-white/28 blur-[1px]" />
                          </Link>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`h-2.5 w-2.5 rounded-full ${availability.dotClass}`} />
                              <p className="truncate text-sm font-black text-white">
                                {creator.tag.startsWith("@") ? creator.tag : `@${creator.tag}`}
                              </p>
                            </div>
                            <div className={`mt-2 inline-flex rounded-full border px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${availability.badgeClass}`}>
                              {availability.label}
                            </div>
                          </div>
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2 text-[10px]">
                          <div className={creatorMetricWellClass}>
                            <div className="flex items-center gap-1.5 uppercase tracking-[0.16em] text-white/32 font-black">
                              <MapPin className="h-3 w-3 text-cyan-200" />
                              Area
                            </div>
                            <p className="mt-1 font-black text-white/78">{getCreatorAreaLabel(creator)}</p>
                          </div>
                          <div className={creatorMetricWellClass}>
                            <div className="flex items-center gap-1.5 uppercase tracking-[0.16em] text-white/32 font-black">
                              <Clock className="h-3 w-3 text-[#f9e27a]" />
                              Completed
                            </div>
                            <p className="mt-1 font-black text-white/78">{creator.stats?.approved ?? creator.completedDares} missions</p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap gap-1.5">
                          {creatorSkills.map((skill) => (
                            <span key={`${creator.tag}-${skill}`} className={creatorChipClass}>
                              {skill}
                            </span>
                          ))}
                        </div>

                        <div className="mt-4 grid grid-cols-2 gap-2">
                          <Link
                            href={`/creator/${plainTag}`}
                            className={ghostButtonClass}
                          >
                            Work record
                          </Link>
                          <Link
                            href={inviteHref}
                            className={goldButtonClass}
                          >
                            Invite
                          </Link>
                        </div>
                      </div>
                    );
                  }) : (
                    <div className={`${insetCardClass} p-5 md:col-span-3`}>
                      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="text-sm font-black text-white">
                            {creatorFetchFailed ? "Creator rail is loading slowly." : "No creator availability signal yet."}
                          </p>
                          <p className="mt-2 max-w-xl text-sm font-semibold leading-6 text-white/52">
                            No public work history is available yet. Contributors enter through a real paid mission first.
                          </p>
                        </div>
                        <div className="grid gap-2 sm:grid-cols-2 md:w-[22rem]">
                          <Link
                            href={createMissionHref}
                            className={`${goldButtonClass} min-h-11 px-4 tracking-[0.13em]`}
                          >
                            Fund a mission
                          </Link>
                          <Link
                            href="/earn?source=creator-directory-empty"
                            className={`${ghostButtonClass} bd-tactile-button--cyan min-h-11 px-4 tracking-[0.13em]`}
                          >
                            Find paid work
                          </Link>
                        </div>
                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Active Creators Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-5xl mx-auto mb-16"
        >
          <div className={`${softCardClass} p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            <div className="relative">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white tracking-tight italic">
                  ALL CONTRIBUTORS
                </h2>
                <Link href="/leaderboard" className="inline-flex min-h-11 items-center gap-2 rounded-full border border-fuchsia-400/20 bg-fuchsia-500/[0.08] px-3.5 py-2 text-[11px] font-black text-purple-300 hover:text-purple-200 transition-colors uppercase tracking-widest shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
                  Hall of Fame <ArrowRight className="w-3 h-3" />
                </Link>
              </div>

              <div className="mb-5 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto]">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search creator or tag"
                  className="bd-dent-surface bd-dent-surface--soft w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-gray-500 outline-none transition focus:border-fuchsia-400/30"
                />
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "all", label: "All" },
                    { value: "verified", label: "Verified" },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setFilterMode(option.value)}
                      className={`bd-dent-pill min-h-11 rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                        filterMode === option.value
                          ? "border-cyan-400/30 bg-cyan-400/12 text-cyan-100"
                          : "border-white/10 bg-white/[0.04] text-gray-400 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {([
                    { value: "trust", label: "Most Trusted" },
                    { value: "earned", label: "Top Earned" },
                    { value: "dares", label: "Most Completed" },
                    { value: "az", label: "A-Z" },
                  ] as const).map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setSortMode(option.value)}
                      className={`bd-dent-pill min-h-11 rounded-full border px-3.5 py-2 text-[11px] font-black uppercase tracking-[0.18em] transition ${
                        sortMode === option.value
                          ? "border-purple-400/30 bg-purple-500/[0.12] text-purple-100"
                          : "border-white/10 bg-white/[0.04] text-gray-400 hover:text-white"
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {loadingCreators ? (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className={`h-44 animate-pulse ${softCardClass}`} />
                  ))}
                </div>
              ) : filteredCreators.length === 0 ? (
                <div className={`${insetCardClass} p-8 text-center`}>
                  <p className="text-gray-500 font-mono text-xs">
                    {creatorFetchFailed
                      ? "The contributor directory is loading slowly. Paid missions remain available."
                      : creators.length === 0
                        ? "No public contributor profiles yet."
                        : "No creators match that search yet."}
                  </p>
                  <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
                    <Link
                      href="/earn?source=creators-empty-state"
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cyan-300/25 bg-cyan-300/[0.08] px-4 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-cyan-100 transition hover:border-cyan-200/40"
                    >
                      Find paid work <ArrowRight className="w-4 h-4" />
                    </Link>
                    <Link
                      href={createMissionHref}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-[#f5c518]/25 bg-[#f5c518]/[0.08] px-4 py-2 text-center text-xs font-black uppercase tracking-[0.14em] text-[#f9e27a] transition hover:border-[#f5c518]/40"
                    >
                      Fund a mission <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="relative">
                  <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-8 bg-gradient-to-b from-[#0a0913] to-transparent" />
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-10 bg-gradient-to-t from-[#0a0913] to-transparent" />
                  <div className="max-h-[38rem] overflow-y-auto pr-1 sm:pr-2">
                    <div className="mb-4 flex items-center justify-between text-[11px] font-mono uppercase tracking-[0.16em] text-gray-500">
                      <span>{filteredCreators.length} visible</span>
                      <span>{filterMode === "verified" ? "verified only" : "all creators"}</span>
                    </div>
                    {/* Single column below sm: two-up creator cards at 375px truncate
                        tags and shrink the tap target below comfortable thumb size. */}
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 sm:gap-4 md:grid-cols-4">
                      {filteredCreators.map((creator, index) => {
                        const plainTag = creator.tag.replace("@", "").toLowerCase();
                        const profileAvatar = creator.pfpUrl?.trim() || null;
                        const avatarImg = profileAvatar || STREAMER_IMAGES[plainTag];

                        return (
                          <motion.div
                            key={creator.tag}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.1 + index * 0.05 }}
                          >
                            <Link
                              href={`/creator/${plainTag}`}
                              className={`${softCardClass} group block p-5 text-center transition-all duration-300 hover:-translate-y-[2px] hover:border-purple-500/35`}
                            >
                              <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(168,85,247,0.10),transparent_42%),linear-gradient(180deg,transparent_0%,rgba(0,0,0,0.12)_100%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

                              <div className="relative z-10">
                                <div className="mb-4 mx-auto relative w-16 h-16">
                                  {profileAvatar ? (
                                    <div className="h-full w-full overflow-hidden rounded-full border-2 border-white/10 shadow-[0_14px_26px_rgba(0,0,0,0.3)] transition-colors group-hover:border-purple-500/45">
                                      {/* eslint-disable-next-line @next/next/no-img-element -- user avatars can live on configurable media gateways. */}
                                      <img
                                        src={profileAvatar}
                                        alt={creator.tag}
                                        className="h-full w-full object-cover"
                                        style={getCreatorAvatarStyle(creator)}
                                      />
                                    </div>
                                  ) : avatarImg ? (
                                    <Image
                                      src={avatarImg}
                                      alt={creator.tag}
                                      fill
                                      sizes="64px"
                                      className="rounded-full object-cover border-2 border-white/10 group-hover:border-purple-500/45 transition-colors shadow-[0_14px_26px_rgba(0,0,0,0.3)]"
                                    />
                                  ) : (
                                    <div className="w-full h-full rounded-full bg-gradient-to-br from-purple-600 to-yellow-500 flex items-center justify-center text-xl font-black text-white shadow-[0_14px_26px_rgba(0,0,0,0.3)]">
                                      {creator.tag.charAt(creator.tag.startsWith("@") ? 1 : 0).toUpperCase()}
                                    </div>
                                  )}
                                  <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-blue-500 rounded-full border-2 border-[#0a0a0f] flex items-center justify-center shadow-[0_8px_16px_rgba(0,0,0,0.24)]">
                                    <CheckCircle className="w-3 h-3 text-white" />
                                  </div>
                                </div>

                                <h3 className="text-sm font-black text-white group-hover:text-purple-300 transition-colors truncate italic">
                                  {creator.tag.startsWith("@") ? creator.tag : `@${creator.tag}`}
                                </h3>

                                <div className="mt-3 flex min-h-[2rem] flex-wrap items-center justify-center gap-1.5">
                                  {creator.trust ? (
                                    <span className="inline-flex items-center rounded-full border border-[#f5c518]/20 bg-[#f5c518]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-[#f9e27a]">
                                      {creator.trust.label} Lv.{creator.trust.level}
                                    </span>
                                  ) : null}
                                  {(creator.reviews?.count ?? 0) > 0 ? (
                                    <span className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/[0.04] px-2 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-white/72">
                                      <Star className="h-3 w-3 fill-[#f9e27a] text-[#f9e27a]" />
                                      {creator.reviews?.averageRating?.toFixed(1)} · {creator.reviews?.count}
                                    </span>
                                  ) : null}
                                </div>

                                <div className={`mt-4 ${insetCardClass} p-3`}>
                                  <div className="grid grid-cols-2 gap-2 text-left">
                                    <div>
                                      <span className="block text-[11px] font-black leading-none text-white tabular-nums">
                                        {creator.stats?.approved ?? creator.completedDares}
                                      </span>
                                      <span className="mt-1 block text-[8px] text-gray-500 uppercase font-black tracking-[0.14em]">Completed</span>
                                    </div>
                                    <div>
                                      <span className="block text-[11px] font-black leading-none text-cyan-100 tabular-nums">
                                        {creator.businessMetrics?.venueReach ?? 0}
                                      </span>
                                      <span className="mt-1 block text-[8px] text-gray-500 uppercase font-black tracking-[0.14em]">Venues</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </Link>
                          </motion.div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </motion.div>

        {/* Directory exits */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="max-w-5xl mx-auto mb-16"
        >
          <div className={`${softCardClass} p-5 sm:p-6`}>
            <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-white/22 to-transparent" />
            <div className="relative grid gap-3 md:grid-cols-2">
              <Link href="/earn?source=creator-directory-footer" className={`${insetCardClass} group p-5 transition hover:border-cyan-300/25`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-200">Want paid work?</p>
                <h2 className="mt-2 text-xl font-black text-white">Start with a real mission.</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/52">
                  See the brief and payout before signing in. Add a public profile after you have work to show.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-cyan-100">
                  See paid missions <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
              <Link href={createMissionHref} className={`${insetCardClass} group p-5 transition hover:border-[#f5c518]/25`}>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#f9e27a]">Need someone local?</p>
                <h2 className="mt-2 text-xl font-black text-white">Fund one clear mission.</h2>
                <p className="mt-2 text-sm font-semibold leading-6 text-white/52">
                  Set the place, useful outcome, reward, and deadline. BaseDare keeps the work and receipt together.
                </p>
                <span className="mt-4 inline-flex items-center gap-2 text-[11px] font-black uppercase tracking-[0.16em] text-[#f9e27a]">
                  Create a paid Dare <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </span>
              </Link>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
}
