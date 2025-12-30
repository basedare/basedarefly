import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

const headlines = [
  {
    text: "Stake it or eat it – force streamers to do YOUR dares",
    sub: "Winner takes 2x pot. Loser cries on stream.",
    cta: "Dare Someone Now",
    color: "from-[#00ff41] to-green-400",
    action: "create"
  },
  {
    text: "$42,069 → @farokh eats ghost pepper in 23h 41m",
    sub: "or loses everything to 69 degens",
    cta: "Add to bounty → make it $50k",
    color: "from-pink-400 to-purple-400",
    action: "scroll"
  },
  {
    text: "Pay $XDARE. Force any streamer. No mercy.",
    sub: "One click = total control. 10% rake fuels chaos.",
    cta: "Stake $XDARE now",
    color: "from-orange-400 to-red-500",
    action: "scroll"
  },
  {
    text: "Stake $XDARE. Bully streamers for fun & profit.",
    sub: "They complete → you win 2×",
    cta: "Create your first dare",
    color: "from-emerald-400 to-teal-500",
    action: "create"
  },
  {
    text: "$XDARE = remote control for streamers",
    sub: "Farokh just accepted your $666 dare",
    cta: "Watch him suffer live",
    color: "from-purple-400 to-pink-400",
    action: "scroll"
  },
  {
    text: "🔥 PRESALE LIVE – Get $XDARE before launch",
    sub: "Top 50 wallets get 0% rake forever",
    cta: "Join Presale",
    color: "from-[#00ff41] to-yellow-400",
    action: "presale"
  },
  {
    text: "Own the dare. Own the streamer.",
    sub: "@based username for top 10",
    cta: "Climb leaderboard",
    color: "from-yellow-500 to-orange-600",
    action: "leaderboard"
  }
];

export default function RotatingHero({ onConfetti }) {
  const [index, setIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const timerRef = React.useRef(null);

  useEffect(() => {
    if (isPaused) return;
    
    timerRef.current = setInterval(() => {
      setIndex(i => (i + 1) % headlines.length);
    }, 4000);
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [isPaused]);

  const current = headlines[index];

  const handleMouseEnter = () => {
    setIsPaused(true);
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
  };

  const handleMouseLeave = () => {
    setIsPaused(false);
  };

  const handleClick = (e) => {
    e.stopPropagation();
    
    // Trigger confetti
    if (onConfetti) {
      onConfetti();
    }
    
    // Scroll to dare feed for scroll actions
    if (current.action === "scroll") {
      const feedElement = document.getElementById('dare-feed');
      if (feedElement) {
        feedElement.scrollIntoView({ behavior: 'smooth' });
      }
    }
  };

  const renderButton = () => {
    const baseClass = "mt-10 text-lg md:text-2xl px-8 md:px-16 py-6 md:py-8 font-black animate-fade-in-up animate-delay-500 hover:scale-105 transition-transform";
    
    if (current.action === "create") {
      return (
        <Link to={createPageUrl("CreateDare")}>
          <Button size="lg" className={`${baseClass} bg-gradient-to-r from-[#00ff41] to-green-500 hover:from-green-500 hover:to-[#00ff41] text-black`}>
            {current.cta}
          </Button>
        </Link>
      );
    } else if (current.action === "leaderboard") {
      return (
        <Link to={createPageUrl("Leaderboard")}>
          <Button size="lg" className={`${baseClass} bg-gradient-to-r from-yellow-500 to-orange-600 hover:from-yellow-600 hover:to-orange-700 text-black`}>
            {current.cta}
          </Button>
        </Link>
      );
    } else if (current.action === "presale") {
      return (
        <Link to={createPageUrl("Presale")}>
          <Button size="lg" className={`${baseClass} bg-gradient-to-r from-[#00ff41] to-yellow-400 hover:from-yellow-400 hover:to-[#00ff41] text-black animate-pulse`}>
            {current.cta}
          </Button>
        </Link>
      );
    } else {
      return (
        <Button size="lg" className={`${baseClass} bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600`} onClick={handleClick}>
          {current.cta}
        </Button>
      );
    }
  };

  return (
    <div 
      className="text-center py-24 cursor-pointer relative z-10"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
    >
      <style>{`
        @keyframes fade-in-up {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in-up {
          animation: fade-in-up 1s ease-out forwards;
        }

        .animate-delay-300 {
          animation-delay: 0.3s;
          opacity: 0;
        }

        .animate-delay-500 {
          animation-delay: 0.5s;
          opacity: 0;
        }

        @keyframes slide-in-from-bottom {
          from {
            opacity: 0;
            transform: translateY(32px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-slide-in {
          animation: slide-in-from-bottom 1s ease-out forwards;
        }
      `}</style>

      <h1 
        key={`headline-${index}`}
        className={`text-6xl md:text-8xl font-black bg-gradient-to-r ${current.color} bg-clip-text text-transparent animate-slide-in px-4`}
      >
        {current.text}
      </h1>
      
      <p 
        key={`sub-${index}`}
        className="text-2xl md:text-3xl mt-6 text-purple-200 animate-fade-in-up animate-delay-300 px-4"
      >
        {current.sub}
      </p>
      
      {renderButton()}
    </div>
  );
}