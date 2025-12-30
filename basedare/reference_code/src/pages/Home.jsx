import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, Zap, Sparkles, Trophy, ChevronLeft, MessageCircle, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import DareCard from "../components/dares/DareCard";
import ConveyorBar from "../components/ConveyorBar";
import ChatSidebar from "../components/ChatSidebar";
import RotatingHero from "../components/RotatingHero";
import Footer from "../components/Footer";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import LiveBountyPot from "../components/LiveBountyPot";
import HallOfShame from "../components/HallOfShame";

export default function HomePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusView, setStatusView] = useState("all");
  const [dismissedDares, setDismissedDares] = useState(new Set());
  const [user, setUser] = useState(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [chatOpen, setChatOpen] = useState(false);
  const [activeDare, setActiveDare] = useState(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const leaderboardRef = useRef(null);
  const [touchStart, setTouchStart] = useState(null);
  const fallingStarRef = useRef(null); // NEW: ref for falling star
  const starTimerRef = useRef(null); // NEW: timer for spawning stars

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const triggerConfetti = () => {
    const colors = ['#A855F7', '#EC4899', '#10B981', '#F59E0B', '#3B82F6'];
    const confettiCount = 150;
    const confettiElements = [];
    
    for (let i = 0; i < confettiCount; i++) {
      const confetti = document.createElement('div');
      confetti.style.cssText = `
        position: fixed;
        width: 10px;
        height: 10px;
        background: ${colors[Math.floor(Math.random() * colors.length)]};
        left: 50%;
        top: 50%;
        opacity: 1;
        pointer-events: none;
        z-index: 9999;
        border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
      `;
      document.body.appendChild(confetti);
      confettiElements.push(confetti);
      
      const angle = (Math.PI * 2 * i) / confettiCount;
      const velocity = 5 + Math.random() * 10;
      const vx = Math.cos(angle) * velocity;
      const vy = Math.sin(angle) * velocity;
      
      let x = 0;
      let y = 0;
      let opacity = 1;
      let rotation = Math.random() * 360;
      
      const animate = () => {
        y += vy;
        x += vx;
        opacity -= 0.015;
        rotation += 5;
        
        confetti.style.transform = `translate(${x}px, ${y}px) rotate(${rotation}deg)`;
        confetti.style.opacity = opacity;
        
        if (opacity > 0) {
          requestAnimationFrame(animate);
        } else {
          confetti.remove();
        }
      };
      
      requestAnimationFrame(animate);
    }
    
    setTimeout(() => {
      confettiElements.forEach(el => el.remove());
    }, 3000);
  };

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
          this.y = -50 + Math.random() * -100;
          this.speedX = isMobile ? 0.15 : 0.25;
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
            return false;
          }
        }

        if (this.y > canvas.height + 100) {
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

    // NEW: Falling Star class
    class FallingStar {
      constructor() {
        this.reset();
      }

      reset() {
        // Start from random position at top
        this.x = Math.random() * canvas.width;
        this.y = -20;
        
        // Fast diagonal fall
        this.speedX = 3 + Math.random() * 2;
        this.speedY = 8 + Math.random() * 4;
        
        // Random direction (left or right)
        if (Math.random() > 0.5) {
          this.speedX = -this.speedX;
        }
        
        this.size = 3;
        this.opacity = 1;
        this.trail = [];
        this.maxTrailLength = 15;
      }

      update() {
        if (prefersReducedMotion) return false;
        
        // Add current position to trail
        this.trail.push({ x: this.x, y: this.y, opacity: this.opacity });
        if (this.trail.length > this.maxTrailLength) {
          this.trail.shift();
        }
        
        // Move
        this.x += this.speedX;
        this.y += this.speedY;
        
        // Fade out as it falls
        this.opacity -= 0.008;
        
        // Remove if off screen or faded
        if (this.y > canvas.height + 50 || this.opacity <= 0) {
          return false;
        }
        
        return true;
      }

      draw() {
        // Draw trail
        this.trail.forEach((point, index) => {
          const trailOpacity = (index / this.trail.length) * point.opacity * 0.6;
          const trailSize = (index / this.trail.length) * this.size;
          
          ctx.save();
          ctx.globalAlpha = trailOpacity;
          
          // Glow
          const gradient = ctx.createRadialGradient(point.x, point.y, 0, point.x, point.y, trailSize * 3);
          gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
          gradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.6)');
          gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
          
          ctx.fillStyle = gradient;
          ctx.beginPath();
          ctx.arc(point.x, point.y, trailSize * 3, 0, Math.PI * 2);
          ctx.fill();
          
          ctx.restore();
        });
        
        // Draw main star
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        // Bright core
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
        // Outer glow
        const gradient = ctx.createRadialGradient(this.x, this.y, 0, this.x, this.y, this.size * 6);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0.8)');
        gradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(255, 215, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size * 6, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
      }
    }

    particlesRef.current = [];
    for (let i = 0; i < maxParticles; i++) {
      const coin = new XBoltCoin();
      coin.y = Math.random() * canvas.height;
      particlesRef.current.push(coin);
    }

    // NEW: Function to spawn a falling star
    const spawnFallingStar = () => {
      fallingStarRef.current = new FallingStar();
    };

    // NEW: Spawn first star after 5 seconds, then every 3 minutes
    setTimeout(() => {
      spawnFallingStar(); // First star right away
    }, 5000);

    // NEW: Set up timer to spawn a star every 3 minutes after the first one
    const scheduleNextStar = () => {
      starTimerRef.current = setTimeout(() => {
        spawnFallingStar();
        scheduleNextStar(); // Schedule the next one
      }, 180000); // 3 minutes = 180,000ms
    };
    
    // Start the recurring timer after the initial 5 second delay + first star duration
    setTimeout(() => {
      scheduleNextStar();
    }, 8000); // Start recurring timer after first star has fallen

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

      // NEW: Update and draw falling star if it exists
      if (fallingStarRef.current) {
        const starAlive = fallingStarRef.current.update();
        if (starAlive) {
          fallingStarRef.current.draw();
        } else {
          fallingStarRef.current = null; // Remove star when done
        }
      }

      animationFrameRef.current = requestAnimationFrame(animate);
    }

    animate(lastTime);

    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (starTimerRef.current) {
        clearTimeout(starTimerRef.current);
      }
      particlesRef.current = [];
      fallingStarRef.current = null;
    };
  }, []);

  const handleTouchStart = (e) => {
    setTouchStart(e.touches[0].clientY);
  };

  const handleTouchEnd = (e) => {
    if (!touchStart) return;
    const touchEnd = e.changedTouches[0].clientY;
    const deltaY = touchEnd - touchStart;
    
    if (deltaY > 50) {
      setShowLeaderboard(false);
    }
    setTouchStart(null);
  };

  const { data: dares, isLoading } = useQuery({
    queryKey: ['dares'],
    queryFn: () => base44.entities.Dare.list("-created_date"),
    initialData: [],
  });

  const acceptDareMutation = useMutation({
    mutationFn: async ({ dareId, escrowAmount, userId }) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return base44.entities.Dare.update(dareId, { 
        status: "accepted",
        acceptor_id: userId 
      });
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['dares'] });
      queryClient.invalidateQueries({ queryKey: ['myDares'] });
      setDismissedDares(prev => new Set([...prev, variables.dareId]));
      
      triggerConfetti();
      
      toast({
        title: "Dare accepted—$BARE staked!",
        description: `You staked $${variables.escrowAmount.toFixed(2)} $BARE`,
        className: "bg-green-500/20 border-green-500/50 text-white",
      });
    },
  });

  const handleAcceptDare = (dare) => {
    if (!user) {
      base44.auth.redirectToLogin(window.location.pathname);
      return;
    }

    const escrowAmount = (dare.stake_amount || 0) * 0.1;
    acceptDareMutation.mutate({ 
      dareId: dare.id, 
      escrowAmount,
      userId: user.email 
    });
  };

  const handleDismissDare = (dareId) => {
    setDismissedDares(prev => new Set([...prev, dareId]));
    toast({
      title: "Dare dismissed",
      description: "Card removed from feed",
      className: "bg-gray-500/20 border-gray-500/50 text-white",
    });
  };

  const handleOpenChat = (dare) => {
    setActiveDare(dare);
    setChatOpen(true);
    setShowLeaderboard(false);
  };

  const handleToggleChat = () => {
    if (!chatOpen && !activeDare) {
      const latestAcceptedDare = dares.find(d => d.status === "accepted");
      if (latestAcceptedDare) {
        setActiveDare(latestAcceptedDare);
      }
    }
    setChatOpen(!chatOpen);
    if (!chatOpen) {
      setShowLeaderboard(false);
    }
  };

  const handleToggleLeaderboard = () => {
    setShowLeaderboard(!showLeaderboard);
    if (!showLeaderboard) {
      setChatOpen(false);
    }
  };

  const handleStatClick = (type) => {
    setStatusView(type);
    const count = type === "active" ? acceptedDares.length 
                : type === "completed" ? dares.filter(d => d.status === "completed").length
                : 0;
    
    toast({
      title: `Viewing ${type === "active" ? "active" : type} dares`,
      description: `${count} dares`,
      className: "bg-purple-500/20 border-purple-500/50 text-white",
    });
  };

  const [debouncedSearch, setDebouncedSearch] = useState("");
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const filteredDares = dares.filter(dare => {
    if (dismissedDares.has(dare.id)) return false;
    
    if (statusView === "active" && dare.status !== "accepted") return false;
    if (statusView === "completed" && dare.status !== "completed") return false;
    
    const searchLower = debouncedSearch.toLowerCase();
    const matchesSearch = !debouncedSearch || 
                         dare.title.toLowerCase().includes(searchLower) ||
                         dare.description.toLowerCase().includes(searchLower) ||
                         (dare.streamer_name && dare.streamer_name.toLowerCase().includes(searchLower));
    
    const matchesCategory = categoryFilter === "all" || dare.category === categoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  const acceptedDares = dares.filter(d => d.status === "accepted");
  const totalStakes = dares.reduce((sum, d) => sum + (d.stake_amount || 0), 0);

  // Removed placeholder text - using null/conditional rendering instead

  const mockLeaderboard = [
    { name: "MrBot", rep: 150, completed: 15 },
    { name: "MrPun", rep: 100, completed: 10 },
    { name: user?.full_name || "You", rep: 15, completed: 2 },
  ];

  const handleCardHover = () => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (window.innerWidth < 768) return;
    
    const hoverCoin = new (class XBoltCoin {
      constructor() {
        this.isHoverSpawn = true;
        const canvas = canvasRef.current;
        if (!canvas) return;
        
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
        this.radius = 8;
        this.baseOpacity = 0.8;
        this.glitterPhase = Math.random() * Math.PI * 2;
        this.dashOffset = 0;
      }

      update(deltaTime = 16) {
        const canvas = canvasRef.current;
        if (!canvas) return false;
        
        this.x += this.speedX;
        this.y += this.speedY;
        this.glitterPhase += 0.03;
        this.dashOffset += 0.02;
        this.lifetime -= deltaTime;
        
        return this.lifetime > 0;
      }

      draw() {
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
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
    })();
    
    particlesRef.current.push(hoverCoin);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#0A0A0F] relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <style>{`
        :root {
          --glass-bg: rgba(255, 255, 255, 0.015);
          --glass-bg-hover: rgba(255, 255, 255, 0.02);
          --blur: 12px;
          --blur-heavy: 14px;
          --blur-light: 10px;
          --peebare-yellow: #FFB800;
          --peebare-orange: #FF6B00;
          --peebare-gold: #FFD700;
        }

        body {
          font-family: 'Inter', sans-serif;
        }

        .content-wrapper {
          position: relative;
          z-index: 1;
          flex: 1;
          display: flex;
          flex-direction: column;
        }

        @keyframes pee-bounce {
          0%, 100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-15px);
          }
        }

        .ripple {
          position: relative;
          overflow: hidden;
          transform: translate3d(0, 0, 0);
        }

        .ripple:after {
          content: "";
          display: block;
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          pointer-events: none;
          background-image: radial-gradient(circle, #fff 10%, transparent 10.01%);
          background-repeat: no-repeat;
          background-position: 50%;
          transform: scale(10, 10);
          opacity: 0;
          transition: transform .5s, opacity 1s;
        }

        .ripple:active:after {
          transform: scale(0, 0);
          opacity: .2;
          transition: 0s;
        }

        .apple-glass-card {
          background: var(--glass-bg);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          backdrop-filter: blur(var(--blur));
          -webkit-backdrop-filter: blur(var(--blur));
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          transition: all 0.3s ease;
        }

        .apple-glass-card:hover {
          background: var(--glass-bg-hover);
          border-color: rgba(255, 255, 255, 0.1);
          box-shadow: 0 8px 12px rgba(0, 0, 0, 0.2);
        }
        
        .stats-button {
          cursor: pointer;
        }

        .search-glass {
          background: var(--glass-bg);
          border: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(var(--blur-light));
          -webkit-backdrop-filter: blur(var(--blur-light));
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }

        .filter-pill {
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.02);
          backdrop-filter: blur(var(--blur-light));
          -webkit-backdrop-filter: blur(var(--blur-light));
          transition: all 0.2s ease;
          color: #A0A0A0;
          flex-shrink: 0;
        }

        .filter-pill:hover {
          background: rgba(255, 255, 255, 0.08);
          color: #E0E0E0;
        }

        .filter-pill[data-state="active"] {
          border-color: rgba(255, 255, 255, 0.1);
          font-weight: 600;
        }

        .leaderboard-modal {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.8);
          backdrop-filter: blur(var(--blur-heavy));
          -webkit-backdrop-filter: blur(var(--blur-heavy));
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 99;
          overflow: hidden;
        }
        
        .leaderboard-modal.open {
          overflow-y: auto;
        }

        .leaderboard-content {
          background: linear-gradient(145deg, #1A1A2E, #0F0F1A);
          border: 1px solid rgba(75, 0, 130, 0.5);
          border-radius: 16px;
          width: 90%;
          max-width: 500px;
          max-height: 90vh;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        }

        .leaderboard-content > div {
          flex-shrink: 0;
        }
        
        .leaderboard-content > div:not(.sticky) {
          overflow-y: auto;
          -webkit-overflow-scrolling: touch;
        }

        .leaderboard-content .p-6 {
          padding: 1.5rem;
        }

        .conveyor-bar {
          background: linear-gradient(90deg, rgba(168, 85, 247, 0.1), rgba(168, 85, 247, 0.05), rgba(168, 85, 247, 0.1));
          backdrop-filter: blur(var(--blur-light));
          -webkit-backdrop-filter: blur(var(--blur-light));
          border-bottom: 1px solid rgba(168, 85, 247, 0.2);
        }

        .chat-toggle-btn {
          background: linear-gradient(135deg, #A855F7 0%, #EC4899 100%);
          transition: all 0.3s ease;
        }

        .chat-toggle-btn:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 15px rgba(168, 85, 247, 0.4);
        }

        .chat-sidebar {
          background: var(--glass-bg);
          border-left: 1px solid rgba(255, 255, 255, 0.05);
          backdrop-filter: blur(var(--blur));
          -webkit-backdrop-filter: blur(var(--blur));
          box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
        }

        .breathe {
            animation: breathe 2s ease-in-out infinite;
        }
        
        @keyframes breathe {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.02); }
        }

        .dare-feed-title {
          -webkit-text-stroke-width: 1px;
          -webkit-text-stroke-color: rgba(255, 255, 255, 0.1);
        }

        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }

        @media (max-width: 767px) {
          .conveyor-bar {
            bottom: 0;
            top: auto;
            width: 100%;
            border-top: 1px solid rgba(168, 85, 247, 0.2);
            border-bottom: none;
            flex-direction: row;
            overflow-x: auto;
            white-space: nowrap;
          }

          .conveyor-bar .flex {
            flex-direction: row;
          }

          .conveyor-item {
            padding: 8px 12px;
            margin: 0 4px;
            min-width: unset;
          }

          .chat-toggle-btn {
            bottom: 4rem;
            right: 1rem;
            padding: 0.5rem 0.75rem;
          }
          .chat-toggle-btn span.hidden.sm\:inline {
            display: none;
          }
          .chat-toggle-btn span.sm\:hidden {
            display: inline;
          }
        }
      `}</style>

      <div className="content-wrapper">
        <ChatSidebar 
          dare={activeDare}
          isOpen={chatOpen}
          onClose={() => setChatOpen(false)}
        />

        <button
          onClick={handleToggleChat}
          className="chat-toggle-btn ripple fixed right-4 bottom-20 z-50 px-4 py-2 rounded-full text-white font-semibold flex items-center gap-2 shadow-lg"
        >
          <MessageCircle className="w-4 h-4" />
          <span className="hidden sm:inline">{chatOpen ? 'Close Chat' : '💬 Open Chat'}</span>
          <span className="sm:hidden">💬</span>
        </button>

        <AnimatePresence>
          {showLeaderboard && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className={`leaderboard-modal ${showLeaderboard ? 'open' : ''}`}
              onClick={() => setShowLeaderboard(false)}
            >
              <motion.div
                ref={leaderboardRef}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="leaderboard-content"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={handleTouchStart}
                onTouchEnd={handleTouchEnd}
              >
                <div className="sticky top-0 bg-[#0A0A0F]/80 backdrop-blur-md border-b border-purple-500/20 p-6 flex items-center justify-between z-10">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-6 h-6 text-yellow-400" />
                    <h2 className="text-2xl font-bold text-white">Top Darers</h2>
                  </div>
                  <button
                    onClick={() => setShowLeaderboard(false)}
                    className="text-orange-400 hover:text-orange-300 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>

                <div className="p-6 space-y-3">
                  {mockLeaderboard.map((player, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="apple-glass-card p-4 h-16 flex items-center justify-between"
                      style={index === 0 ? { 
                        background: 'linear-gradient(135deg, rgba(255, 215, 0, 0.15), rgba(255, 215, 0, 0.05))' 
                      } : {}}
                    >
                      <div className="flex items-center gap-3 flex-1">
                        <div className="w-10 flex items-center justify-center">
                          {index === 0 && <span className="text-3xl">🥇</span>}
                          {index === 1 && <span className="text-3xl">🥈</span>}
                          {index === 2 && <span className="text-3xl">🥉</span>}
                          {index > 2 && <span className="text-lg font-bold text-gray-400">#{index + 1}</span>}
                        </div>
                        <Avatar className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500">
                          <AvatarFallback className="bg-transparent text-white font-semibold">
                            {player.name[0]?.toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-white text-sm truncate">@{player.name}</p>
                          <p className="text-xs text-gray-400">{player.completed} dares</p>
                        </div>
                      </div>
                      <div className="px-3 py-1 bg-purple-500/20 border border-purple-500/50 rounded-full">
                        <span className="text-purple-400 font-bold text-sm">{player.rep}</span>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <div className="sticky bottom-0 bg-[#0A0A0F]/80 backdrop-blur-md border-t border-purple-500/20 p-6">
                  <Link to={createPageUrl("Leaderboard")}>
                    <Button className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white ripple">
                      View Full Leaderboard
                    </Button>
                  </Link>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="dares-treadmill-wrapper overflow-hidden w-full mt-4" style={{ position: 'relative', zIndex: 50 }}>
          <ConveyorBar dares={dares} onOpenChat={handleOpenChat} onOpenLeaderboard={handleToggleLeaderboard} />
        </div>

        <div className="main-content flex-1 p-4 md:p-8 mt-4 relative" style={{ marginRight: chatOpen && window.innerWidth >= 768 ? '400px' : '0', transition: 'margin-right 0.3s ease' }}>
          
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-12 py-8 md:py-16">
              <motion.img
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5 }}
                src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fdae09d2124933d726e89a/bef958255_image.png"
                alt="PEEBARE"
                className="h-48 sm:h-72 md:h-96 lg:h-[520px]"
                style={{
                  animation: 'pee-bounce 7s ease-in-out infinite',
                  filter: 'drop-shadow(0 25px 50px rgba(255,184,0,0.35))'
                }}
              />

              <div className="text-center md:text-left px-2">
                <h1 className="hero-text text-2xl sm:text-3xl md:text-5xl lg:text-6xl font-black text-white mb-4 leading-tight">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">
                    Force streamers to do your dares
                  </span>
                  <br />
                  <span className="text-white">with $BARE</span>
                </h1>
                <p className="text-gray-400 text-sm sm:text-base md:text-xl mb-2 max-w-lg">
                  Winner takes 2× pot. Loser cries on stream.
                </p>
                <p className="text-gray-500 text-xs sm:text-sm mb-6 md:mb-8 max-w-lg">
                  Streamers can refuse → you get 100% back. Zero risk if they chicken out.
                </p>
                <Link to={createPageUrl("CreateDare")}>
                  <Button className="bg-gradient-to-r from-[#00ff41] to-green-500 hover:from-green-500 hover:to-[#00ff41] text-black font-black text-base md:text-xl px-6 md:px-8 py-4 md:py-6 rounded-2xl hover:scale-105 transition-transform">
                    <Zap className="w-5 h-5 md:w-6 md:h-6 mr-2" />
                    <span className="hidden sm:inline">Dare Someone (or get dared)</span>
                    <span className="sm:hidden">Create Dare</span>
                  </Button>
                </Link>
              </div>
            </div>

            
            <motion.div 
              id="dare-feed"
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center mb-8 py-8"
            >
              <h1 className="dare-feed-title text-4xl md:text-6xl font-bold text-white mb-4 bg-gradient-to-r from-[#FFB800] via-[#FF6B00] to-[#FFB800] bg-clip-text text-transparent">
                🔥 Live Dares
              </h1>
              <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                Someone's about to eat a ghost pepper or win 2x pot. Don't miss it.
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8"
            >
              <div onClick={() => handleStatClick("active")} className="stats-button apple-glass-card breathe p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <TrendingUp className="w-5 h-5 text-purple-400" />
                  <span className="text-3xl font-bold text-white">{acceptedDares.length}</span>
                </div>
                <p className="text-gray-400 text-sm">Active Dares</p>
              </div>
              <div onClick={() => handleStatClick("completed")} className="stats-button apple-glass-card breathe p-6 text-center">
                <div className="flex items-center justify-center gap-2 mb-2">
                  <Zap className="w-5 h-5 text-green-400" />
                  <span className="text-3xl font-bold text-white">{dares.filter(d => d.status === "completed").length}</span>
                </div>
                <p className="text-gray-400 text-sm">Completed</p>
              </div>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="mb-8 space-y-4"
            >
              <div className="relative search-glass rounded-xl border border-[rgb(40,40,52)]">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  placeholder="Search dares by title, description, or streamer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 bg-transparent border-0 text-white placeholder:text-gray-500 focus:ring-0 focus-visible:ring-0 h-12"
                />
              </div>

              <div className="flex gap-4 items-center flex-wrap">
                <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="flex-1">
                  <TabsList className="apple-glass-card p-1 flex flex-wrap h-auto gap-1">
                    <TabsTrigger value="all" className="filter-pill data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">All</TabsTrigger>
                    <TabsTrigger value="gaming" className="filter-pill data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">Gaming</TabsTrigger>
                    <TabsTrigger value="irl" className="filter-pill data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">IRL</TabsTrigger>
                    <TabsTrigger value="creative" className="filter-pill data-[state=active]:bg-pink-500/20 data-[state=active]:text-pink-400">Creative</TabsTrigger>
                    <TabsTrigger value="fitness" className="filter-pill data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">Fitness</TabsTrigger>
                    <TabsTrigger value="food" className="filter-pill data-[state=active]:bg-orange-500/20 data-[state=active]:text-orange-400">Food</TabsTrigger>
                  </TabsList>
                </Tabs>
                {(statusView !== "all" || categoryFilter !== "all" || searchQuery) && (
                  <Button onClick={() => { setStatusView("all"); setCategoryFilter("all"); setSearchQuery(""); }} variant="outline" className="bg-purple-500/10 border-purple-500/50 text-purple-400 hover:bg-purple-500/20 ripple">
                    Clear Filters
                  </Button>
                )}
              </div>
            </motion.div>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {Array(6).fill(0).map((_, i) => (
                  <div key={i} className="apple-glass-card p-6 space-y-4">
                    <Skeleton className="h-48 w-full bg-[rgb(30,30,40)]" />
                    <Skeleton className="h-6 w-3/4 bg-[rgb(30,30,40)]" />
                    <Skeleton className="h-4 w-full bg-[rgb(30,30,40)]" />
                    <Skeleton className="h-4 w-2/3 bg-[rgb(30,30,40)]" />
                  </div>
                ))}
              </div>
            ) : filteredDares.length === 0 ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-16">
                <Card className="max-w-2xl mx-auto apple-glass-card">
                  <CardContent className="p-12">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68fdae09d2124933d726e89a/bef958255_image.png"
                      alt="Bear with spray can"
                      className="w-48 h-48 mx-auto mb-6 object-contain"
                    />
                    <h3 className="text-3xl font-bold text-white mb-4">
                      {dares.length === 0 ? "Beta: Post the First Dare!" : "No Dares Found"}
                    </h3>
                    <p className="text-gray-400 text-lg max-w-2xl mx-auto mb-8">
                      {dares.length === 0 ? "Be a pioneer! Create the first dare and start the challenge revolution." : "Try adjusting your filters or search terms to find more dares."}
                    </p>
                    <Link to={createPageUrl("CreateDare")}>
                      <Button className="bg-gradient-to-r from-[#FFB800] to-[#FF6B00] hover:from-[#FF6B00] hover:to-[#FFB800] text-white text-lg px-8 py-6 h-auto ripple">
                        <Zap className="w-5 h-5 mr-2" />Create First Dare
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <>
                <div className="md:hidden">
                  <div className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide gap-6 pb-6">
                    {filteredDares.map((dare) => (
                      <div key={dare.id} className="snap-center shrink-0 w-80">
                        <DareCard 
                          dare={dare}
                          onAccept={handleAcceptDare}
                          onDismiss={handleDismissDare}
                          onOpenChat={handleOpenChat}
                          isAccepting={acceptDareMutation.isPending && acceptDareMutation.variables?.dareId === dare.id}
                          onHoverSpawn={handleCardHover}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <motion.div layout className="hidden md:grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" onMouseEnter={handleCardHover}>
                  <AnimatePresence>
                    {filteredDares.map((dare) => (
                      <DareCard 
                        key={dare.id} 
                        dare={dare}
                        onAccept={handleAcceptDare}
                        onDismiss={handleDismissDare}
                        onOpenChat={handleOpenChat}
                        isAccepting={acceptDareMutation.isPending && acceptDareMutation.variables?.dareId === dare.id}
                        onHoverSpawn={handleCardHover}
                      />
                    ))}
                  </AnimatePresence>
                </motion.div>
              </>
            )}
          </div>
        </div>

        <HallOfShame />
        <Footer onToggleLeaderboard={handleToggleLeaderboard} />
      </div>
    </div>
  );
}