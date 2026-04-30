'use client';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, RefreshCw } from 'lucide-react';
import SquircleButton from '@/components/ui/SquircleButton';
import { useFeedback } from '@/hooks/useFeedback';
import { cn } from '@/lib/utils';
import './PremiumBentoGrid.css';

const SUGGESTIONS = {
  "GAMING": [
    "Win a Warzone match using only a pistol",
    "Speedrun Minecraft in under 20 mins",
    "Beat a Dark Souls boss without rolling",
    "Win a chess game in under 15 moves",
    "Complete a Valorant match with inverted controls",
    "Get a pentakill in League of Legends",
    "Win a Fortnite match with no building",
    "Complete a GTA 5 heist without dying",
    "Reach Diamond rank in one stream session",
    "Win a Street Fighter match using only kicks",
    "Complete Elden Ring boss hitless",
    "Get a 20-bomb in Apex Legends"
  ],
  "CREATIVE": [
    "Write and perform an original rap about chat",
    "Draw your viewers' usernames as cartoon characters",
    "Create a song using only household items",
    "Paint a portrait blindfolded",
    "Write a short story live based on chat suggestions",
    "Compose a beat in 10 minutes",
    "Create a TikTok dance and teach it to chat",
    "Make a comedy skit about streaming life",
    "Freestyle rap for 5 minutes straight",
    "Create digital art using MS Paint only",
    "Write and sing a ballad about pizza",
    "Improv a standup comedy set for 10 mins"
  ],
  "SOCIAL": [
    "Call your mom and tell her you love her live",
    "Text your crush and confess your feelings",
    "DM 5 streamers asking for collab (politely)",
    "Post an embarrassing childhood photo on Twitter",
    "Call a random friend and sing them happy birthday",
    "Compliment 10 strangers in your DMs",
    "Ask 10 strangers on the street for a high-five",
    "Tell your best friend your most embarrassing moment",
    "Ask your followers to roast you for 10 mins",
    "Call your best friend and apologize for something silly",
    "Text your ex 'I miss our friendship' (if appropriate)",
    "Post your most cringy old tweet"
  ],
  "FITNESS": [
    "Do 100 pushups in one stream",
    "Hold a plank for 5 minutes straight",
    "Do 50 burpees without stopping",
    "Complete a full yoga flow live",
    "Do squats every time you die in game (50 max)",
    "Wall sit for 3 minutes",
    "Do jumping jacks for every donation (100 max)",
    "Complete a 10-minute ab workout",
    "Do pushups every time chat spams (50 max)",
    "Hold a handstand for 30 seconds",
    "Complete 200 jump rope skips",
    "Do a full body workout routine live"
  ],
  "FOOD": [
    "Eat a raw onion like an apple",
    "Try the spiciest hot sauce you can find",
    "Eat a lemon whole (peel and all)",
    "Make and eat a disgusting food combo chat chooses",
    "Drink a gallon of water in 10 minutes",
    "Eat a whole jar of pickles",
    "Try every chip flavor and rank them",
    "Make a meal with 5 random ingredients",
    "Eat cereal with orange juice instead of milk",
    "Try durian fruit for the first time",
    "Eat a full ghost pepper (if you dare)",
    "Order food delivery but chat picks everything"
  ],
  "CHAOS": [
    "Let chat control your playlist for the stream",
    "Delete your least viewed YouTube video",
    "Tweet your most controversial gaming opinion",
    "Change your display name to what chat votes",
    "Let chat pick your outfit for tomorrow",
    "Unfollow everyone on Twitter then refollow",
    "Post your screen time report on social media",
    "Let chat redesign your stream overlay live",
    "Change all your profile pics to what chat picks",
    "Let viewers control your phone for 5 mins",
    "Read your most embarrassing old tweets",
    "Show your browser bookmarks on stream"
  ],
  "MUSIC": [
    "Learn and perform a song in one stream",
    "Sing karaoke for 30 minutes straight",
    "Beatbox for 5 minutes without stopping",
    "Cover a popular song in a different genre",
    "Write original lyrics to a famous beat",
    "Learn 3 instruments and play them live",
    "Sing every message in chat for 10 mins",
    "Perform an acoustic cover of a rap song",
    "Create a remix live using free software",
    "Sing the alphabet in opera style",
    "Rap battle with your viewers",
    "Play guitar while singing upside down"
  ]
};

