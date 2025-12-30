
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Trophy, Target, XCircle, Upload, Clock, ThumbsUp, ThumbsDown, Shield, RefreshCw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import DareCard from "../components/dares/DareCard";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/use-toast";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Badge } from "@/components/ui/badge";
import Footer from "../components/Footer";

export default function MyDaresPage() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedDare, setSelectedDare] = useState(null);
  const [showStatusDialog, setShowStatusDialog] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showVotingModal, setShowVotingModal] = useState(false);
  const [showReviveModal, setShowReviveModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);
  const [proofVideoUrl, setProofVideoUrl] = useState("");
  const [videoThumbnail, setVideoThumbnail] = useState("");
  const [votes, setVotes] = useState({ up: 0, down: 0 });
  const [hasVoted, setHasVoted] = useState(false);
  const [repPoints, setRepPoints] = useState(15);

  const lavaCanvasRef = useRef(null);
  const lavaBallsRef = useRef([]);
  const lavaAnimationRef = useRef(null);

  // NEW: Refs for floating X particles and falling star
  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);
  const fallingStarRef = useRef(null);
  const starTimerRef = useRef(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin(window.location.pathname);
    });
  }, []);

  // 1 SUBTLE YELLOW POOL BALL (8-ball) - Small and transparent
  useEffect(() => {
    console.log("🔵 useEffect TRIGGERED - Starting ball animation setup");
    
    const canvas = lavaCanvasRef.current;
    if (!canvas) {
      console.log("❌ Canvas ref is NULL!");
      return;
    }

    console.log("✅ Canvas element found:", canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.log("❌ Could not get 2D context!");
      return;
    }
    
    console.log("✅ Got canvas context");
    
    const updateCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      console.log("📐 Canvas resized:", canvas.width, "x", canvas.height);
    };
    updateCanvasSize();

    class YellowPoolBall {
      constructor() {
        this.radius = 40;
        this.x = canvas.width / 2;
        this.y = canvas.height / 2;
        this.vx = 1.5;
        this.vy = 1.5;
        this.mass = this.radius;
        console.log("🎱 Ball created at:", Math.round(this.x), Math.round(this.y));
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x - this.radius < 0) {
          this.x = this.radius;
          this.vx = Math.abs(this.vx);
        } else if (this.x + this.radius > canvas.width) {
          this.x = canvas.width - this.radius;
          this.vx = -Math.abs(this.vx);
        }

        if (this.y - this.radius < 0) {
          this.y = this.radius;
          this.vy = Math.abs(this.vy);
        } else if (this.y + this.radius > canvas.height) {
          this.y = canvas.height - this.radius;
          this.vy = -Math.abs(this.vy);
        }
      }

      draw() {
        ctx.save();
        
        const gradient = ctx.createRadialGradient(
          this.x - this.radius * 0.3,
          this.y - this.radius * 0.3,
          0,
          this.x,
          this.y,
          this.radius
        );
        gradient.addColorStop(0, 'rgba(255, 255, 100, 0.7)');
        gradient.addColorStop(0.4, 'rgba(255, 255, 0, 0.65)');
        gradient.addColorStop(0.7, 'rgba(255, 220, 0, 0.6)');
        gradient.addColorStop(1, 'rgba(200, 170, 0, 0.5)');
        
        ctx.fillStyle = gradient;
        ctx.shadowColor = 'rgba(255, 255, 0, 0.6)';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.7)';
        ctx.lineWidth = 3;
        ctx.shadowBlur = 15;
        ctx.stroke();
        
        const numberCircleRadius = this.radius * 0.45;
        
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 5;
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.beginPath();
        ctx.arc(this.x, this.y, numberCircleRadius, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
        ctx.lineWidth = 2;
        ctx.shadowBlur = 0;
        ctx.stroke();
        
        ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
        ctx.font = `bold ${numberCircleRadius * 1.5}px Arial`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 2;
        ctx.fillText('8', this.x, this.y);
        
        ctx.restore();
      }
    }

    lavaBallsRef.current = [new YellowPoolBall()];
    console.log("🎱 Ball array initialized, length:", lavaBallsRef.current.length);

    let frameCount = 0;
    let isAnimating = true;
    
    function animate() {
      if (!isAnimating) {
        console.log("⏸️ Animation stopped");
        return;
      }
      
      if (!canvas.width || !canvas.height) {
        console.log("⚠️ Canvas has no dimensions!");
        return;
      }
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (lavaBallsRef.current && lavaBallsRef.current.length > 0 && lavaBallsRef.current[0]) {
        lavaBallsRef.current[0].update();
        lavaBallsRef.current[0].draw();
      } else {
        console.log("⚠️ No ball in array!");
      }

      frameCount++;
      if (frameCount % 180 === 0) {
        console.log("🎱 Animation frame:", frameCount, "Ball position:", 
          lavaBallsRef.current[0] ? `${Math.round(lavaBallsRef.current[0].x)}, ${Math.round(lavaBallsRef.current[0].y)}` : 'NO BALL'
        );
      }

      lavaAnimationRef.current = requestAnimationFrame(animate);
    }

    console.log("▶️ Starting animation loop");
    animate();

    const handleResize = () => {
      updateCanvasSize();
      if (lavaBallsRef.current && lavaBallsRef.current.length > 0 && lavaBallsRef.current[0]) {
        const ball = lavaBallsRef.current[0];
        if (ball.x + ball.radius > canvas.width) ball.x = canvas.width - ball.radius;
        if (ball.y + ball.radius > canvas.height) ball.y = canvas.height - ball.radius;
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      console.log("🧹 CLEANUP - Stopping ball animation");
      isAnimating = false;
      window.removeEventListener('resize', handleResize);
      if (lavaAnimationRef.current) {
        cancelAnimationFrame(lavaAnimationRef.current);
        lavaAnimationRef.current = null;
      }
      lavaBallsRef.current = [];
      console.log("✅ Cleanup complete");
    };
  }, []);

  // NEW: Floating X particles + Falling Star system
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
    const maxParticles = isMobile ? 8 : 15;

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
          this.baseOpacity = 1;
        } else {
          this.x = Math.random() * canvas.width;
          this.y = -50 + Math.random() * -100;
          this.speedX = isMobile ? 0.15 : 0.25;
          this.speedY = isMobile ? 0.3 : 0.5;
          this.baseOpacity = 0.8 + Math.random() * 0.2;
        }
        
        this.radius = 10;
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
          : 0.7 + Math.sin(this.glitterPhase) * 0.3;
        const flickerOpacity = this.isHoverSpawn 
          ? (this.baseOpacity * glitter) * (this.lifetime / 1500)
          : this.baseOpacity * glitter;
        
        ctx.globalAlpha = flickerOpacity * 0.8;
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.5);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.7)');
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)');
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)');
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.globalAlpha = flickerOpacity;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 3;
        ctx.shadowColor = '#A855F7';
        ctx.shadowBlur = 12 + Math.sin(this.glitterPhase) * 6;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.globalAlpha = flickerOpacity;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.shadowBlur = 8;
        ctx.shadowColor = '#A855F7';
        ctx.setLineDash([3, 1.5]);
        ctx.lineDashOffset = this.dashOffset;
        
        ctx.beginPath();
        ctx.moveTo(-6, -6);
        ctx.lineTo(6, 6);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(6, -6);
        ctx.lineTo(-6, 6);
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
        this.x = Math.random() * canvas.width;
        this.y = -20;
        
        this.speedX = 3 + Math.random() * 2;
        this.speedY = 8 + Math.random() * 4;
        
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
        
        this.trail.push({ x: this.x, y: this.y, opacity: this.opacity });
        if (this.trail.length > this.maxTrailLength) {
          this.trail.shift();
        }
        
        this.x += this.speedX;
        this.y += this.speedY;
        
        this.opacity -= 0.008;
        
        if (this.y > canvas.height + 50 || this.opacity <= 0) {
          return false;
        }
        
        return true;
      }

      draw() {
        this.trail.forEach((point, index) => {
          const trailOpacity = (index / this.trail.length) * point.opacity * 0.6;
          const trailSize = (index / this.trail.length) * this.size;
          
          ctx.save();
          ctx.globalAlpha = trailOpacity;
          
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
        
        ctx.save();
        ctx.globalAlpha = this.opacity;
        
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#FFD700';
        ctx.shadowBlur = 20;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
        
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

    const spawnFallingStar = () => {
      fallingStarRef.current = new FallingStar();
    };

    setTimeout(() => {
      spawnFallingStar();
    }, 5000);

    const scheduleNextStar = () => {
      starTimerRef.current = setTimeout(() => {
        spawnFallingStar();
        scheduleNextStar();
      }, 180000);
    };
    
    setTimeout(() => {
      scheduleNextStar();
    }, 8000);

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

      if (fallingStarRef.current) {
        const starAlive = fallingStarRef.current.update();
        if (starAlive) {
          fallingStarRef.current.draw();
        } else {
          fallingStarRef.current = null;
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

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    image_url: "",
    stake_amount: "",
    expiry_timer: null,
    category: "gaming",
    difficulty: "medium",
    streamer_name: "",
    status: "pending"
  });

  const { data: dares, isLoading } = useQuery({
    queryKey: ['myDares', user?.email],
    queryFn: async () => {
      if (!user) return [];
      return base44.entities.Dare.filter({ created_by: user.email }, "-created_date");
    },
    enabled: !!user,
    initialData: [],
  });

  const createDareMutation = useMutation({
    mutationFn: (dareData) => base44.entities.Dare.create(dareData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDares'] });
      queryClient.invalidateQueries({ queryKey: ['dares'] });
      setShowStatusDialog(false);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, proof_video_url }) =>
      base44.entities.Dare.update(id, { status, ...(proof_video_url && { proof_video_url }) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myDares'] });
      queryClient.invalidateQueries({ queryKey: ['dares'] });
      setShowStatusDialog(false);
      setSelectedDare(null);
      setProofVideoUrl("");
    },
  });

  const handleStatusChange = (dare) => {
    setSelectedDare(dare);
    setProofVideoUrl(dare.proof_video_url || "");
    setShowStatusDialog(true);
  };

  const handleUploadProof = (dare) => {
    setSelectedDare(dare);
    setProofVideoUrl("");
    setVideoThumbnail("");
    setScanResult(null);
    setShowUploadModal(true);
  };

  const handleReviveDare = (dare) => {
    setSelectedDare(dare);
    setShowReviveModal(true);
  };

  const confirmRevive = async () => {
    await updateStatusMutation.mutateAsync({
      id: selectedDare.id,
      status: "pending"
    });
    setShowReviveModal(false);
    toast({
      title: "Dare revived!",
      description: "Paid $2 fee—back on Home Feed",
      className: "bg-green-500/20 border-green-500/50 text-white",
    });
  };

  const handleStatClick = (status) => {
    setStatusFilter(status);
    const count = status === "all" ? dares.length : dares.filter(d => {
      if (status === "failed") return d.status === "failed" || isExpired(d);
      if (status === "accepted") return d.status === "accepted" || d.status === "proof_submitted";
      return d.status === status;
    }).length;

    toast({
      title: `Viewing ${status} dares`,
      description: `${count} dare${count !== 1 ? 's' : ''} in this category`,
      className: "bg-purple-500/20 border-purple-500/50 text-white",
    });
  };

  const handleVideoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 120 * 1024 * 1024) {
      toast({
        title: "File too large",
        description: "Video must be under 2 minutes (max 120MB)",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setProofVideoUrl(file_url);
      setVideoThumbnail(file_url);
      toast({
        title: "Video uploaded",
        description: "Click Scan to verify safety",
        className: "bg-green-500/20 border-green-500/50 text-white",
      });
    } catch (error) {
      console.error("Error uploading video:", error);
      toast({
        title: "Upload failed",
        description: "Please try again",
        variant: "destructive",
      });
    }
    setUploading(false);
  };

  const handleScan = async () => {
    setScanning(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setScanResult("safe");
    setScanning(false);
    toast({
      title: "AI Scan Complete",
      description: "Video verified as safe",
      className: "bg-green-500/20 border-green-500/50 text-white",
    });
  };

  const handleSubmitProof = async () => {
    if (!proofVideoUrl || !scanResult) {
      toast({
        title: "Cannot submit",
        description: "Upload and scan video first",
        variant: "destructive",
      });
      return;
    }

    await updateStatusMutation.mutateAsync({
      id: selectedDare.id,
      status: "proof_submitted",
      proof_video_url: proofVideoUrl
    });

    setRepPoints(prev => prev + 10);
    setShowUploadModal(false);
    setShowVotingModal(true);
    setVotes({ up: 0, down: 0 });
    setHasVoted(false);

    toast({
      title: "Proof submitted! +10 Rep",
      description: "Community voting has started",
      className: "bg-green-500/20 border-green-500/50 text-white",
    });
  };

  const handleVote = (type) => {
    if (hasVoted) return;

    setVotes(prev => ({
      ...prev,
      [type]: prev[type] + 1
    }));
    setHasVoted(true);

    const totalVotes = votes.up + votes.down + 1;
    const upPercentage = type === 'up' ? ((votes.up + 1) / totalVotes) * 100 : (votes.up / totalVotes) * 100;

    if (totalVotes >= 10) {
      const approved = upPercentage > 51;
      setTimeout(() => {
        setShowVotingModal(false);
        updateStatusMutation.mutate({
          id: selectedDare.id,
          status: approved ? "completed" : "failed"
        });
        toast({
          title: approved ? "Dare approved!" : "Dare rejected",
          description: approved ? `${upPercentage.toFixed(0)}% community approval` : "Did not meet 51% threshold",
          className: approved ? "bg-green-500/20 border-green-500/50 text-white" : "bg-red-500/20 border-red-500/50 text-white",
        });
      }, 1000);
    } else {
      toast({
        title: "Vote recorded!",
        description: "Waiting for more community votes...",
        className: "bg-purple-500/20 border-purple-500/50 text-white",
      });
    }
  };

  const updateStatus = (status) => {
    if (selectedDare) {
      updateStatusMutation.mutate({
        id: selectedDare.id,
        status,
        proof_video_url: status === "completed" ? proofVideoUrl : undefined
      });
    }
  };

  const isExpired = (dare) => {
    if (!dare.expiry_timer) return false;
    return new Date(dare.expiry_timer) < new Date();
  };

  const filteredDares = statusFilter === "all"
    ? dares
    : dares.filter(dare => {
        if (statusFilter === "failed") return dare.status === "failed" || isExpired(dare);
        if (statusFilter === "accepted") return dare.status === "accepted" || dare.status === "proof_submitted";
        return dare.status === statusFilter;
      });

  const stats = {
    total: dares.length,
    pending: dares.filter(d => d.status === "pending").length,
    accepted: dares.filter(d => d.status === "accepted" || d.status === "proof_submitted").length,
    completed: dares.filter(d => d.status === "completed").length,
    failed: dares.filter(d => d.status === "failed" || isExpired(d)).length,
  };

  const repProgress = (repPoints / 50) * 100;

  const getDareVotes = (dare) => {
    if (!dare.proof_video_url) return { up: 0, down: 0 };
    return { up: 7, down: 2 };
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0F]">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const totalVotes = votes.up + votes.down;
  const upPercentage = totalVotes > 0 ? (votes.up / totalVotes) * 100 : 0;

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: '#0A0A0F' }}>
      {/* 1 SUBTLE YELLOW POOL BALL - BEHIND CONTENT */}
      <canvas
        ref={lavaCanvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ 
          zIndex: 0,
          position: 'fixed',
          display: 'block',
          background: 'transparent'
        }}
      />

      {/* NEW: Floating X particles + Falling Star Canvas */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ 
          zIndex: 1,
          position: 'fixed',
          display: 'block',
          background: 'transparent'
        }}
      />

      <style>{`
        body {
          background: #0A0A0F !important;
        }

        /* All content should be above the canvas */
        .content-wrapper,
        .content-wrapper > * {
          position: relative;
          z-index: 10; /* Changed to 10 to ensure content is above both canvases */
        }

        .radioactive-bar-container {
          position: relative;
          width: 100%;
          height: 16px;
          background: rgba(0, 0, 0, 0.5);
          border-radius: 999px;
          overflow: visible;
          border: 1px solid rgba(255, 255, 0, 0.3);
          box-shadow: 
            0 0 20px rgba(255, 255, 0, 0.3),
            inset 0 0 10px rgba(0, 0, 0, 0.5);
          z-index: 10;
        }

        .radioactive-bar {
          position: absolute;
          left: 0;
          top: 0;
          height: 100%;
          background: linear-gradient(90deg, 
            #ffff00 0%,
            #ccff00 25%,
            #ffff00 50%,
            #ccff00 75%,
            #ffff00 100%
          );
          background-size: 200% 100%;
          border-radius: 999px;
          box-shadow: 
            0 0 30px rgba(255, 255, 0, 0.8),
            0 0 60px rgba(255, 255, 0, 0.8),
            inset 0 2px 10px rgba(255, 255, 255, 0.5),
            inset 0 -2px 10px rgba(0, 0, 0, 0.3);
          animation: radioactive-pulse 2s ease-in-out infinite, radioactive-flow 3s linear infinite;
          filter: brightness(1.2) saturate(1.5);
        }

        @keyframes radioactive-pulse {
          0%, 100% {
            box-shadow: 
              0 0 20px rgba(255, 255, 0, 0.6),
              0 0 40px rgba(255, 255, 0, 0.4),
              inset 0 2px 10px rgba(255, 255, 255, 0.5);
          }
          50% {
            box-shadow: 
              0 0 40px rgba(255, 255, 0, 1),
              0 0 80px rgba(255, 255, 0, 0.8),
              inset 0 2px 10px rgba(255, 255, 255, 0.7);
          }
        }

        @keyframes radioactive-flow {
          0% {
            background-position: 0% 0%;
          }
          100% {
            background-position: 200% 0%;
          }
        }

        .glass-modal-overlay {
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          background: rgba(0, 0, 0, 0.7);
        }

        .stats-button {
          cursor: pointer;
          transition: all 0.3s ease-in-out;
          position: relative;
          z-index: 10;
        }

        .stats-button:hover {
          transform: scale(1.02);
          box-shadow: 0 0 8px rgba(168, 85, 247, 0.2);
        }

        .stats-button:active {
          transform: scale(0.98);
        }

        .proof-section {
          border-top: 1px solid #333;
          padding: 0.5rem;
          max-height: 300px;
          overflow: hidden;
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .proof-section video {
          width: 100%;
          height: 150px;
          object-fit: cover;
          border-radius: 4px;
          display: block;
        }

        .dares-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 1.5rem;
          position: relative;
          z-index: 10;
        }

        @media (min-width: 768px) {
          .dares-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }

        @media (min-width: 1024px) {
          .dares-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .vote-badge-up {
          border: 1px solid #00FF00;
          color: #00FF00;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .vote-badge-down {
          border: 1px solid #FF0000;
          color: #FF0000;
          padding: 0.25rem 0.5rem;
          border-radius: 4px;
          font-size: 0.875rem;
        }

        .vote-progress {
          height: 4px;
          background: #9370DB;
          border-radius: 2px;
        }

        .dare-card {
          background: #000 !important;
          color: #fff;
          border: none;
          position: relative;
          z-index: 10;
        }

        .dare-card img {
          object-fit: cover;
          width: 100%;
          height: 200px;
          overflow: hidden;
        }
      `}</style>

      <div className="content-wrapper flex-1 p-4 md:p-8 pb-24">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-16"
          >
            <h1 className="text-6xl md:text-7xl font-black text-white">
              My Dares
            </h1>
            <p className="text-xl mt-6 text-purple-200 max-w-2xl mx-auto">
              Track your challenges and update their status
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8"
          >
            <div
              onClick={() => handleStatClick("all")}
              className="stats-button bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] rounded-xl p-6 text-center"
            >
              <Target className="w-6 h-6 text-purple-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-white">{stats.total}</div>
              <p className="text-gray-400 text-sm">Total</p>
            </div>
            <div
              onClick={() => handleStatClick("pending")}
              className="stats-button bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] rounded-xl p-6 text-center"
            >
              <Clock className="w-6 h-6 text-yellow-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-yellow-400">{stats.pending}</div>
              <p className="text-gray-400 text-sm">Pending</p>
            </div>
            <div
              onClick={() => handleStatClick("accepted")}
              className="stats-button bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] rounded-xl p-6 text-center"
            >
              <Upload className="w-6 h-6 text-blue-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-blue-400">{stats.accepted}</div>
              <p className="text-gray-400 text-sm">Accepted</p>
            </div>
            <div
              onClick={() => handleStatClick("completed")}
              className="stats-button bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] rounded-xl p-6 text-center"
            >
              <Trophy className="w-6 h-6 text-green-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-green-400">{stats.completed}</div>
              <p className="text-gray-400 text-sm">Completed</p>
            </div>
            <div
              onClick={() => handleStatClick("failed")}
              className="stats-button bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] rounded-xl p-6 text-center"
            >
              <XCircle className="w-6 h-6 text-red-400 mx-auto mb-2" />
              <div className="text-3xl font-bold text-red-400">{stats.failed}</div>
              <p className="text-gray-400 text-sm">Failed</p>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="bg-[rgb(20,20,28)] border border-purple-500/30 rounded-xl p-6 mb-8"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-purple-400 font-semibold">Your Rep: {repPoints} pts</span>
              <span className="text-gray-400 text-sm">Bronze: 50 pts needed</span>
            </div>
            <div className="radioactive-bar-container">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${repProgress}%` }}
                transition={{ duration: 0.5 }}
                className="radioactive-bar"
              />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mb-8"
          >
            <Tabs value={statusFilter} onValueChange={setStatusFilter}>
              <TabsList className="bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] p-1 w-full md:w-auto flex-wrap">
                <TabsTrigger value="all" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400">
                  All Dares
                </TabsTrigger>
                <TabsTrigger value="pending" className="data-[state=active]:bg-yellow-500/20 data-[state=active]:text-yellow-400">
                  Pending
                </TabsTrigger>
                <TabsTrigger value="accepted" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
                  Accepted
                </TabsTrigger>
                <TabsTrigger value="completed" className="data-[state=active]:bg-green-500/20 data-[state=active]:text-green-400">
                  Completed
                </TabsTrigger>
                <TabsTrigger value="failed" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
                  Failed
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </motion.div>

          {isLoading ? (
            <div className="dares-grid">
              {Array(6).fill(0).map((_, i) => (
                <div key={i} className="bg-[rgb(20,20,28)] border border-[rgb(40,40,52)] rounded-xl p-6 animate-pulse">
                  <div className="h-48 bg-[rgb(30,30,40)] rounded-lg mb-4" />
                  <div className="h-6 bg-[rgb(30,30,40)] rounded mb-2" />
                  <div className="h-4 bg-[rgb(30,30,40)] rounded" />
                </div>
              ))}
            </div>
          ) : filteredDares.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-16"
            >
              <Target className="w-16 h-16 text-gray-600 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-400 mb-2">No dares found</h3>
              <p className="text-gray-500">
                {statusFilter === "all"
                  ? "Create your first dare to get started"
                  : `No ${statusFilter} dares yet`}
              </p>
            </motion.div>
          ) : (
            <motion.div
              layout
              className="dares-grid"
            >
              <AnimatePresence>
                {filteredDares.map((dare) => {
                  const expired = isExpired(dare);
                  const dareVotes = getDareVotes(dare);
                  const totalDareVotes = dareVotes.up + dareVotes.down;
                  const votePercentage = totalDareVotes > 0 ? (dareVotes.up / totalDareVotes) * 100 : 0;
                  const isApproved = votePercentage > 51 && totalDareVotes >= 10;
                  const needsMoreVotes = votePercentage <= 51 || totalDareVotes < 10;

                  return (
                    <div key={dare.id} className="space-y-3">
                      <DareCard 
                        dare={dare}
                        onClick={() => handleStatusChange(dare)}
                      />

                      {dare.proof_video_url && (
                        <div className="proof-section">
                          <video
                            src={dare.proof_video_url}
                            controls
                            preload="metadata"
                          />

                          <div className="flex items-center justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <span className="vote-badge-up">{dareVotes.up} up</span>
                              <span className="vote-badge-down">{dareVotes.down} down</span>
                            </div>
                            <span className="text-purple-400 font-semibold">
                              {votePercentage.toFixed(0)}%
                            </span>
                          </div>

                          <div
                            className="vote-progress"
                            style={{ width: `${votePercentage}%` }}
                          />

                          {isApproved ? (
                            <div className="bg-green-300 p-2 rounded text-center">
                              <p className="text-black font-semibold text-sm">
                                ✓ Approved! Payout x2
                              </p>
                            </div>
                          ) : needsMoreVotes ? (
                            <div className="bg-orange-300 p-2 rounded text-center">
                              <p className="text-black font-semibold text-sm">
                                Waiting... (needs 51% + 10 votes)
                              </p>
                            </div>
                          ) : null}
                        </div>
                      )}

                      {expired && !dare.proof_video_url && (
                        <div className="space-y-2">
                          <Badge className="w-full justify-center bg-gray-500/20 text-gray-400 border-gray-500/50">
                            Expired
                          </Badge>
                          <Button
                            onClick={() => handleReviveDare(dare)}
                            className="w-full animate-pulse bg-gradient-to-r from-pink-500 to-orange-500 hover:from-orange-500 hover:to-pink-500 text-white font-bold"
                          >
                            <RefreshCw className="w-4 h-4 mr-2" />
                            🔥 Revive Dare ($2)
                          </Button>
                        </div>
                      )}
                      {!expired && !dare.proof_video_url && (dare.status === "pending" || dare.status === "accepted") && (
                        <Button
                          onClick={() => handleUploadProof(dare)}
                          className="w-full bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-semibold"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          Upload Proof
                        </Button>
                      )}
                    </div>
                  );
                })}
              </AnimatePresence>
            </motion.div>
          )}
        </div>
      </div>

      <Footer />

      <Dialog open={showReviveModal} onOpenChange={setShowReviveModal}>
        <DialogContent className="bg-[rgb(20,20,28)] border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="text-2xl">Revive Dare?</DialogTitle>
            <DialogDescription className="text-gray-400">
              Pay $2 fee to re-post "{selectedDare?.title}" on Home Feed
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowReviveModal(false)}
              className="bg-gray-500/10 border-gray-500/30 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={confirmRevive}
              className="bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white"
            >
              Pay $2 & Revive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
