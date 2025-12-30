
import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Trophy, Zap, Crown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { base44 } from "@/api/base44Client";
import Footer from "../components/Footer";

export default function StreamersPage() {
  const [user, setUser] = useState(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [badgeClaimed, setBadgeClaimed] = useState(false);
  const { toast } = useToast();

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
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

    particlesRef.current = [];
    for (let i = 0; i < maxParticles; i++) {
      const coin = new XBoltCoin();
      coin.y = Math.random() * canvas.height;
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
    if (window.innerWidth < 768) return; // Disable on mobile

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Check if there are already too many hover-spawned coins
    const hoverSpawnedCount = particlesRef.current.filter(p => p.isHoverSpawn).length;
    if (hoverSpawnedCount >= 5) { // Limit concurrent hover spawns
      return;
    }

    const hoverCoin = {
      isHoverSpawn: true,
      x: Math.random() < 0.5 ? 0 : canvas.width,
      y: Math.random() * canvas.height,
      targetX: canvas.width / 2, // Aim towards the center
      targetY: canvas.height / 2, // Aim towards the center
      speedX: 0,
      speedY: 0,
      lifetime: 1500, // Particle life in ms
      radius: 8,
      baseOpacity: 0.8,
      glitterPhase: Math.random() * Math.PI * 2,
      dashOffset: 0,
      
      update(deltaTime = 16) {
        // Calculate speed to move towards target
        const dx = this.targetX - this.x;
        const dy = this.targetY - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // Adjust speed based on distance for a fading effect or just constant speed
        const speedMultiplier = 1.2; 
        this.speedX = (dx / distance) * speedMultiplier;
        this.speedY = (dy / distance) * speedMultiplier;
        
        this.x += this.speedX;
        this.y += this.speedY;
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

  const handleClaimBadge = () => {
    if (!walletConnected) {
      setWalletConnected(true);
      toast({
        title: "Wallet Connected!",
        description: "Phantom wallet connected successfully",
        className: "bg-green-500/20 border-green-500/50 text-white",
      });
      // Automatically trigger badge claim after a short delay to show wallet connected message
      setTimeout(() => handleClaimBadge(), 500); 
      return;
    }

    setBadgeClaimed(true);
    toast({
      title: "🎉 Streamer Badge Claimed!",
      description: "You're now officially a BASEDARE streamer. Start creating dares!",
      className: "bg-gradient-to-r from-[#FFB800]/20 to-[#FF6B00]/20 border-[#FFB800]/50 text-white",
      duration: 5000,
    });
  };

  const features = [
    { icon: DollarSign, title: "Earn $5k-$50k/month", description: "Top streamers banking serious cash from dare bounties" },
    { icon: Users, title: "Instant Audience", description: "Tap into our engaged community of 100k+ dare watchers" },
    { icon: TrendingUp, title: "Grow Your Brand", description: "Viral moments = more followers, more sponsors, more money" },
    { icon: Trophy, title: "Leaderboard Fame", description: "Top streamers get legendary status + exclusive perks" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-[rgb(15,15,20)] to-[rgb(20,15,30)] relative overflow-hidden">
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ zIndex: 0 }}
      />

      <div className="flex-1 p-4 md:p-8 pb-24 relative z-10">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-16"
          >
            <div className="inline-flex items-center gap-2 bg-[#FFB800]/10 border border-[#FFB800]/30 rounded-full px-4 py-2 mb-4">
              <Crown className="w-4 h-4 text-[#FFB800]" />
              <span className="text-sm text-[#FFB800] font-medium">For Streamers</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-black text-white mb-6">
              Turn Dares Into <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FFB800] to-[#FF6B00]">Dollars</span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
              Join the #1 platform where streamers get paid to do wild challenges. Your audience dares, you deliver, everyone wins.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleClaimBadge}
                disabled={badgeClaimed}
                className="bg-gradient-to-r from-[#FFB800] to-[#FF6B00] hover:from-[#FF6B00] hover:to-[#FFB800] text-white text-lg px-8 py-6 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {badgeClaimed ? (
                  <>
                    <Crown className="w-5 h-5 mr-2" />
                    Badge Claimed ✓
                  </>
                ) : (
                  <>
                    <Zap className="w-5 h-5 mr-2" />
                    {walletConnected ? 'Claim Streamer Badge' : 'Connect Wallet to Start'}
                  </>
                )}
              </Button>
              <Link to={createPageUrl("CreateDare")}>
                <Button
                  variant="outline"
                  className="bg-white/5 border-white/20 text-white hover:bg-white/10 text-lg px-8 py-6 h-auto"
                >
                  Post Your First Dare
                </Button>
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="grid md:grid-cols-2 gap-6 mb-16"
            onMouseEnter={handleCardHover}
          >
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
              >
                <Card className="bg-gradient-to-br from-[rgb(30,30,40)] to-[rgb(20,20,30)] border-[rgb(40,40,52)] hover:border-[#FFB800]/50 transition-all h-full">
                  <CardHeader>
                    <feature.icon className="w-12 h-12 text-[#FFB800] mb-4" />
                    <CardTitle className="text-2xl text-white">{feature.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-lg">{feature.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-gradient-to-r from-[#FFB800]/20 to-[#FF6B00]/20 border border-[#FFB800]/50 rounded-3xl p-8 md:p-12 text-center"
          >
            <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
              🔥 Currently 6,847 viewers waiting for dares
            </h2>
            <p className="text-xl text-gray-300 mb-8">
              The audience is ready. Are you?
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button
                onClick={handleClaimBadge}
                disabled={badgeClaimed}
                className="bg-gradient-to-r from-[#FFB800] to-[#FF6B00] hover:from-[#FF6B00] hover:to-[#FFB800] text-white text-xl px-10 py-7 h-auto disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Zap className="w-6 h-6 mr-2" />
                {badgeClaimed ? 'Badge Claimed ✓' : 'Claim Streamer Badge Now'}
              </Button>
            </div>
          </motion.div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
