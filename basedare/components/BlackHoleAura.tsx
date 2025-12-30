'use client';
import React, { useEffect, useRef } from 'react';

interface BlackHoleAuraProps {
  size?: number; 
}

export default function BlackHoleAura({ size = 800 }: BlackHoleAuraProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = size;
    canvas.height = size;
    const centerX = size / 2;
    const centerY = size / 2;
    const maxRadius = size / 2 - 20;

    const particles: Array<{
      x: number; y: number; radius: number; angle: number;
      speed: number; color: string; size: number;
    }> = [];

    // Spawn High-Density Particles
    for (let i = 0; i < 300; i++) {
      const radius = Math.random() * maxRadius + 50;
      const angle = Math.random() * Math.PI * 2;
      particles.push({
        x: centerX + Math.cos(angle) * radius,
        y: centerY + Math.sin(angle) * radius,
        radius,
        angle,
        speed: 0.01 + Math.random() * 0.03, // Variable speed for depth
        size: Math.random() * 2 + 0.5,
        color: Math.random() > 0.5 ? '#A855F7' : '#FFD700', 
      });
    }

    const animate = () => {
      // LONG EXPOSURE TRICK: 
      // Draw a semi-transparent black rect instead of clearing.
      // This leaves "trails" of previous frames.
      ctx.fillStyle = 'rgba(2, 2, 2, 0.1)'; 
      ctx.fillRect(0, 0, size, size);
      
      particles.forEach((p) => {
        p.angle += p.speed;
        p.radius -= 0.5; // Strong suction
        
        // Respawn
        if (p.radius < 40) {
          p.radius = maxRadius;
          p.angle = Math.random() * Math.PI * 2;
        }

        p.x = centerX + Math.cos(p.angle) * p.radius;
        p.y = centerY + Math.sin(p.angle) * p.radius;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.shadowBlur = 10;
        ctx.shadowColor = p.color;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-0 mix-blend-screen"
      style={{ width: `${size}px`, height: `${size}px` }}
    />
  );
}


