import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Trophy, Crown, Medal, TrendingUp, Zap, Target, Flame } from "lucide-react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { triggerPeebareConfetti } from "../components/PeebareConfetti";
import RankBadge from "../components/RankBadge";
import Footer from "../components/Footer";

export default function LeaderboardPage() {
  const [user, setUser] = React.useState(null);
  const [walletConnected, setWalletConnected] = React.useState(false);
  const [basenameClaimed, setBasenameClaimed] = useState(false);
  const [pot, setPot] = useState(86227);
  const [claimingInProgress, setClaimingInProgress] = useState(false);
  const { toast } = useToast();
  const lastClaimTimeRef = useRef(0);

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setPot(prev => prev + Math.floor(Math.random() * 666));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Floating X particles system
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    
    const ctx = canvas.getContext('2d');
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();

    const isMobile = window.innerWidth < 768;
    const maxParticles = isMobile ? 6 : 10;

    class XBoltCoin {
      constructor(isHoverSpawn = false) {
        this.isHoverSpawn = isHoverSpawn;
        this.reset();
      }

      reset() {
        if (this.isHoverSpawn) {
          this.x = Math.random() < 0.5 ? 0 : canvas.width;
          this.y = Math.random() * canvas.height;
          this.targetX = canvas.width / 2;
          this.targetY = canvas.height / 2;
          const dx = this.targetX - this.x;
          const dy = this.targetY - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          this.speedX = (dx / distance) * 1.2;
          this.speedY = (dy / distance) * 1.2;
          this.lifetime = 1500;
          this.baseOpacity = 0.8;
        } else {
          this.x = Math.random() * canvas.width;
          this.y = -50 - Math.random() * 100; // Start above canvas
          this.speedX = (Math.random() - 0.5) * (isMobile ? 0.15 : 0.25); // Slight horizontal drift
          this.speedY = isMobile ? 0.3 : 0.5;
          this.baseOpacity = 0.5 + Math.random() * 0.3;
        }
        
        this.radius = 8;
        this.glitterPhase = Math.random() * Math.PI * 2;
        this.dashOffset = 0;
      }

      update(deltaTime = 16) {
        if (!prefersReducedMotion) {
          this.y += this.speedY;
          this.x += this.speedX;
          this.glitterPhase += 0.03;
          this.dashOffset += 0.02;
        }

        if (this.isHoverSpawn) {
          this.lifetime -= deltaTime;
          if (this.lifetime <= 0) {
            return false; // Remove hover-spawned particle after its lifetime
          }
        }

        // For regular particles, reset if they go off-screen
        if (!this.isHoverSpawn && this.y > canvas.height + 100) {
          this.reset();
        }
        return true;
      }

      draw() {
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const glitter = prefersReducedMotion 
          ? 1 
          : 0.5 + Math.sin(this.glitterPhase) * 0.3;
        const flickerOpacity = this.isHoverSpawn 
          ? (this.baseOpacity * glitter) * (this.lifetime / 1500)
          : this.baseOpacity * glitter;
        
        ctx.globalAlpha = flickerOpacity * 0.6;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.05)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = flickerOpacity;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#A855F7';
        ctx.shadowBlur = 6 + Math.sin(this.glitterPhase) * 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = flickerOpacity;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 3;
        ctx.shadowColor = '#A855F7';
        ctx.setLineDash([2, 1]);
        ctx.lineDashOffset = this.dashOffset;
        
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, 5);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(5, -5);
        ctx.lineTo(-5, 5);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        ctx.restore();
      }
    }

    particlesRef.current = [];
    for (let i = 0; i < maxParticles; i++) {
      const coin = new XBoltCoin();
      coin.y = Math.random() * canvas.height; // Initialize existing particles across the canvas
      particlesRef.current.push(coin);
    }

    let lastTime = performance.now();
    function animate(currentTime) {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      particlesRef.current = particlesRef.current.filter(particle => {
        const alive = particle.update(deltaTime);
        if (alive) {
          particle.draw();
        }
        return alive;
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate(lastTime);

    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      particlesRef.current = [];
    };
  }, []);

  const handleCardHover = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 768) return;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Duplicating the logic of XBoltCoin for hover-spawned particles as per outline
    const hoverCoin = {
      isHoverSpawn: true,
      x: Math.random() < 0.5 ? 0 : canvas.width,
      y: Math.random() * canvas.height,
      targetX: canvas.width / 2,
      targetY: canvas.height / 2,
      speedX: 0, // Will be calculated in update
      speedY: 0, // Will be calculated in update
      lifetime: 1500,
      radius: 8,
      baseOpacity: 0.8,
      glitterPhase: Math.random() * Math.PI * 2,
      dashOffset: 0,
      
      update(deltaTime = 16) {
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Only move if not already at target, to avoid division by zero or jitter
        if (distance > 1) { 
          this.speedX = (dx / distance) * 1.2;
          this.speedY = (dy / distance) * 1.2;
          this.x += this.speedX;
          this.y += this.speedY;
        } else {
          this.x = this.targetX;
          this.y = this.targetY;
        }

        this.glitterPhase += 0.03;
        this.dashOffset += 0.02;
        this.lifetime -= deltaTime;
        
        return this.lifetime > 0;
      },
      
      draw() {
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        ctx.save();
        ctx.translate(this.x, this.y);
        
        const glitter = 0.5 + Math.sin(this.glitterPhase) * 0.3;
        const flickerOpacity = (this.baseOpacity * glitter) * (this.lifetime / 1500);
        
        ctx.globalAlpha = flickerOpacity * 0.6;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.4)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.2)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.05)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = flickerOpacity;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2;
        ctx.shadowColor = '#A855F7';
        ctx.shadowBlur = 6 + Math.sin(this.glitterPhase) * 4;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = flickerOpacity;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 3;
        ctx.shadowColor = '#A855F7';
        ctx.setLineDash([2, 1]);
        ctx.lineDashOffset = this.dashOffset;
        
        ctx.beginPath();
        ctx.moveTo(-5, -5);
        ctx.lineTo(5, 5);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(5, -5);
        ctx.lineTo(-5, 5);
        ctx.stroke();
        
        ctx.setLineDash([]);
        
        ctx.restore();
      }
    };
    
    particlesRef.current.push(hoverCoin);
  };

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const mockLeaderboard = [
    { id: 1, name: "MrBot", email: "mrbot@example.com", rep: 150, completed: 15, streak: 5, prevRank: 2, bareWon: 25000 },
    { id: 2, name: "MrPun", email: "mrpun@example.com", rep: 100, completed: 10, streak: 3, prevRank: 1, bareWon: 18000 },
    { id: 3, name: "Streamer123", email: "streamer@example.com", rep: 75, completed: 8, streak: 2, prevRank: 5, bareWon: 12000 },
    { id: 4, name: "GamerPro", email: "gamer@example.com", rep: 50, completed: 5, streak: 1, prevRank: 4, bareWon: 8000 },
    { id: 5, name: user?.full_name || "You", email: user?.email || "", rep: 25, completed: 3, streak: 1, prevRank: 6, bareWon: 3000 },
  ];

  const getRankIcon = (rank) => {
    switch(rank) {
      case 1:
        return <Crown className="w-6 h-6 text-[#FFD700]" />;
      case 2:
        return <Medal className="w-6 h-6 text-gray-400" />;
      case 3:
        return <Medal className="w-6 h-6 text-[#FF6B00]" />;
      default:
        return <span className="text-xl font-bold text-gray-400">#{rank}</span>;
    }
  };

  const handleShareRank = (rank, rep) => {
    const text = `🏆 I'm ranked #${rank} on BaseDare with ${rep} Rep points! Think you can beat me? Join now! #BaseDare #BARE`;
    window.open(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`,
      '_blank',
      'width=600,height=400'
    );
  };

  const handleClaimBasename = useCallback(() => {
    // Debounce: prevent multiple clicks within 2 seconds
    const now = Date.now();
    if (now - lastClaimTimeRef.current < 2000) return;
    if (claimingInProgress) return;
    
    lastClaimTimeRef.current = now;
    
    if (!walletConnected) {
      setWalletConnected(true);
      toast({
        title: "Wallet Connected!",
        description: "Phantom wallet connected successfully",
        className: "bg-green-500/20 border-green-500/50 text-white",
        duration: 4000,
      });
      return;
    }

    setClaimingInProgress(true);
    triggerPeebareConfetti();
    setBasenameClaimed(true);
    
    toast({
      title: "🎉 CONGRATS! @based username is now YOURS forever",
      description: "Bear approved! Your legendary username is on-chain!",
      className: "bg-gradient-to-r from-[#FFB800]/20 to-[#FF6B00]/20 border-[#FFB800]/50 text-white",
      duration: 4000,
    });
    
    setTimeout(() => setClaimingInProgress(false), 2000);
  }, [walletConnected, claimingInProgress, toast]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[rgb(15,15,20)] to-[rgb(20,15,30)] relative overflow-x-hidden">
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <style>{`
        .rank-row {
          transition: all 0.3s ease;
          position: relative;
          z-index: 1;
        }

        .rank-row:hover {
          transform: translateX(10px);
          background: rgba(255, 184, 0, 0.1);
        }

        .user-highlight {
          background: linear-gradient(90deg, rgba(255, 184, 0, 0.2), rgba(255, 107, 0, 0.2));
          border: 2px solid rgba(255, 184, 0, 0.5);
        }

        /* Mobile scroll fix */
        @media (max-width: 768px) {
          .rank-row {
            flex-wrap: wrap;
            gap: 0.5rem;
          }
          .rank-row:hover {
            transform: none;
          }
        }

        /* iPhone SE / small screens */
        @media (max-width: 640px) {
          .rank-card {
            gap: 0.5rem;
            font-size: 0.875rem;
          }
          .rank-card button {
            padding: 0.375rem 0.75rem;
            font-size: 0.75rem;
          }
        }
      `}</style>

      <div className="flex-1 p-4 md:p-8 pt-4 pb-24 relative z-10">
        <div className="max-w-5xl mx-auto">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-full px-4 py-2 mb-4">
              <Trophy className="w-4 h-4 text-[#FFB800]" />
              <span className="text-sm text-[#FFB800] font-medium">Top Performers</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Leaderboard
            </h1>
            <p className="text-gray-400 text-lg md:text-xl leading-tight">
              Top Darers by Rep Points
            </p>
          </motion.div>

          {/* Leaderboard */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-4 max-w-full overflow-hidden"
            onMouseEnter={handleCardHover}
          >
            {isLoading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] rounded-xl p-6">
                    <div className="flex items-center gap-4 flex-wrap">
                      <Skeleton className="w-12 h-12 rounded-full bg-gray-700" />
                      <Skeleton className="w-12 h-12 rounded-full bg-gray-700" />
                      <div className="flex-1 space-y-2 min-w-[120px]">
                        <Skeleton className="h-5 w-32 bg-gray-700" />
                        <Skeleton className="h-4 w-24 bg-gray-700" />
                      </div>
                      <Skeleton className="h-8 w-20 bg-gray-700" />
                    </div>
                  </div>
                ))}
              </div>
            ) : !isLoading && mockLeaderboard.length === 0 ? (
              <Card className="bg-gradient-to-br from-[#FFB800]/10 to-[#FF6B00]/10 border-[#FFB800]/30 p-12 text-center">
                <img 
                  src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fdae09d2124933d726e89a/bef958255_image.png"
                  alt="Ghost Pepper Bear"
                  className="w-32 h-32 mx-auto mb-4"
                />
                <h3 className="text-2xl font-bold text-white mb-3">
                  Stake to earn first – ghost pepper dare incoming? 🌶️
                </h3>
                <p className="text-gray-400 mb-6">
                  Be the first to reach the top of the leaderboard
                </p>
                <Link to={createPageUrl("Home")}>
                  <Button className="bg-gradient-to-r from-[#00ff41] to-green-500 hover:from-green-500 hover:to-[#00ff41] text-black font-black">
                    <Zap className="w-4 h-4 mr-2" />
                    Start Daring
                  </Button>
                </Link>
              </Card>
            ) : (
              <div className="fade-in-content">
              {mockLeaderboard.map((player, index) => {
                const isCurrentUser = user && player.email === user.email;
                const rank = index + 1;
                
                return (
                  <motion.div
                    key={player.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className={`rank-row bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] rounded-xl overflow-hidden p-6 ${
                      isCurrentUser ? 'user-highlight' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 rank-card">
                      {/* Rank Badge */}
                      <div className="w-14 md:w-16 flex-shrink-0 relative z-10">
                        <RankBadge rank={rank} previousRank={player.prevRank} />
                      </div>

                      {/* Avatar */}
                      <Avatar className="w-10 h-10 md:w-12 md:h-12 flex-shrink-0 bg-gradient-to-br from-[#FFB800] to-[#FF6B00]">
                        <AvatarFallback className="bg-transparent text-white font-semibold">
                          {player.name[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>

                      {/* Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-bold text-white">
                            {player.name}
                            {isCurrentUser && (
                              <span className="text-[#FFB800] text-sm ml-2">(You)</span>
                            )}
                          </h3>
                          {player.streak > 1 && (
                            <span className="px-2 py-1 bg-orange-500/20 text-orange-400 text-xs rounded-full border border-orange-500/50">
                              🔥 {player.streak}-chain
                            </span>
                          )}
                        </div>
                        <p className="text-gray-400 text-sm">
                          {player.completed} dares completed
                        </p>
                      </div>

                      {/* Rep Points + BARE Won */}
                      <div className="text-right flex-shrink-0">
                        <div className="text-xl md:text-2xl font-bold text-[#00ff41]">
                          {player.bareWon.toLocaleString()} $BARE
                        </div>
                        <p className="text-gray-400 text-xs">{player.rep} Rep</p>
                      </div>

                      {/* Share Button for Top 3 */}
                      {index < 3 && (
                        <Button
                          onClick={() => handleShareRank(rank, player.rep)}
                          size="sm"
                          aria-label="Share this rank"
                          className="bg-[#FFB800]/20 border border-[#FFB800]/50 text-[#FFB800] hover:bg-[#FFB800]/30 hover:scale-105 transition-all duration-200"
                        >
                          <TrendingUp className="w-4 h-4 mr-1 flex-shrink-0" />
                          <span className="mr-1">Share</span>
                        </Button>
                      )}
                    </div>

                    {/* Claim @based username for #1 */}
                    {rank === 1 && (
                      <div className="mt-4 pt-4 border-t border-[#FFB800]/30">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <Crown className="w-5 h-5 flex-shrink-0 text-[#FFD700] relative z-10" />
                            <span className="text-sm text-gray-300 line-clamp-2 break-words">
                              You earned the legendary @based username!
                            </span>
                          </div>
                          <Button
                            onClick={handleClaimBasename}
                            disabled={basenameClaimed}
                            size="sm"
                            className="bg-gradient-to-r from-[#FFB800] to-[#FF6B00] hover:from-[#FF6B00] hover:to-[#FFB800] text-white font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition-all duration-200 flex-shrink-0"
                          >
                            {basenameClaimed ? 'Claimed ✓' : walletConnected ? 'Claim @based' : 'Connect to Claim'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                );
              })}
              </div>
            )}
          </motion.div>

          {/* BOUNTY POT — PERFECTLY CENTERED UNDER LEADERBOARD */}
          <div className="mt-8 md:mt-16 mb-8 md:mb-24">
            <div className="flex justify-center">
              <div className="relative group">
                {/* GOLDEN GLOW */}
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400 via-orange-500 to-yellow-400 rounded-3xl blur-3xl opacity-70 animate-pulse" />
                
                {/* MAIN POT */}
                <div className="relative bg-black/90 backdrop-blur-2xl border-4 border-yellow-500 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
                  <div className="text-center">
                    <div className="text-5xl md:text-7xl mb-3">🏆</div>
                    <div className="font-mono text-4xl md:text-7xl font-black tracking-tighter">
                      <span className="text-yellow-400">$</span>
                      <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 drop-shadow-2xl">
                        {pot.toLocaleString()}
                      </span>
                    </div>
                    <motion.div 
                      className="bg-red-600 px-4 md:px-5 py-2 rounded-full inline-flex items-center gap-2 mt-4"
                      initial={{ scale: 1 }}
                      animate={{ scale: [1, 1.05, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                    >
                      <div className="w-2 h-2 md:w-3 md:h-3 bg-white rounded-full animate-ping" />
                      <span className="font-black text-xs md:text-sm">LIVE</span>
                    </motion.div>
                    <p className="text-yellow-400 font-black text-lg md:text-xl mt-3 tracking-wider">
                      TOTAL BOUNTY POT
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}