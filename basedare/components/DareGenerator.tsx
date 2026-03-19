'use client';
import React, { useEffect, useMemo, useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

const CHIP_BASE =
  'relative overflow-hidden whitespace-nowrap border font-bold transition-all duration-200 active:translate-y-[1px] disabled:cursor-not-allowed disabled:opacity-60';

function getModeButtonClass(active: boolean, tone: 'gold' | 'purple') {
  if (active) {
    return `${CHIP_BASE} px-4 py-2.5 rounded-full text-xs md:text-sm text-black shadow-[0_1px_0_rgba(255,255,255,0.35)_inset,0_-6px_10px_rgba(0,0,0,0.22)_inset,0_12px_18px_rgba(0,0,0,0.25)] ${
      tone === 'gold'
        ? 'border-[#f8dd6b]/80 bg-[linear-gradient(180deg,#fff0a8_0%,#facc15_44%,#d9a90a_68%,#b77f04_100%)] hover:shadow-[0_1px_0_rgba(255,255,255,0.42)_inset,0_-6px_10px_rgba(0,0,0,0.2)_inset,0_14px_20px_rgba(250,204,21,0.18)]'
        : 'border-[#c998ff]/80 bg-[linear-gradient(180deg,#ecd6ff_0%,#c084fc_42%,#8b5cf6_68%,#5b21b6_100%)] hover:shadow-[0_1px_0_rgba(255,255,255,0.4)_inset,0_-6px_10px_rgba(0,0,0,0.22)_inset,0_14px_20px_rgba(168,85,247,0.18)]'
    }`;
  }

  return `${CHIP_BASE} px-4 py-2.5 rounded-full text-xs md:text-sm text-gray-300 border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,rgba(255,255,255,0.04)_22%,rgba(18,18,22,0.96)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_-6px_10px_rgba(0,0,0,0.28)_inset,0_8px_14px_rgba(0,0,0,0.18)] hover:border-white/20 hover:text-white`;
}

function getCategoryChipClass(active: boolean, tone: 'gold' | 'purple') {
  if (active) {
    return `${CHIP_BASE} flex-shrink-0 rounded-full px-3 py-2 text-[10px] text-black shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_-5px_8px_rgba(0,0,0,0.22)_inset,0_10px_14px_rgba(0,0,0,0.18)] ${
      tone === 'gold'
        ? 'border-[#f6d75f]/75 bg-[linear-gradient(180deg,#fef1a4_0%,#facc15_44%,#d9a90a_70%,#b77f04_100%)] hover:shadow-[0_1px_0_rgba(255,255,255,0.3)_inset,0_-5px_8px_rgba(0,0,0,0.22)_inset,0_12px_16px_rgba(250,204,21,0.16)]'
        : 'border-[#c998ff]/75 bg-[linear-gradient(180deg,#ecd6ff_0%,#c084fc_42%,#8b5cf6_70%,#5b21b6_100%)] hover:shadow-[0_1px_0_rgba(255,255,255,0.28)_inset,0_-5px_8px_rgba(0,0,0,0.22)_inset,0_12px_16px_rgba(168,85,247,0.18)]'
    }`;
  }

  return `${CHIP_BASE} flex-shrink-0 rounded-full px-3 py-2 text-[10px] text-gray-400 border-white/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.06)_0%,rgba(255,255,255,0.03)_18%,rgba(16,15,21,0.95)_100%)] shadow-[0_1px_0_rgba(255,255,255,0.05)_inset,0_-4px_8px_rgba(0,0,0,0.24)_inset,0_8px_12px_rgba(0,0,0,0.16)] hover:border-white/20 hover:text-white`;
}

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
    "Convince a stranger you're their long-lost cousin — get a hug or a drink",
    "Order a round for the bar but make the bartender guess your star sign first",
    "Start a slow clap that turns into the entire bar doing the Macarena",
    "Tell the bartender you're a drink critic and rate their cocktail out loud",
    "Ask a stranger to dramatically introduce you to someone across the bar"
  ],
  gym: [
    "Challenge the biggest person in the room to a plank-off — loser buys protein shakes",
    "Do 20 reps yelling motivational quotes in a bad Arnold Schwarzenegger accent",
    "Ask someone mid-set if they accept Venmo for spotting you",
    "Announce your last rep like a sports commentator — crowd has to react",
    "Tell a stranger their form is perfect and keep a straight face the whole time"
  ],
  cafe: [
    "Order a drink with 12 custom modifications without breaking eye contact",
    "Convince the barista your name is Batman and wait for them to shout it",
    "Sit next to a stranger and mirror everything they do for 60 seconds",
    "Ask the barista for a chef's special and accept whatever they make you",
    "Stand up and announce the WiFi password like you own the place"
  ],
  beach: [
    "Ask 5 strangers to help you rehearse a wedding proposal — film their reactions",
    "Convince someone to trade their towel for your sunglasses — no money allowed",
    "Announce you're a professional sandcastle judge and critique a random one",
    "Get 5 strangers to do a synchronised jump photo — you direct it like a film shoot",
    "Tell someone you just spotted a celebrity and watch the crowd turn to look"
  ],
  street: [
    "Get 3 strangers to pose for a fake album cover — you direct the whole shoot",
    "Ask someone for directions to a place you're already standing in front of",
    "Pretend to be a tour guide and give 3 strangers completely made-up historical facts",
    "Start beatboxing and point at a stranger to rap — they have to do something",
    "Tell a stranger your name is a celebrity's name and see how long before they realise"
  ]
};

