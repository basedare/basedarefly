'use client';
import React, { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

export default function BlackHolePeeBear() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 800;
    const centerX = 400;
    const centerY = 400;
    const particles: any[] = [];

    for (let i = 0; i < 150; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        radius: 100 + Math.random() * 250,
        speed: 0.005 + Math.random() * 0.015,
        size: Math.random() * 2 + 0.5,
        color: Math.random() > 0.5 ? '#A855F7' : '#FFD700'
      });
    }

    const animate = () => {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, 800, 800);
      particles.forEach(p => {
        p.angle += p.speed;
        p.radius -= 0.1;
        if (p.radius < 50) p.radius = 350;
        const x = centerX + Math.cos(p.angle) * p.radius;
        const y = centerY + Math.sin(p.angle) * p.radius;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
      });
      requestAnimationFrame(animate);
    };
    animate();
  }, []);

  return (
    <div className="relative w-full h-[400px] flex items-center justify-center overflow-visible z-10">
      <canvas ref={canvasRef} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] opacity-60 pointer-events-none mix-blend-screen" />
      <div className="absolute w-64 h-64 bg-purple-900/20 rounded-full blur-3xl animate-pulse" />
      <motion.div animate={{ y: [0, -10, 0] }} transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }} className="relative z-20 w-48 h-48 bg-black rounded-full border-2 border-purple-500/30 flex items-center justify-center shadow-2xl">
        <span className="text-6xl">🐻</span>
      </motion.div>
    </div>
  );
}
