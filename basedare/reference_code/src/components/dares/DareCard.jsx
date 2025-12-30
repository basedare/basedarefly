
import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, Flame, User, Check, Loader2, X, Share2, MessageCircle } from "lucide-react";
import { motion } from "framer-motion";
import DareTimer from "./DareTimer";
import ShareModal from "./ShareModal";
import PeebareBountySpray from "../PeebareBountySpray";

const categoryColors = {
  gaming: "bg-blue-500/20 text-blue-400 border-blue-500/50",
  irl: "bg-[#FFB800]/20 text-[#FFB800] border-[#FFB800]/50",
  creative: "bg-pink-500/20 text-pink-400 border-pink-500/50",
  fitness: "bg-green-500/20 text-green-400 border-green-500/50",
  food: "bg-[#FF6B00]/20 text-[#FF6B00] border-[#FF6B00]/50",
  other: "bg-gray-500/20 text-gray-400 border-gray-500/50"
};

const difficultyColors = {
  easy: "bg-green-500/20 text-green-400",
  medium: "bg-yellow-500/20 text-yellow-400",
  hard: "bg-orange-500/20 text-orange-400",
  extreme: "bg-red-500/20 text-red-400"
};

const statusColors = {
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/50",
  accepted: "bg-green-500/20 text-green-400 border-green-500/50",
  completed: "bg-green-500/20 text-green-400 border-green-500/50",
  failed: "bg-red-500/20 text-red-400 border-red-500/50"
};

