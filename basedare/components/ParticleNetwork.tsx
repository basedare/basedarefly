'use client';

import { useEffect, useRef } from 'react';

interface ParticleNetworkProps {
  particleCount?: number;
  minDist?: number;
  particleColor?: string;
  lineColor?: string;
  speed?: number;
  className?: string;
}

export default function ParticleNetwork({
  particleCount = 120,
  minDist = 100,
  particleColor = 'rgba(0, 0, 0, 0.8)',
  lineColor = 'rgba(0, 0, 0,',
  speed = 0.5,
  className = '',
}: ParticleNetworkProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);

  interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    radius: number;
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let W = canvas.offsetWidth;
    let H = canvas.offsetHeight;

    const handleResize = () => {
      W = canvas.offsetWidth;
      H = canvas.offsetHeight;
      canvas.width = W;
      canvas.height = H;
      initParticles();
    };

    const initParticles = () => {
      particlesRef.current = [];
      for (let i = 0; i < particleCount; i++) {
        particlesRef.current.push({
          x: Math.random() * W,
          y: Math.random() * H,
          vx: (-1 + Math.random() * 2) * speed,
          vy: (-1 + Math.random() * 2) * speed,
          radius: 3,
        });
      }
    };

    const draw = () => {
      ctx.clearRect(0, 0, W, H);

      const particles = particlesRef.current;

      // Update positions first
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];

        p.x += p.vx;
        p.y += p.vy;

        // Wrap around edges
        if (p.x + p.radius > W) p.x = p.radius;
        else if (p.x - p.radius < 0) p.x = W - p.radius;

        if (p.y + p.radius > H) p.y = p.radius;
        else if (p.y - p.radius < 0) p.y = H - p.radius;
      }

      // Draw connections
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist <= minDist) {
            const opacity = (1 - dist / minDist) * 0.6;
            ctx.beginPath();
            ctx.strokeStyle = `${lineColor}${opacity})`;
            ctx.lineWidth = 1;
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            ctx.stroke();
          }
        }
      }

      // Draw particles on top
      for (let i = 0; i < particles.length; i++) {
        const p = particles[i];
        ctx.fillStyle = particleColor;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2, false);
        ctx.fill();
      }

      animationRef.current = requestAnimationFrame(draw);
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    animationRef.current = requestAnimationFrame(draw);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [particleCount, minDist, particleColor, lineColor, speed]);

  return (
    <canvas
      ref={canvasRef}
      className={`absolute inset-0 w-full h-full ${className}`}
      style={{ pointerEvents: 'none' }}
    />
  );
}
