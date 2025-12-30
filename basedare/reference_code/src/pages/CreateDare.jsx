import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarIcon, Zap, Loader2, Image as ImageIcon, Wallet, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import Footer from "../components/Footer";

export default function CreateDarePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [walletConnected, setWalletConnected] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [errors, setErrors] = useState({});

  const canvasRef = useRef(null);
  const particlesRef = useRef([]);
  const animationFrameRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {
      base44.auth.redirectToLogin(window.location.pathname);
    });
  }, []);

  // Floating X particles system - ENHANCED VISIBILITY
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
    const maxParticles = isMobile ? 8 : 15; // INCREASED particle count

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
          this.baseOpacity = 1; // INCREASED from 0.8
        } else {
          this.x = Math.random() * canvas.width;
          this.y = -50 + Math.random() * -100;
          this.speedX = isMobile ? 0.15 : 0.25;
          this.speedY = isMobile ? 0.3 : 0.5;
          this.baseOpacity = 0.8 + Math.random() * 0.2; // INCREASED from 0.5-0.8 to 0.8-1.0
        }
        
        this.radius = 10; // INCREASED from 8
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
          : 0.7 + Math.sin(this.glitterPhase) * 0.3; // INCREASED base from 0.5
        const flickerOpacity = this.isHoverSpawn 
          ? (this.baseOpacity * glitter) * (this.lifetime / 1500)
          : this.baseOpacity * glitter;
        
        // BRIGHTER outer glow
        ctx.globalAlpha = flickerOpacity * 0.8; // INCREASED from 0.6
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, this.radius * 2.5);
        gradient.addColorStop(0, 'rgba(168, 85, 247, 0.7)'); // INCREASED from 0.4
        gradient.addColorStop(0.5, 'rgba(168, 85, 247, 0.4)'); // INCREASED from 0.2
        gradient.addColorStop(1, 'rgba(168, 85, 247, 0.1)'); // INCREASED from 0.05
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 2.5, 0, Math.PI * 2);
        ctx.fill();
        
        // Main circle - BRIGHTER
        ctx.globalAlpha = flickerOpacity;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 3; // INCREASED from 2
        ctx.shadowColor = '#A855F7';
        ctx.shadowBlur = 12 + Math.sin(this.glitterPhase) * 6; // INCREASED glow
        ctx.beginPath();
        ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
        ctx.stroke();
        
        // X marks - BRIGHTER
        ctx.globalAlpha = flickerOpacity;
        ctx.strokeStyle = '#A855F7';
        ctx.lineWidth = 3; // INCREASED from 2
        ctx.lineCap = 'round';
        ctx.shadowBlur = 8; // INCREASED from 3
        ctx.shadowColor = '#A855F7';
        ctx.setLineDash([3, 1.5]); // Adjusted dash
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

    particlesRef.current = [];
    for (let i = 0; i < maxParticles; i++) {
      const coin = new XBoltCoin();
      coin.y = Math.random() * canvas.height; // Start at random heights
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

  const createDareMutation = useMutation({
    mutationFn: (dareData) => base44.entities.Dare.create(dareData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dares'] });
      toast({
        title: "Dare posted!",
        description: "View on Home",
        className: "bg-green-500/20 border-green-500/50 text-white",
      });
      setTimeout(() => navigate(createPageUrl("Home")), 1000);
    },
  });

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setFormData(prev => ({ ...prev, image_url: file_url }));
    } catch (error) {
      console.error("Error uploading image:", error);
    }
    setUploading(false);
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.title.trim()) {
      newErrors.title = "Title is required";
      toast({
        title: "Required",
        description: "Title is required",
        variant: "destructive",
      });
    }
    
    if (!formData.description.trim()) {
      newErrors.description = "Description is required";
      toast({
        title: "Required",
        description: "Description is required",
        variant: "destructive",
      });
    }
    
    const stakeAmount = parseFloat(formData.stake_amount);
    if (formData.stake_amount && stakeAmount < 5) {
      newErrors.stake_amount = "Min $5 for entry";
      toast({
        title: "Invalid BOUNTY",
        description: "Min $5 for entry",
        variant: "destructive",
      });
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    if (!walletConnected) {
      setShowWalletModal(true);
      return;
    }
    
    const dareData = {
      ...formData,
      stake_amount: formData.stake_amount ? parseFloat(formData.stake_amount) : 0,
      expiry_timer: formData.expiry_timer ? formData.expiry_timer.toISOString() : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      status: "pending"
    };

    createDareMutation.mutate(dareData);
  };

  const connectWallet = () => {
    setWalletConnected(true);
    setShowWalletModal(false);
    toast({
      title: "Wallet Connected",
      description: "Phantom wallet connected successfully",
      className: "bg-green-500/20 border-green-500/50 text-white",
    });
  };

  const calculateEscrow = () => {
    const stake = parseFloat(formData.stake_amount) || 0;
    const escrow = stake * 0.1;
    return { stake, escrow };
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  const { stake, escrow } = calculateEscrow();

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'linear-gradient(to bottom, rgb(15,15,20), rgb(20,15,30))' }}>
      {/* Canvas BEHIND everything */}
      <canvas
        ref={canvasRef}
        className="fixed top-0 left-0 w-full h-full pointer-events-none"
        style={{ 
          zIndex: 0,
          position: 'fixed',
          display: 'block',
          background: 'transparent'
        }}
      />

      <style>{`
        /* Content should be above canvas */
        .content-layer {
          position: relative;
          z-index: 1;
        }
        
        .content-layer > * {
          position: relative;
          z-index: 1;
        }
      `}</style>

      <div className="content-layer flex-1 p-4 md:p-8 pb-24">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center mb-8"
          >
            <div className="inline-flex items-center gap-2 bg-purple-500/10 border border-purple-500/30 rounded-full px-4 py-2 mb-4">
              <Zap className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-purple-400 font-medium">New Challenge</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              Create a Dare
            </h1>
            <p className="text-gray-400 text-lg">
              Set up your challenge and let the community watch you succeed
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="bg-[rgb(20,20,28)] border-[rgb(40,40,52)]">
              <CardHeader>
                <CardTitle className="text-2xl text-white">Dare Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6 gap-4">
                  {/* Streamer Earnings Pill - Above upload */}
                  <div className="flex justify-center">
                    <div className="inline-flex items-center gap-2 bg-gradient-to-r from-orange-500/20 to-yellow-500/20 border border-orange-500/50 rounded-full px-4 py-2">
                      <span className="text-orange-400 font-bold text-sm">🔥 Streamers: Earn $5k-$50k/month accepting dares</span>
                    </div>
                  </div>

                  {/* Image Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="image" className="text-gray-300">Challenge Image</Label>
                    <div className="border-2 border-dashed border-[rgb(40,40,52)] rounded-xl p-6 md:p-8 min-h-32 text-center hover:border-purple-500/50 transition-colors">
                      {formData.image_url ? (
                        <div className="relative">
                          <img 
                            src={formData.image_url} 
                            alt="Preview" 
                            className="max-h-64 mx-auto rounded-lg"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => setFormData(prev => ({ ...prev, image_url: "" }))}
                            className="mt-4 bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-gray-300 hover:bg-red-500/20 hover:text-red-400"
                          >
                            Remove Image
                          </Button>
                        </div>
                      ) : (
                        <>
                          <input
                            id="image"
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="hidden"
                          />
                          <label htmlFor="image" className="cursor-pointer">
                            {uploading ? (
                              <Loader2 className="w-12 h-12 text-purple-400 mx-auto mb-4 animate-spin" />
                            ) : (
                              <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                            )}
                            <p className="text-gray-400 mb-2">
                              {uploading ? "Uploading..." : "Click to upload challenge image"}
                            </p>
                            <p className="text-sm text-gray-500">PNG, JPG up to 10MB</p>
                          </label>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title" className="text-gray-300">Dare Title *</Label>
                    <Input
                      id="title"
                      placeholder="e.g., Beat Dark Souls without dying"
                      value={formData.title}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, title: e.target.value }));
                        setErrors(prev => ({ ...prev, title: null }));
                      }}
                      className={`bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white placeholder:text-gray-500 focus:border-purple-500/50 ${
                        errors.title ? 'border-red-500 focus:border-red-500' : ''
                      }`}
                    />
                    {errors.title && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.title}
                      </p>
                    )}
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-gray-300">Description *</Label>
                    <Textarea
                      id="description"
                      placeholder="Describe the challenge in detail..."
                      value={formData.description}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, description: e.target.value }));
                        setErrors(prev => ({ ...prev, description: null }));
                      }}
                      rows={4}
                      className={`bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white placeholder:text-gray-500 focus:border-purple-500/50 ${
                        errors.description ? 'border-red-500 focus:border-red-500' : ''
                      }`}
                    />
                    {errors.description && (
                      <p className="text-red-400 text-sm flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.description}
                      </p>
                    )}
                  </div>

                  {/* Streamer Name */}
                  <div className="space-y-2">
                    <Label htmlFor="streamer_name" className="text-gray-300">Streamer Name</Label>
                    <Input
                      id="streamer_name"
                      placeholder="Your streaming name"
                      value={formData.streamer_name}
                      onChange={(e) => setFormData(prev => ({ ...prev, streamer_name: e.target.value }))}
                      className="bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white placeholder:text-gray-500 focus:border-purple-500/50"
                    />
                  </div>

                  {/* Category and Difficulty */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-gray-300">Category</Label>
                      <Select
                        value={formData.category}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}
                      >
                        <SelectTrigger className="bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white">
                          <SelectItem value="gaming">Gaming</SelectItem>
                          <SelectItem value="irl">IRL</SelectItem>
                          <SelectItem value="creative">Creative</SelectItem>
                          <SelectItem value="fitness">Fitness</SelectItem>
                          <SelectItem value="food">Food</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Difficulty</Label>
                      <Select
                        value={formData.difficulty}
                        onValueChange={(value) => setFormData(prev => ({ ...prev, difficulty: value }))}
                      >
                        <SelectTrigger className="bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white">
                          <SelectItem value="easy">Easy</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="hard">Hard</SelectItem>
                          <SelectItem value="extreme">Extreme</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Stake Amount and Expiry Timer */}
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="stake_amount" className="text-gray-300">BOUNTY POT Amount ($)</Label>
                      <Input
                        id="stake_amount"
                        type="number"
                        placeholder="Min $5"
                        value={formData.stake_amount}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, stake_amount: e.target.value }));
                          setErrors(prev => ({ ...prev, stake_amount: null }));
                        }}
                        min="0"
                        step="0.01"
                        className={`bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white placeholder:text-gray-500 focus:border-purple-500/50 ${
                          errors.stake_amount ? 'border-red-500 focus:border-red-500' : ''
                        }`}
                      />
                      {errors.stake_amount && (
                        <p className="text-red-400 text-sm flex items-center gap-1">
                          <AlertCircle className="w-4 h-4" />
                          {errors.stake_amount}
                        </p>
                      )}
                      {stake >= 5 && (
                        <Alert className="bg-purple-500/10 border-purple-500/30 mt-2">
                          <AlertDescription className="text-purple-400 text-xs">
                            BOUNTY POT: 10% (${escrow.toFixed(2)}) in $BARE
                            {!walletConnected && " — connect wallet to add to BOUNTY"}
                          </AlertDescription>
                        </Alert>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-gray-300">Expiry Date *</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className="w-full justify-start text-left bg-[rgb(30,30,40)] border-[rgb(40,40,52)] text-white hover:bg-[rgb(40,40,52)]"
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {formData.expiry_timer ? format(formData.expiry_timer, 'PPP') : 'Pick a date'}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 bg-[rgb(30,30,40)] border-[rgb(40,40,52)]">
                          <Calendar
                            mode="single"
                            selected={formData.expiry_timer}
                            onSelect={(date) => setFormData(prev => ({ ...prev, expiry_timer: date }))}
                            initialFocus
                            className="text-white"
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <Button
                    type="submit"
                    disabled={createDareMutation.isPending}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white h-12 text-lg font-semibold"
                  >
                    {createDareMutation.isPending ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Creating Dare...
                      </>
                    ) : (
                      <>
                        <Zap className="w-5 h-5 mr-2" />
                        Create Dare
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <Footer />

      {/* Connect Wallet Modal */}
      <Dialog open={showWalletModal} onOpenChange={setShowWalletModal}>
        <DialogContent className="bg-[rgb(20,20,28)] border-purple-500/30 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-purple-400" />
              Connect Wallet
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Connect your Phantom wallet to add to BOUNTY POT and create dares
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Button
              onClick={connectWallet}
              className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 text-white h-14"
            >
              <img 
                src="https://phantom.app/img/phantom-icon-purple.png" 
                alt="Phantom" 
                className="w-6 h-6 mr-2"
              />
              Connect Phantom Wallet
            </Button>
            <p className="text-xs text-gray-500 text-center">
              By connecting, you agree to our Terms of Service
            </p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}