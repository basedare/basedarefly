'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';

interface MatrixRainProps {
  trigger: boolean;
  onComplete?: () => void;
}

/**
 * MatrixRain - Chaos → Control transition
 * Matrix rain → subtle fade to white
 * Mobile optimized: fewer columns, larger font, shorter duration
 */
export default function MatrixRain({ trigger, onComplete }: MatrixRainProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [phase, setPhase] = useState<'idle' | 'rain' | 'fade'>('idle');
  const [isMobile, setIsMobile] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  // Detect mobile on mount
  useEffect(() => {
    setIsMobile(window.innerWidth < 768);
  }, []);

  useEffect(() => {
    if (trigger && !isAnimating) {
      setIsAnimating(true);
      setPhase('rain');

      // Shorter duration on mobile
      const rainDuration = isMobile ? 300 : 400;
      const totalDuration = isMobile ? 550 : 700;

      setTimeout(() => setPhase('fade'), rainDuration);
      setTimeout(() => {
        setPhase('idle');
        setIsAnimating(false);
        onComplete?.();
      }, totalDuration);
    }
  }, [trigger, isAnimating, onComplete, isMobile]);

  // Matrix rain canvas - mobile optimized
  useEffect(() => {
    if (phase !== 'rain' || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Use device pixel ratio for crisp rendering, but cap it for performance
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    ctx.scale(dpr, dpr);

    const chars = '01アイウエオカキクケコ';
    const charArray = chars.split('');

    // Mobile: larger font, fewer columns = less rendering
    const fontSize = isMobile ? 20 : 16;
    const columns = Math.floor(window.innerWidth / fontSize);

    // Mobile: skip some columns for performance
    const skipFactor = isMobile ? 2 : 1;
    const drops: number[] = Array(Math.floor(columns / skipFactor))
      .fill(0)
      .map(() => Math.random() * -30);

    let frameCount = 0;
    const maxFrames = isMobile ? 20 : 28;

    const draw = () => {
      frameCount++;
      ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
      ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);

      for (let i = 0; i < drops.length; i++) {
        const char = charArray[Math.floor(Math.random() * charArray.length)];
        const x = i * fontSize * skipFactor;
        const y = drops[i] * fontSize;

        const brightness = 200 + Math.random() * 55;
        ctx.fillStyle = `rgba(0, ${brightness}, 70, 0.9)`;
        ctx.font = `${fontSize}px monospace`;
        ctx.fillText(char, x, y);

        drops[i] += isMobile ? 1 : 0.8;
        if (y > window.innerHeight) {
          drops[i] = Math.random() * -10;
        }
      }

      if (frameCount < maxFrames && phase === 'rain') {
        animationRef.current = requestAnimationFrame(draw);
      }
    };

    draw();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [phase, isMobile]);

  return (
    <AnimatePresence>
      {isAnimating && (
        <>
          {/* Black base */}
          <motion.div
            className="fixed inset-0 z-[9996] pointer-events-none bg-black"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'rain' ? 1 : 0
            }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          />

          {/* Matrix rain canvas */}
          <motion.canvas
            ref={canvasRef}
            className="fixed inset-0 z-[9997] pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'rain' ? 1 : 0
            }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
          />

          {/* Subtle white fade */}
          <motion.div
            className="fixed inset-0 z-[9998] pointer-events-none bg-white"
            initial={{ opacity: 0 }}
            animate={{
              opacity: phase === 'fade' ? 1 : 0
            }}
            transition={{
              duration: 0.3,
              ease: [0.4, 0, 0.2, 1]
            }}
          />
        </>
      )}
    </AnimatePresence>
  );
}