const IRL_SUGGESTIONS = {
  nightlife: [
    "Film a 15-second first-impression walkthrough of the venue",
    "Capture the signature drink or ritual that makes this spot memorable",
    "Ask the bartender for one local recommendation and film the answer",
    "Record the cleanest crowd-energy moment without disturbing anyone",
    "Find the best corner, table, or view and explain why it works"
  ],
  gym: [
    "Complete a safe 60-second form challenge and explain the movement",
    "Film a before-and-after energy check from warm-up to finish",
    "Ask staff for one beginner-friendly tip and show it on camera",
    "Capture the cleanest recovery, stretch, or cooldown ritual here",
    "Show the one piece of equipment or class someone should try first"
  ],
  cafe: [
    "Order the most photogenic item and give a 15-second verdict",
    "Ask the barista what regulars order and film the recommendation",
    "Find the best seat for working, reading, or people-watching",
    "Capture the first-sip reaction and the venue atmosphere in one clip",
    "Show the menu item someone should buy if they only have one shot"
  ],
  beach: [
    "Film the best golden-hour angle and include one recognizable local anchor",
    "Record a 15-second beach condition report for someone deciding whether to come",
    "Capture a clean boardwalk, swim, sunset, or surf-side ritual",
    "Show the hidden angle most visitors miss without blocking anyone",
    "Make a fast local guide: where to stand, what to bring, and when to go"
  ],
  street: [
    "Film a clean street-level intro that shows movement, sound, and signs",
    "Ask one person for a local recommendation and keep it respectful",
    "Capture the route from the nearest landmark to the venue entrance",
    "Show the detail that makes this block feel different from a normal map pin",
    "Create a 10-second micro-guide for someone arriving here for the first time"
  ]
};

const IRL_TAGS: Array<{ key: keyof typeof IRL_SUGGESTIONS; label: string; emoji: string }> = [
  { key: 'nightlife', label: 'nightlife', emoji: '🍸' },
  { key: 'gym', label: 'fitness', emoji: '💪' },
  { key: 'cafe', label: 'cafe', emoji: '☕' },
  { key: 'beach', label: 'outdoors', emoji: '🌴' },
  { key: 'street', label: 'city', emoji: '🌃' },
];

const STREAM_TAGS: Array<{ key: keyof typeof SUGGESTIONS; label: string; emoji: string }> = [
  { key: 'GAMING', label: 'gaming', emoji: '🎮' },
  { key: 'CREATIVE', label: 'creative', emoji: '🎨' },
  { key: 'SOCIAL', label: 'social', emoji: '💬' },
  { key: 'FITNESS', label: 'fitness', emoji: '🏋️' },
  { key: 'FOOD', label: 'food', emoji: '🍜' },
  { key: 'CHAOS', label: 'chaos', emoji: '⚡' },
  { key: 'MUSIC', label: 'music', emoji: '🎵' },
];

interface GeneratorProps {
  onSelect: (text: string) => void;
  onContextChange?: (context: { mode: 'IRL' | 'STREAM'; tag: string }) => void;
  shouldAutoFillTitle?: boolean;
}