export default function DareCard({ dare, onClick, onAccept, onDismiss, onOpenChat, isAccepting = false, creator, onHoverSpawn }) {
  const [showShareModal, setShowShareModal] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const cardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const canAccept = dare.status === "pending" && onAccept;
  const isAccepted = dare.status === "accepted" || dare.status === "completed" || dare.status === "failed";
  const prefersReducedMotion = typeof window !== 'undefined' ? window.matchMedia('(prefers-reduced-motion: reduce)').matches : false;
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 768 : false;

  useEffect(() => {
    if (!isHovered || prefersReducedMotion || isMobile) return;

    const card = cardRef.current;
    if (!card) return;

    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('class', 'electric-arcs');
    svg.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:10;width:100%;height:100%;overflow:visible;';

    const edges = [
      { x1: '0%', y1: '20%', x2: '10%', y2: '10%', x3: '5%', y3: '30%' },
      { x1: '100%', y1: '60%', x2: '90%', y2: '50%', x3: '95%', y3: '70%' }
    ];

    edges.forEach((edge, i) => {
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const d = `M${edge.x1} ${edge.y1} L${edge.x2} ${edge.y2} L${edge.x3} ${edge.y3}`;
      path.setAttribute('d', d);
      path.setAttribute('stroke', '#A855F7');
      path.setAttribute('stroke-width', '1.5');
      path.setAttribute('fill', 'none');
      path.setAttribute('stroke-dasharray', '1,1');
      path.setAttribute('opacity', '0.6');
      path.style.filter = 'drop-shadow(0 0 3px #A855F7)';
      path.style.animation = `electricHumArc 0.3s ease-in-out infinite`;
      path.style.animationDelay = `${i * 0.05}s`;
      svg.appendChild(path);
    });

    card.appendChild(svg);

    return () => {
      if (card.contains(svg)) {
        card.removeChild(svg);
      }
    };
  }, [isHovered, prefersReducedMotion, isMobile]);

  const handleMouseEnter = () => {
    if (isMobile) return;
    
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);
      if (onHoverSpawn) {
        onHoverSpawn();
      }
    }, 50);
  };

  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    setIsHovered(false);
  };

  const handleAccept = (e) => {
    e.stopPropagation();
    if (onAccept) {
      onAccept(dare);
    }
  };

  const handleDismiss = (e) => {
    e.stopPropagation();
    if (onDismiss) {
      onDismiss(dare.id);
    }
  };

  const handleShare = (e) => {
    e.stopPropagation();
    setShowShareModal(true);
  };

  const handleShareToX = (e) => {
    e.stopPropagation();
    const tweetText = `I just forced @${dare.streamer_name || 'streamer'} to "${dare.title}" 💀\n$${dare.stake_amount || 0} at stake on @BASEDARE\nhttps://basedare.app/dare/${dare.id}`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(tweetText)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleChatClick = (e) => {
    e.stopPropagation();
    
    const audio = new Audio('https://assets.mixkit.co/sfx/preview/mixkit-arcade-game-jump-coin-216.mp3');
    audio.play().catch(err => console.log('Audio play failed:', err));
    
    if (onOpenChat) {
      onOpenChat(dare);
    }
  };

  return (
    <>
      <style>{`
        @keyframes electricHumArc {
          0%, 100% {
            opacity: 0.6;
            stroke-dashoffset: 0;
            filter: drop-shadow(0 0 3px #A855F7);
          }
          50% {
            opacity: 0.8;
            stroke-dashoffset: 2;
            filter: drop-shadow(0 0 6px #A855F7);
          }
        }

        .dare-card-enhanced {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(255, 255, 255, 0.08);
          border: 1px solid rgba(255, 255, 255, 0.15);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          transform-style: preserve-3d;
          position: relative;
          overflow: hidden;
          will-change: transform, filter !important;
        }

        .dare-card-enhanced::before {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 5;
          pointer-events: none;
          background: linear-gradient(to top right, rgba(168, 85, 247, 0.1) 0%, transparent 50%);
          border-radius: 12px;
          filter: blur(4px);
          opacity: 0;
          transition: all 0.3s ease-out;
        }

        @media (prefers-reduced-motion: no-preference) {
          .dare-card-enhanced:hover {
            transform: perspective(1000px) rotateY(2deg) rotateX(1deg) scale(1.01);
            box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
          }

          .dare-card-enhanced:hover::before {
            opacity: 1;
            transform: translateX(2px) translateY(-1px);
          }
        }

        @media (max-width: 768px) {
          .dare-card-enhanced:hover {
            transform: scale(1.01);
            box-shadow: 0 0 12px rgba(168, 85, 247, 0.3);
          }

          .dare-card-enhanced:hover::before {
            opacity: 0.1;
            transform: none;
          }
        }

        .chat-now-btn {
          transition: all 0.3s ease;
          position: relative;
          overflow: hidden;
        }

        @media (prefers-reduced-motion: no-preference) {
          .chat-now-btn:hover {
            transform: scale(1.05);
            box-shadow: 0 0 15px rgba(16, 185, 129, 0.5);
          }

          .chat-now-btn::after {
            content: '';
            position: absolute;
            top: 50%;
            left: -100%;
            width: 100%;
            height: 2px;
            background: linear-gradient(90deg, transparent, rgba(16, 185, 129, 0.8), transparent);
            animation: trailGlow 0.6s ease-in-out;
          }

          .chat-now-btn:hover::after {
            animation: trailGlow 0.6s ease-in-out infinite;
          }
        }

        @keyframes trailGlow {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }

        .bounty-btn {
          transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          position: relative;
          overflow: hidden;
        }

        .bounty-btn::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, rgba(16, 185, 129, 0.3), transparent);
          opacity: 0;
          transition: opacity 0.4s ease;
        }

        @media (prefers-reduced-motion: no-preference) {
          .bounty-btn:hover {
            transform: translateY(-2px) scale(1.02);
            box-shadow: 0 12px 32px rgba(16, 185, 129, 0.4);
          }

          .bounty-btn:hover::before {
            opacity: 1;
          }

          .bounty-btn:active {
            transform: translateY(0) scale(0.98);
          }
        }

        .video-overlay {
          position: absolute;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: linear-gradient(to bottom, rgba(168, 85, 247, 0.2), transparent);
          animation: fadeOut 1s forwards;
          pointer-events: none;
        }

        @keyframes fadeOut {
          to {
            opacity: 0;
          }
        }

        .dare-image-container {
          position: relative;
          overflow: hidden;
          width: 100%;
          height: 200px;
          background: #000;
          border-radius: 12px 12px 0 0;
        }

        .dare-image-container video,
        .dare-image-container img {
          object-fit: cover;
          width: 100%;
          height: 100%;
        }

        @media (prefers-reduced-motion: reduce) {
          .dare-card-enhanced:hover,
          .chat-now-btn:hover,
          .bounty-btn:hover {
            transform: none;
            animation: none;
          }
        }
      `}</style>

      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="relative"
      >
        <Card className="dare-card-enhanced cursor-pointer group" onClick={onClick}>
          <div className="absolute top-3 left-3 z-10 flex gap-2">
            {onDismiss && (
              <button
                onClick={handleDismiss}
                className="w-8 h-8 rounded-full backdrop-blur-sm bg-[rgba(0,0,0,0.7)] flex items-center justify-center text-red-400 hover:text-red-300 border border-purple-500/50 transition-transform hover:scale-110"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={handleShare}
              className="w-8 h-8 rounded-full backdrop-blur-sm bg-[rgba(0,0,0,0.7)] flex items-center justify-center text-purple-400 hover:text-purple-300 border border-purple-500/50 transition-transform hover:scale-110"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleShareToX}
            className="absolute bottom-3 right-3 z-10 w-10 h-10 rounded-full backdrop-blur-sm bg-[rgba(0,0,0,0.7)] flex items-center justify-center text-blue-400 hover:text-blue-300 border border-blue-500/50 transition-all hover:scale-110"
            title="Share to X"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {dare.clip_url ? (
            <div className="dare-image-container">
              <video
                src={dare.clip_url}
                poster={dare.image_url}
                muted
                loop
                autoPlay
                playsInline
                className="group-hover:scale-110 transition-transform duration-500"
                onLoadedData={(e) => {
                  const overlay = e.target.nextElementSibling;
                  if (overlay) {
                    setTimeout(() => overlay.remove(), 1000);
                  }
                }}
              />
              <div className="video-overlay" />
              <div className="absolute top-3 right-3 flex gap-2">
                <Badge className={`${categoryColors[dare.category]} border-0 font-semibold backdrop-blur-sm`}>
                  {dare.category}
                </Badge>
              </div>
            </div>
          ) : dare.image_url ? (
            <div className="dare-image-container">
              <img
                src={dare.image_url}
                alt={dare.title}
                className="group-hover:scale-110 transition-transform duration-500"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.innerHTML = `
                    <div class="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <span class="text-4xl font-bold text-white">${dare.title[0]?.toUpperCase() || '?'}</span>
                    </div>
                  `;
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-3 right-3 flex gap-2">
                <Badge className={`${categoryColors[dare.category]} border-0 font-semibold backdrop-blur-sm`}>
                  {dare.category}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="dare-image-container">
              <div className="w-full h-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                <span className="text-4xl font-bold text-white">
                  {dare.title[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
              <div className="absolute top-3 right-3 flex gap-2">
                <Badge className={`${categoryColors[dare.category]} border-0 font-semibold backdrop-blur-sm`}>
                  {dare.category}
                </Badge>
              </div>
            </div>
          )}

          <CardHeader className="pb-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <h3 className="text-xl font-bold text-white mb-2 line-clamp-2 group-hover:text-[#FFB800] transition-colors">
                  {dare.title}
                </h3>
                <p className="text-gray-400 text-sm line-clamp-2">
                  {dare.description}
                </p>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {dare.difficulty && (
                <Badge className={`${difficultyColors[dare.difficulty]} border-0`}>
                  <Flame className="w-3 h-3 mr-1" />
                  {dare.difficulty}
                </Badge>
              )}
              <Badge className={`${statusColors[dare.status]} border-0`}>
                {dare.status}
              </Badge>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#FFB800]/20">
              <div className="flex items-center gap-4 text-sm">
                {dare.stake_amount ? (
                  <PeebareBountySpray amount={dare.stake_amount} />
                ) : null}
                {dare.streamer_name && (
                  <div className="flex items-center gap-1 text-gray-400">
                    <User className="w-4 h-4" />
                    <span>{dare.streamer_name}</span>
                  </div>
                )}
              </div>

              <DareTimer deadline={dare.expiry_timer} status={dare.status} />
            </div>

            {onOpenChat && dare.status === "accepted" && (
              <Button
                onClick={handleChatClick}
                className="chat-now-btn w-full bg-green-500/20 border border-green-500/50 text-green-400 hover:bg-green-500/30 rounded-full px-3 py-2 text-sm font-semibold"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Chat Now
              </Button>
            )}

            {canAccept && (
              <Button
                onClick={handleAccept}
                disabled={isAccepting || isAccepted}
                className="bounty-btn w-full text-2xl px-12 py-6 bg-gradient-to-r from-[#10B981] to-[#059669] font-black hover:from-[#059669] hover:to-[#10B981] text-white disabled:opacity-50 disabled:cursor-not-allowed mt-3"
              >
                {isAccepting ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-2 animate-spin" />
                    Adding to BOUNTY...
                  </>
                ) : isAccepted ? (
                  <>
                    <Check className="w-6 h-6 mr-2" />
                    Added to BOUNTY
                  </>
                ) : (
                  <>+ Add to BOUNTY</>
                )}
              </Button>
            )}
          </CardContent>
        </Card>
      </motion.div>

      <ShareModal
        dare={dare}
        creator={creator || dare.streamer_name}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </>
  );
}
