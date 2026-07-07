'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw, ChevronLeft, ChevronRight } from 'lucide-react';
import SquircleButton from '@/components/ui/SquircleButton';
import { useFeedback } from '@/hooks/useFeedback';
import { cn } from '@/lib/utils';
import {
  CREATOR_CAPTAIN_CATEGORIES,
  CREATOR_CAPTAIN_CATEGORY_LABELS,
  type CreatorCaptainCategory,
} from '@/lib/creator-captains';
import './PremiumBentoGrid.css';

// Mission-type is chosen first (no default) so the product never quietly pre-selects
// a lane. Categories = the single-source taxonomy (CREATOR_CAPTAIN_CATEGORIES).
// Idea templates are on-thesis venue/experience proof — never streamer stunts.
const MISSION_SUGGESTIONS: Record<CreatorCaptainCategory, string[]> = {
  nightlife: [
    'Film a 15-second first-impression walkthrough of the venue',
    'Capture the signature drink or ritual that makes this spot memorable',
    'Ask a staff member for one local recommendation and film the answer',
    'Record the cleanest crowd-energy moment without disturbing anyone',
  ],
  food: [
    "Order the venue's signature dish and give an honest 15-second verdict",
    'Ask the staff what regulars order and film the recommendation',
    'Capture the first-bite reaction and the room in one clean clip',
    'Make a quick menu guide: what to order if you only have one shot',
  ],
  travel: [
    'Film the route from the nearest landmark so a stranger could find this spot',
    'Capture the one view or detail most visitors miss',
    "Make a 15-second 'why come here' guide: what to do and when to go",
    'Record a quick condition report for someone deciding whether to visit',
  ],
  street: [
    'Film a clean street-level intro showing movement, sound, and signs',
    'Ask one person for a respectful local recommendation and film it',
    'Capture the detail that makes this block feel different from a map pin',
    'Create a 10-second micro-guide for someone arriving for the first time',
  ],
  challenge: [
    'Take on a harmless skill challenge (pool shot, darts, trivia) and film the attempt',
    'Set a simple group challenge and capture who wins',
    "Film a 30-second 'can you do this?' and invite a friend to try",
  ],
  fitness: [
    'Film a safe 60-second movement or drill and explain it',
    'Capture a run-club, surf, or class meetup and the post-session energy',
    'Ask staff for one beginner tip and demonstrate it on camera',
    'Show the one class, court, or session a newcomer should try first',
  ],
  web3: [
    'Explain how this place pays out on Base in one clear, jargon-free clip',
    'Film a first-time on-chain check-in and how simple it was',
    "Capture a 15-second 'why verified proof matters here' explainer",
  ],
  digital: [
    'Post the dare link and drive signups or RSVPs you can track',
    'Run a story with the link and report the clicks it produced',
    'Share the route/claim link and count who actually claimed it',
    'Post a clear call-to-action and track the verified conversions',
  ],
  music: [
    "Capture the live music or the room's sound in a 15-second clip",
    'Film the artist or DJ moment that makes the night',
    'Ask the performer one question and film the answer',
  ],
};