export default function DareGenerator({
  onSelect,
  onContextChange,
  shouldAutoFillTitle = true,
}: GeneratorProps) {
  const { trigger, haptic } = useFeedback();
  const [mode, setMode] = useState<'IRL' | 'STREAM'>('IRL');
  const [streamCategory, setStreamCategory] = useState<keyof typeof SUGGESTIONS>('GAMING');
  const [irlCategory, setIrlCategory] = useState<keyof typeof IRL_SUGGESTIONS>('nightlife');
  const [suggestion, setSuggestion] = useState(IRL_SUGGESTIONS.nightlife[0]);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isSegmentScrubbing, setIsSegmentScrubbing] = useState(false);
  const scrubPointerIdRef = useRef<number | null>(null);
  const segmentRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const activeSuggestions = useMemo(() => {
    return mode === 'IRL' ? IRL_SUGGESTIONS[irlCategory] : SUGGESTIONS[streamCategory];
  }, [mode, irlCategory, streamCategory]);

  const currentSegments = useMemo(
    () => (mode === 'IRL' ? IRL_TAGS : STREAM_TAGS),
    [mode]
  );

  const selectedSegmentKey = mode === 'IRL' ? irlCategory : streamCategory;

  useEffect(() => {
    const first = activeSuggestions[0];
    if (shouldAutoFillTitle) {
      setSuggestion(first);
      onSelect(first);
    }
  }, [activeSuggestions, onSelect, shouldAutoFillTitle]);

  useEffect(() => {
    const tag = mode === 'IRL' ? irlCategory : streamCategory;
    onContextChange?.({ mode, tag });
  }, [mode, irlCategory, streamCategory, onContextChange]);

  const generate = () => {
    setIsAnimating(true);
    let shuffles = 0;
    const interval = setInterval(() => {
      const random = activeSuggestions[Math.floor(Math.random() * activeSuggestions.length)];
      setSuggestion(random);
      shuffles++;
      if (shuffles > 15) {
        clearInterval(interval);
        setIsAnimating(false);
        onSelect(random);
      }
    }, 50);
  };

  const updateSegmentSelection = useCallback((segmentKey: string) => {
    if (mode === 'IRL') {
      const nextKey = segmentKey as keyof typeof IRL_SUGGESTIONS;
      setIrlCategory(nextKey);
      setSuggestion(IRL_SUGGESTIONS[nextKey][0]);
      return;
    }

    const nextKey = segmentKey as keyof typeof SUGGESTIONS;
    setStreamCategory(nextKey);
    setSuggestion(SUGGESTIONS[nextKey][0]);
  }, [mode]);

  const handleModeChange = (nextMode: 'IRL' | 'STREAM') => {
    trigger('click');
    setMode(nextMode);
  };

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
    <div className="p-6 bg-purple-900/10 border border-purple-500/30 rounded-2xl mb-8">
      <div className="flex flex-col gap-4 mb-4">
        <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFD700]" /> AI Mission Generator
        </h3>

        <div className="grid grid-cols-2 gap-2">
          <SquircleButton
            onClick={() => handleModeChange('IRL')}
            tone={mode === 'IRL' ? 'yellow' : 'slate'}
            label="IRL"
            height={44}
            fullWidth
            className={cn(
              'min-w-0 after:pointer-events-none after:absolute after:inset-[2px] after:rounded-full after:border after:border-white/8',
              mode === 'IRL' ? 'after:opacity-65' : 'after:opacity-35'
            )}
          />
          <SquircleButton
            onClick={() => handleModeChange('STREAM')}
            tone={mode === 'STREAM' ? 'purple' : 'slate'}
            label="STREAM"
            height={44}
            fullWidth
            className={cn(
              'min-w-0 after:pointer-events-none after:absolute after:inset-[2px] after:rounded-full after:border after:border-white/8',
              mode === 'STREAM' ? 'after:opacity-65' : 'after:opacity-35'
            )}
          />
        </div>

        <div className="overflow-x-auto scrollbar-hide -mx-2 px-2 md:mx-0 md:px-0">
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
                    'group relative h-12 min-w-[88px] rounded-[1.15rem] cursor-grab active:cursor-grabbing',
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
                          key={`${mode}-${segment.key}`}
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
                      'relative z-10 flex h-full w-full items-center text-[10px] font-bold uppercase tracking-[0.18em] transition-colors duration-300',
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
      
      <div className="flex gap-4">
        <div className="flex-1 rounded-xl border border-white/[0.09] bg-[linear-gradient(145deg,rgba(13,11,20,0.98)_0%,rgba(17,15,26,0.95)_18%,rgba(32,24,44,0.88)_100%)] p-4 font-mono text-white text-sm md:text-lg flex items-center shadow-[inset_0_2px_3px_rgba(255,255,255,0.05),inset_0_-10px_18px_rgba(0,0,0,0.45),inset_8px_8px_18px_rgba(0,0,0,0.22),inset_-5px_-5px_12px_rgba(255,255,255,0.02),0_1px_0_rgba(255,255,255,0.04)] relative overflow-hidden">
          <div className="pointer-events-none absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-white/18 to-transparent" />
          <div className="pointer-events-none absolute inset-x-6 bottom-0 h-px bg-gradient-to-r from-transparent via-black/45 to-transparent" />
          <div className="pointer-events-none absolute inset-0 rounded-xl bg-[radial-gradient(circle_at_18%_16%,rgba(192,132,252,0.12),transparent_30%),radial-gradient(circle_at_85%_85%,rgba(250,204,21,0.08),transparent_28%)]" />
          <span className="text-gray-500 mr-2">{">"}</span>
          <span className="relative z-10">{suggestion}</span>
          {/* Scanning Line Effect */}
          {isAnimating && (
            <div 
              className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -skew-x-12"
              style={{
                animation: 'shine-scan 0.5s infinite'
              }}
            />
          )}
        </div>
        
        <SquircleButton
          onClick={generate}
          disabled={isAnimating}
          tone="yellow"
          height={58}
          square
          icon={<RefreshCw className={`h-7 w-7 ${isAnimating ? 'animate-spin' : ''}`} />}
          className="shrink-0"
        />
      </div>

      <p className="mt-3 text-xs text-gray-400 font-mono">
        Keep it fun & legal — no harm, no crime.
      </p>
    </div>
  );
}
