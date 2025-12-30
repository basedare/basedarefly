import React, { useEffect, useRef, memo } from "react";

const GalaxyBackground = memo(function GalaxyBackground() {
  const canvasRef = useRef(null);
  const animationRef = useRef(null);
  const starsRef = useRef({ slow: [], medium: [], fast: [] });
  const nebulaRef = useRef([]);
  const shootingStarRef = useRef(null);
  const lastShootingStarTime = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect low-end device
    const isLowEnd = navigator.hardwareConcurrency <= 4 || 
                     window.innerWidth < 768 ||
                     window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (isLowEnd) {
      canvas.style.display = 'none';
      return;
    }

    const ctx = canvas.getContext('2d', { alpha: true });
    let width = window.innerWidth;
    let height = window.innerHeight;

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      initStars();
      initNebula();
    };

    // Initialize star layers
    const initStars = () => {
      const createStarLayer = (count, sizeRange) => {
        return Array.from({ length: count }, () => ({
          x: Math.random() * width,
          y: Math.random() * height,
          size: sizeRange[0] + Math.random() * (sizeRange[1] - sizeRange[0]),
          brightness: 0.3 + Math.random() * 0.7,
          twinkleSpeed: 0.5 + Math.random() * 2,
          twinkleOffset: Math.random() * Math.PI * 2
        }));
      };

      starsRef.current = {
        slow: createStarLayer(80, [0.5, 1.2]),    // Background stars
        medium: createStarLayer(50, [1, 1.8]),    // Mid-layer
        fast: createStarLayer(30, [1.5, 2.5])     // Foreground
      };
    };

    // Initialize nebula clouds
    const initNebula = () => {
      nebulaRef.current = [
        { x: width * 0.2, y: height * 0.3, radius: 300, color: 'rgba(168, 85, 247, 0.03)', drift: 0.1 },
        { x: width * 0.8, y: height * 0.7, radius: 400, color: 'rgba(0, 255, 65, 0.02)', drift: -0.08 },
        { x: width * 0.5, y: height * 0.5, radius: 350, color: 'rgba(236, 72, 153, 0.025)', drift: 0.05 },
        { x: width * 0.1, y: height * 0.8, radius: 250, color: 'rgba(59, 130, 246, 0.02)', drift: 0.12 }
      ];
    };

    // Shooting star class
    class ShootingStar {
      constructor() {
        this.reset();
      }

      reset() {
        this.x = Math.random() * width;
        this.y = -10;
        this.length = 80 + Math.random() * 120;
        this.speed = 12 + Math.random() * 8;
        this.angle = Math.PI / 4 + (Math.random() - 0.5) * 0.3;
        this.opacity = 1;
        this.active = true;
      }

      update() {
        this.x += Math.cos(this.angle) * this.speed;
        this.y += Math.sin(this.angle) * this.speed;
        this.opacity -= 0.015;
        
        if (this.opacity <= 0 || this.y > height + 50 || this.x > width + 50) {
          this.active = false;
        }
      }

      draw(ctx) {
        if (!this.active) return;
        
        const tailX = this.x - Math.cos(this.angle) * this.length;
        const tailY = this.y - Math.sin(this.angle) * this.length;
        
        const gradient = ctx.createLinearGradient(tailX, tailY, this.x, this.y);
        gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
        gradient.addColorStop(0.7, `rgba(255, 255, 255, ${this.opacity * 0.5})`);
        gradient.addColorStop(1, `rgba(255, 255, 255, ${this.opacity})`);
        
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(this.x, this.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Bright head
        ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${this.opacity})`;
        ctx.shadowColor = '#fff';
        ctx.shadowBlur = 10;
        ctx.fill();
        ctx.shadowBlur = 0;
      }
    }

    // Draw nebula clouds
    const drawNebula = (time) => {
      nebulaRef.current.forEach(nebula => {
        const offsetX = Math.sin(time * 0.0001 * nebula.drift) * 30;
        const offsetY = Math.cos(time * 0.0001 * nebula.drift) * 20;
        
        const gradient = ctx.createRadialGradient(
          nebula.x + offsetX, nebula.y + offsetY, 0,
          nebula.x + offsetX, nebula.y + offsetY, nebula.radius
        );
        gradient.addColorStop(0, nebula.color);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      });
    };

    // Draw star layer
    const drawStars = (stars, speed, time) => {
      stars.forEach(star => {
        const twinkle = 0.5 + Math.sin(time * 0.001 * star.twinkleSpeed + star.twinkleOffset) * 0.5;
        const alpha = star.brightness * twinkle;
        
        // Parallax movement
        star.y += speed * 0.016;
        if (star.y > height + 10) {
          star.y = -10;
          star.x = Math.random() * width;
        }
        
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
        ctx.fill();
      });
    };

    // Main animation loop
    const animate = (time) => {
      ctx.clearRect(0, 0, width, height);
      
      // Draw nebula first (background)
      drawNebula(time);
      
      // Draw star layers with parallax
      drawStars(starsRef.current.slow, 0.05, time);
      drawStars(starsRef.current.medium, 0.15, time);
      drawStars(starsRef.current.fast, 0.3, time);
      
      // Shooting star logic (every 8-12 seconds)
      const timeSinceLastStar = time - lastShootingStarTime.current;
      const nextStarDelay = 8000 + Math.random() * 4000;
      
      if (!shootingStarRef.current && timeSinceLastStar > nextStarDelay) {
        shootingStarRef.current = new ShootingStar();
        lastShootingStarTime.current = time;
      }
      
      if (shootingStarRef.current) {
        shootingStarRef.current.update();
        shootingStarRef.current.draw(ctx);
        
        if (!shootingStarRef.current.active) {
          shootingStarRef.current = null;
        }
      }
      
      animationRef.current = requestAnimationFrame(animate);
    };

    resize();
    window.addEventListener('resize', resize);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: -10,
        opacity: 0.6,
        willChange: 'transform',
        transform: 'translateZ(0)'
      }}
    />
  );
});

export default GalaxyBackground;