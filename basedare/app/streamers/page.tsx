"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Users, TrendingUp, Trophy, Zap, Crown } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";

// --- MOCK DATA ---
const MOCK_USER = { email: "streamer@basedare.com", full_name: "Streamer X" };

export default function StreamersPage() {
  const [user, setUser] = useState<any>(null);
  const [walletConnected, setWalletConnected] = useState(false);
  const [badgeClaimed, setBadgeClaimed] = useState(false);
  const { toast } = useToast();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<any[]>([]);
  const animationFrameRef = useRef(0);

  // Simulate Auth
  useEffect(() => {
    setTimeout(() => setUser(MOCK_USER), 500);
  }, []);

  // --- PARTICLE SYSTEM ---
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    updateCanvasSize();

    class XBoltCoin {
      x: number; y: number; speedX: number; speedY: number; size: number;
      constructor() {
        this.x = Math.random() * (canvas?.width || 0);
        this.y = Math.random() * (canvas?.height || 0);
        this.speedX = (Math.random() - 0.5) * 0.5;
        this.speedY = 0.5 + Math.random() * 1;
        this.size = 2 + Math.random() * 3;
      }
      update() {
        this.y += this.speedY;
        this.x += this.speedX;
        if (this.y > (canvas?.height || 0)) this.y = -10;
      }
      draw() {
        if (!ctx) return;
        ctx.fillStyle = "rgba(168, 85, 247, 0.4)";
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    particlesRef.current = Array.from({ length: 20 }, () => new XBoltCoin());

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particlesRef.current.forEach(p => { p.update(); p.draw(); });
      animationFrameRef.current = requestAnimationFrame(animate);
    }
    animate();

    window.addEventListener('resize', updateCanvasSize);

    return () => {
      window.removeEventListener('resize', updateCanvasSize);
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, []);

  const handleClaimBadge = () => {
    if (!walletConnected) {
      setWalletConnected(true);
      toast({
        title: "Wallet Connected!",
        description: "Mock wallet connected successfully",
        className: "bg-green-500/20 border-green-500/50 text-white",
      });
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

      <div className="flex-1 p-4 md:p-8 pb-24 relative z-10 mt-12">
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
              <Link href="/create">
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
    </div>
  );
}