// Community Spark = free/pro-bono local proof: help, meetups, cleanups, crowd energy.
// Same lanes, but framed as gathering people / doing good — never a paid creator stunt.
const COMMUNITY_SUGGESTIONS: Record<CreatorCaptainCategory, string[]> = {
  nightlife: [
    'Rally a crew for a spontaneous night out and film the turnout',
    'Welcome newcomers to the local scene and capture the group energy',
    'Organize a no-cover meetup and prove who actually showed up',
  ],
  food: [
    'Organize a shared meal or food-share and film who came together',
    'Gather food for someone who needs it and capture the handoff',
    'Host a potluck-style meetup and prove the community turnout',
  ],
  travel: [
    'Lead a small group to a local spot and capture the meetup',
    'Help a lost traveler find their way and film the good deed',
    'Run a free walking tour and prove who joined',
  ],
  street: [
    'Run a quick neighborhood cleanup and film the before and after',
    'Help a local with a small task and capture the moment',
    'Clear litter along one block and prove the cleanup',
  ],
  challenge: [
    'Set a friendly group challenge and capture strangers joining in',
    'Start a harmless dare chain and film who takes it on',
    'Rally people for a silly group challenge and prove the crowd',
  ],
  fitness: [
    'Host a free run, surf, or yoga meetup and film the group session',
    'Lead a beginner-friendly workout and capture who showed up',
    'Organize a pickup game and prove the turnout',
  ],
  web3: [
    'Onboard a newcomer to Base for free and film how simple it was',
    'Help someone make their first on-chain check-in and capture it',
    'Explain verified proof to a first-timer and film the aha moment',
  ],
  digital: [
    'Post a community call-out and count who actually shows up',
    'Rally your followers to a real meetup and prove the turnout',
    'Share an open invite and capture who answered it in person',
  ],
  music: [
    'Gather people for an impromptu jam or dance and capture the energy',
    'Start a singalong or drum circle and film the crowd',
    'Bring strangers together around live music and prove the moment',
  ],
};

const CATEGORY_EMOJI: Record<CreatorCaptainCategory, string> = {
  nightlife: '🍸',
  food: '🍜',
  travel: '🌴',
  street: '🌃',
  challenge: '🎯',
  fitness: '💪',
  web3: '⛓️',
  digital: '📲',
  music: '🎵',
};

// digital = tracked online action -> online proof; everything else = IRL presence.
const ONLINE_CATEGORIES: CreatorCaptainCategory[] = ['digital'];
function categoryMode(category: CreatorCaptainCategory): 'IRL' | 'STREAM' {
  return ONLINE_CATEGORIES.includes(category) ? 'STREAM' : 'IRL';
}

function buildSuggestions(
  category: CreatorCaptainCategory,
  venueName?: string | null,
  isCommunitySpark = false
) {
  const base = (isCommunitySpark ? COMMUNITY_SUGGESTIONS : MISSION_SUGGESTIONS)[category];
  const name = venueName?.trim();
  if (!name) return base;
  return [
    ...base.map((s) => s),
    isCommunitySpark
      ? `Bring people together at ${name} and capture the turnout — human, useful, and easy to prove.`
      : `Tell the ${name} story in one clean, verifiable clip — human, useful, and easy to prove.`,
  ];
}

interface GeneratorProps {
  onSelect: (text: string) => void;
  onContextChange?: (context: { mode: 'IRL' | 'STREAM'; tag: string }) => void;
  shouldAutoFillTitle?: boolean;
  venueName?: string | null;
  isCommunitySpark?: boolean;
}