const IRL_TAGS: Array<{ key: keyof typeof IRL_SUGGESTIONS; label: string }> = [
  { key: 'nightlife', label: '🍺 Nightlife' },
  { key: 'gym', label: '💪 Gym / Fitness' },
  { key: 'cafe', label: '☕ Cafe / Coffee Shop' },
  { key: 'beach', label: '🏖️ Beach / Outdoors' },
  { key: 'street', label: '🌆 Street / City' },
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
  const [mode, setMode] = useState<'IRL' | 'STREAM'>('IRL');
  const [streamCategory, setStreamCategory] = useState<keyof typeof SUGGESTIONS>('GAMING');
  const [irlCategory, setIrlCategory] = useState<keyof typeof IRL_SUGGESTIONS>('nightlife');
  const [suggestion, setSuggestion] = useState(IRL_SUGGESTIONS.nightlife[0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const activeSuggestions = useMemo(() => {
    return mode === 'IRL' ? IRL_SUGGESTIONS[irlCategory] : SUGGESTIONS[streamCategory];
  }, [mode, irlCategory, streamCategory]);

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

  return (
    <div className="p-6 bg-purple-900/10 border border-purple-500/30 rounded-2xl mb-8">
      <div className="flex flex-col gap-4 mb-4">
        <h3 className="text-purple-400 font-bold uppercase tracking-widest text-xs flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FFD700]" /> AI Mission Generator
        </h3>

        <div className="grid grid-cols-2 gap-2 sm:flex sm:gap-2">
          <button
            type="button"
            onClick={() => setMode('IRL')}
            className={getModeButtonClass(mode === 'IRL', 'gold')}
          >
            IRL
          </button>
          <button
            type="button"
            onClick={() => setMode('STREAM')}
            className={getModeButtonClass(mode === 'STREAM', 'purple')}
          >
            STREAM
          </button>
        </div>

        {/* Scrollable category buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {mode === 'IRL'
            ? IRL_TAGS.map((tag) => (
                <button
                  key={tag.key}
                  type="button"
                  onClick={() => {
                    setIrlCategory(tag.key);
                    setSuggestion(IRL_SUGGESTIONS[tag.key][0]);
                  }}
                  className={getCategoryChipClass(irlCategory === tag.key, 'gold')}
                >
                  {tag.label}
                </button>
              ))
            : (Object.keys(SUGGESTIONS) as Array<keyof typeof SUGGESTIONS>).map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => {
                    setStreamCategory(cat);
                    setSuggestion(SUGGESTIONS[cat][0]);
                  }}
                  className={getCategoryChipClass(streamCategory === cat, 'purple')}
                >
                  {cat}
                </button>
              ))}
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
        
        <button 
          type="button"
          onClick={generate}
          disabled={isAnimating}
          className="bg-[#FFD700] hover:bg-yellow-400 text-black rounded-xl w-14 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
        >
          <RefreshCw className={`w-6 h-6 ${isAnimating ? 'animate-spin' : ''}`} />
        </button>
      </div>

      <p className="mt-3 text-xs text-gray-400 font-mono">
        Keep it fun & legal — no harm, no crime.
      </p>
    </div>
  );
}
