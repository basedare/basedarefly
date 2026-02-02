'use client';
import React, { useState } from 'react';
import { Sparkles, RefreshCw } from 'lucide-react';

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

interface GeneratorProps {
  onSelect: (text: string) => void;
}

export default function DareGenerator({ onSelect }: GeneratorProps) {
  const [category, setCategory] = useState<keyof typeof SUGGESTIONS>("GAMING");
  const [suggestion, setSuggestion] = useState(SUGGESTIONS["GAMING"][0]);
  const [isAnimating, setIsAnimating] = useState(false);

  const generate = () => {
    setIsAnimating(true);
    let shuffles = 0;
    const interval = setInterval(() => {
      const random = SUGGESTIONS[category][Math.floor(Math.random() * SUGGESTIONS[category].length)];
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

        {/* Scrollable category buttons */}
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
          {(Object.keys(SUGGESTIONS) as Array<keyof typeof SUGGESTIONS>).map(cat => (
            <button
              key={cat}
              onClick={() => {
                setCategory(cat);
                setSuggestion(SUGGESTIONS[cat][0]);
              }}
              className={`text-[10px] px-3 py-1.5 rounded-full font-bold border transition-all whitespace-nowrap flex-shrink-0 ${
                category === cat
                  ? 'bg-purple-500 text-black border-purple-500 shadow-[0_0_15px_rgba(168,85,247,0.4)]'
                  : 'border-white/10 text-gray-500 hover:border-white/30 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex gap-4">
        <div className="flex-1 bg-black/40 border border-white/10 rounded-xl p-4 font-mono text-white text-sm md:text-lg flex items-center shadow-inner relative overflow-hidden">
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
          onClick={generate}
          disabled={isAnimating}
          className="bg-[#FFD700] hover:bg-yellow-400 text-black rounded-xl w-14 flex items-center justify-center transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:scale-100 shadow-[0_0_20px_rgba(255,215,0,0.2)]"
        >
          <RefreshCw className={`w-6 h-6 ${isAnimating ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