export default function DareGenerator({
  onSelect,
  onContextChange,
  shouldAutoFillTitle = true,
  venueName,
  isCommunitySpark = false,
}: GeneratorProps) {
  const { trigger, haptic } = useFeedback();
  // No default lane — the user chooses. null = "Choose a mission type" empty state.
  const [category, setCategory] = useState<CreatorCaptainCategory | null>(null);
  const [suggestion, setSuggestion] = useState<string | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSegmentScrubbing, setIsSegmentScrubbing] = useState(false);
  const scrubPointerIdRef = useRef<number | null>(null);
  const segmentRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const onSelectRef = useRef(onSelect);
  const rollTimeoutRef = useRef<number | null>(null);
  const segmentScrollRef = useRef<HTMLDivElement | null>(null);

  const activeSuggestions = useMemo(
    () => (category ? buildSuggestions(category, venueName, isCommunitySpark) : []),
    [category, venueName, isCommunitySpark]
  );

  const currentSegments = useMemo(
    () => CREATOR_CAPTAIN_CATEGORIES.map((key) => ({ key, label: CREATOR_CAPTAIN_CATEGORY_LABELS[key], emoji: CATEGORY_EMOJI[key] })),
    []
  );

  const selectedSegmentKey = category;

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  // Fill the first idea only AFTER a category is chosen. Never auto-fill on mount.
  useEffect(() => {
    if (!category) return;
    const first = activeSuggestions[0];
    if (!first) return;

    const frame = window.requestAnimationFrame(() => {
      setSuggestion(first);
      if (shouldAutoFillTitle) {
        onSelectRef.current(first);
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [category, activeSuggestions, shouldAutoFillTitle]);

  useEffect(() => {
    return () => {
      if (rollTimeoutRef.current !== null) {
        window.clearTimeout(rollTimeoutRef.current);
      }
    };
  }, []);

  // Desktop: mobile scrolls the category rail via native touch-pan, but on desktop the
  // drag is bound to scrub-select and the scrollbar is hidden — so a vertical wheel would
  // never reach cut-off categories. Translate vertical wheel into horizontal scroll.
  useEffect(() => {
    const el = segmentScrollRef.current;
    if (!el) return;
    const handleWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return;
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, []);

  // Wheel-scroll is real but invisible — desktop needs a discoverable way to
  // reach cut-off lanes. Chevron paddles page the rail; each shows only while
  // there is actually overflow in that direction.
  const [railOverflow, setRailOverflow] = useState({ left: false, right: false });
  useEffect(() => {
    const el = segmentScrollRef.current;
    if (!el) return;
    const update = () => {
      setRailOverflow({
        left: el.scrollLeft > 4,
        right: el.scrollLeft + el.clientWidth < el.scrollWidth - 4,
      });
    };
    update();
    el.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    return () => {
      el.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  const pageRail = useCallback((direction: -1 | 1) => {
    const el = segmentScrollRef.current;
    if (!el) return;
    el.scrollBy({ left: direction * el.clientWidth * 0.6, behavior: 'smooth' });
  }, []);

  // Only report context once a lane is chosen — no mount-time default leaks out.
  useEffect(() => {
    if (!category) return;
    onContextChange?.({ mode: categoryMode(category), tag: category });
  }, [category, onContextChange]);

  const generate = useCallback(() => {
    if (isAnimating || activeSuggestions.length === 0) {
      return;
    }

    trigger('click');
    haptic('spark');
    setIsAnimating(true);

    if (rollTimeoutRef.current !== null) {
      window.clearTimeout(rollTimeoutRef.current);
    }

    const pool =
      activeSuggestions.length > 1
        ? activeSuggestions.filter((item) => item !== suggestion)
        : activeSuggestions;
    const nextSuggestion = pool[Math.floor(Math.random() * pool.length)] ?? activeSuggestions[0];

    rollTimeoutRef.current = window.setTimeout(() => {
      setSuggestion(nextSuggestion);
      onSelectRef.current(nextSuggestion);

      rollTimeoutRef.current = window.setTimeout(() => {
        setIsAnimating(false);
        rollTimeoutRef.current = null;
      }, 180);
    }, 130);
  }, [activeSuggestions, haptic, isAnimating, suggestion, trigger]);

  const updateSegmentSelection = useCallback((segmentKey: string) => {
    const nextKey = segmentKey as CreatorCaptainCategory;
    setCategory(nextKey);
    setSuggestion(buildSuggestions(nextKey, venueName, isCommunitySpark)[0]);
  }, [venueName, isCommunitySpark]);

  const handleSegmentChange = (segmentKey: string) => {
    trigger('click');
    updateSegmentSelection(segmentKey);
  };

  const getNearestSegmentKey = useCallback((clientX: number) => {
    let nearestKey: string | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;

    for (const segment of currentSegments) {
      const element = segmentRefs.current[segment.key];
      if (!element) continue;
      const rect = element.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const distance = Math.abs(centerX - clientX);

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestKey = segment.key;
      }
    }

    return nearestKey;
  }, [currentSegments]);

  const scrubToPointer = useCallback((clientX: number) => {
    const nextKey = getNearestSegmentKey(clientX);
    if (!nextKey || nextKey === selectedSegmentKey) {
      return;
    }

    haptic('tap');
    updateSegmentSelection(nextKey);
  }, [getNearestSegmentKey, haptic, selectedSegmentKey, updateSegmentSelection]);

  const stopSegmentScrub = useCallback(() => {
    setIsSegmentScrubbing(false);
    scrubPointerIdRef.current = null;
  }, []);

  const handleSegmentRailPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    scrubPointerIdRef.current = event.pointerId;
    setIsSegmentScrubbing(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }, []);

  const handleSegmentRailPointerMove = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (scrubPointerIdRef.current !== event.pointerId) {
      return;
    }

    scrubToPointer(event.clientX);
  }, [scrubToPointer]);

  const handleSegmentRailPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (scrubPointerIdRef.current !== event.pointerId) {
      return;
    }

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    stopSegmentScrub();
  }, [stopSegmentScrub]);

  return (
    <div className="mb-5 rounded-[24px] border border-purple-500/22 bg-purple-900/10 p-4 shadow-[0_18px_42px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.06)] md:mb-8 md:p-6">
      <div className="flex flex-col gap-4 mb-4">
        <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFD700]" /> Dare Type
        </h3>

        <div className="relative">
          {railOverflow.left ? (
            <button
              type="button"
              onClick={() => pageRail(-1)}
              aria-label="Scroll dare types left"
              className="absolute -left-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-[#0c0a16]/95 text-white/75 shadow-[0_10px_22px_rgba(0,0,0,0.5)] transition hover:text-white md:flex"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          ) : null}
          {railOverflow.right ? (
            <button
              type="button"
              onClick={() => pageRail(1)}
              aria-label="Scroll dare types right"
              className="absolute -right-2 top-1/2 z-20 hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-white/14 bg-[#0c0a16]/95 text-white/75 shadow-[0_10px_22px_rgba(0,0,0,0.5)] transition hover:text-white md:flex"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          ) : null}
        <div ref={segmentScrollRef} className="overflow-x-auto scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
          <div
            onPointerDown={handleSegmentRailPointerDown}
            onPointerMove={handleSegmentRailPointerMove}
            onPointerUp={handleSegmentRailPointerUp}
            onPointerCancel={handleSegmentRailPointerUp}
            className={cn(
              'relative flex w-max min-w-full gap-2 rounded-[1.7rem] border border-white/[0.08] bg-[linear-gradient(180deg,rgba(7,9,17,0.84)_0%,rgba(18,16,29,0.92)_100%)] p-2 shadow-[0_16px_32px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.08),inset_0_-14px_18px_rgba(0,0,0,0.3)] touch-pan-x select-none',
              isSegmentScrubbing && 'cursor-grabbing'
            )}
          >
            <div className="pointer-events-none absolute inset-x-6 top-1.5 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
            <div className="pointer-events-none absolute inset-x-8 bottom-1.5 h-px bg-gradient-to-r from-transparent via-black/35 to-transparent" />

            {currentSegments.map((segment) => {
              const selected = selectedSegmentKey === segment.key;

              return (
                <button
                  key={segment.key}
                  type="button"
                  onClick={() => handleSegmentChange(segment.key)}
                  ref={(node) => {
                    segmentRefs.current[segment.key] = node;
                  }}
                  className={cn(
                    'group relative h-12 min-w-[104px] rounded-[1.15rem] cursor-grab active:cursor-grabbing',
                    isSegmentScrubbing && 'cursor-grabbing'
                  )}
                  aria-pressed={selected}
                >
                  {selected ? (
                    <motion.div
                      layoutId="mission-roll-switch"
                      transition={{ type: 'spring', stiffness: 360, damping: 30 }}
                      animate={{
                        scale: isSegmentScrubbing ? 1.025 : 1,
                        y: isSegmentScrubbing ? -1 : 0,
                      }}
                      className="absolute inset-0 overflow-hidden rounded-[1.15rem] border border-white/14 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(183,128,255,0.12)_30%,rgba(18,16,31,0.9)_100%)] shadow-[0_10px_20px_rgba(0,0,0,0.2),inset_0_1px_0_rgba(255,255,255,0.1),inset_0_-8px_12px_rgba(0,0,0,0.18)] backdrop-blur-xl"
                    >
                      <div
                        className={cn(
                          'absolute left-2 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-white/18 bg-[radial-gradient(circle_at_30%_28%,rgba(255,255,255,0.18),rgba(190,132,252,0.14)_36%,rgba(15,16,24,0.84)_100%)] shadow-[0_8px_14px_rgba(0,0,0,0.22),inset_0_1px_0_rgba(255,255,255,0.12)] transition-transform duration-150',
                          isSegmentScrubbing && 'scale-105'
                        )}
                      >
                        <motion.span
                          key={segment.key}
                          initial={{ opacity: 0, scale: 0.82 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ duration: 0.22 }}
                          className="text-sm"
                        >
                          {segment.emoji}
                        </motion.span>
                      </div>
                    </motion.div>
                  ) : null}

                  <span
                    className={cn(
                      'relative z-10 flex h-full w-full items-center text-[10px] font-bold uppercase tracking-[0.16em] transition-colors duration-300',
                      selected
                        ? 'justify-start pl-12 pr-3 text-white'
                        : 'justify-center px-3 text-white/42 group-hover:text-white/78'
                    )}
                  >
                    {segment.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-[1fr_150px] md:gap-4">
        <div
          className={cn(
            'relative flex min-h-[104px] flex-1 items-center overflow-hidden rounded-xl border border-white/[0.09] bg-[linear-gradient(145deg,rgba(13,11,20,0.98)_0%,rgba(17,15,26,0.95)_18%,rgba(32,24,44,0.88)_100%)] p-4 font-mono text-sm text-white shadow-[inset_0_2px_3px_rgba(255,255,255,0.05),inset_0_-10px_18px_rgba(0,0,0,0.45),inset_8px_8px_18px_rgba(0,0,0,0.22),inset_-5px_-5px_12px_rgba(255,255,255,0.02),0_1px_0_rgba(255,255,255,0.04)] transition-[opacity,transform] duration-200 md:min-h-[92px] md:text-lg',
            isAnimating && 'scale-[0.996] opacity-80'
          )}
          aria-live="polite"
        >
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
          <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-black/45 to-transparent" />
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_18%_16%,rgba(192,132,252,0.12),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(250,204,21,0.08),transparent_28%)]" />
          {category ? (
            <>
              <span className="text-gray-500 mr-2">{'>'}</span>
              <span className="relative z-10">{suggestion}</span>
            </>
          ) : (
            <div className="relative z-10">
              <p className="text-sm font-bold text-white md:text-base">Choose a dare type</p>
              <p className="mt-1 text-xs font-normal leading-5 text-white/50 md:text-sm">
                Pick the lane that best fits this dare. We&apos;ll suggest safer templates after you choose.
              </p>
            </div>
          )}
          {isAnimating && (
            <div
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/6 to-transparent -skew-x-12"
              style={{
                animation: 'shine-scan 0.42s ease-out 1',
              }}
            />
          )}
        </div>

        <SquircleButton
          onClick={generate}
          disabled={isAnimating || !category}
          tone="yellow"
          height={54}
          label="Roll"
          icon={<RefreshCw className={`h-4 w-4 ${isAnimating ? 'animate-spin' : ''}`} />}
          fullWidth
          className="shrink-0"
        />
      </div>

      {category === 'digital' ? (
        <p className="mt-3 text-[11px] font-bold leading-4 text-emerald-200/70">
          Digital Dares = tracked online action (signups, RSVPs, link clicks, route claims, verified campaign actions) — not stunts.
        </p>
      ) : null}

      <p className="mt-3 text-xs text-gray-400 font-mono">
        Keep it fun and legal. No harm, no crime.
      </p>
    </div>
  );
}
