'use client';

import { useEffect, useState } from 'react';
import MetallicPaint from './MetallicPaint';

interface MetallicTextProps {
  text: string;
  className?: string;
}

export default function MetallicText({ text, className }: MetallicTextProps) {
  const [logoData, setLogoData] = useState<ImageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const generateTextMask = async () => {
      // 1. Wait for fonts to load
      await document.fonts.ready;

      if (cancelled) return;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) return;

      // 2. Size for crisp text - balanced for quality
      const fontSize = 500;
      const padding = 60;

      // Measure text to get proper canvas size
      ctx.font = `900 italic ${fontSize}px "Bricolage Grotesque", system-ui, sans-serif`;
      const metrics = ctx.measureText(text.toUpperCase());

      const width = Math.ceil(metrics.width + padding * 2);
      const height = Math.ceil(fontSize * 1.3 + padding * 2);

      canvas.width = width;
      canvas.height = height;

      // 3. WHITE background - shader makes this transparent
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, width, height);

      // 4. BLACK text - shader makes this the liquid metal
      ctx.fillStyle = '#000000';
      ctx.font = `900 italic ${fontSize}px "Bricolage Grotesque", system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(text.toUpperCase(), width / 2, height / 2);

      const imageData = ctx.getImageData(0, 0, width, height);

      if (!cancelled) {
        setLogoData(imageData);
        setIsLoading(false);
      }
    };

    generateTextMask();

    return () => {
      cancelled = true;
    };
  }, [text]);

  return (
    <div className={`relative ${className}`}>
      {/* FALLBACK STATE: 
         Visible while loading or if WebGL crashes. 
         Matches the "Glitch" aesthetic so the user doesn't see a blank space.
      */}
      {(isLoading || !logoData) && (
        <h1 className="absolute inset-0 flex items-center justify-center text-5xl md:text-8xl lg:text-9xl font-black italic tracking-tighter text-transparent bg-clip-text bg-gradient-to-br from-purple-400 to-blue-600 opacity-70 select-none">
          {text.toUpperCase()}
        </h1>
      )}

      {/* THE LIQUID METAL EFFECT */}
      {logoData && (
        <MetallicPaint
          imageData={logoData}
          params={{
            edge: 1,            // Sharpness of the edges (higher = sharper)
            patternScale: 2,    // Size of the liquid ripples
            refraction: 0.015,  // How much it distorts
            speed: 0.3,         // Speed of the flow
            liquid: 0.07,       // Viscosity
          }}
        />
      )}
    </div>
  );
}
