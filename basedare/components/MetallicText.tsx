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
      // 1. Wait for fonts to load so we don't snapshot a blank or wrong font
      await document.fonts.ready;
      
      if (cancelled) return;

      const canvas = document.createElement('canvas');
      // 'willReadFrequently' optimizes the canvas for the heavy getImageData operation
      const ctx = canvas.getContext('2d', { willReadFrequently: true });

      if (!ctx) return;

      // 2. High Resolution for crisp edges on 4K/Retina screens
      const baseSize = 1800;
      canvas.width = baseSize * 1.5; 
      canvas.height = baseSize;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // 3. CRITICAL FIX: White text (#FFFFFF) creates the mask.
      // Black text would be invisible in the metallic shader.
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      // 4. FONT CONFIGURATION
      // Make sure this matches your website's main font family!
      // '900 italic' gives it that thick, speedy "BaseDare" look.
      ctx.font = '900 italic 420px system-ui, -apple-system, sans-serif'; 

      // OPTIONAL: Add a stroke to make the letters bolder/fatter
      // This gives the liquid effect more surface area to shine.
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 25;
      ctx.strokeText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);

      // Fill the text
      ctx.fillText(text.toUpperCase(), canvas.width / 2, canvas.height / 2);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

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
            edge: 0.02,         // Sharpness of the edges
            patternScale: 2.5,  // Size of the liquid ripples
            refraction: 0.02,   // How much it distorts the background
            speed: 0.4,         // Speed of the flow
            liquid: 1.2,        // Viscosity (higher = more liquid)
          }}
        />
      )}
    </div>
  );
}
