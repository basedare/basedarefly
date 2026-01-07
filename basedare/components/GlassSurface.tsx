/* eslint-disable react-hooks/exhaustive-deps */
'use client';

import { useEffect, useState, useRef, useId } from 'react';
import { cn } from "@/lib/utils";

const GlassSurface = ({
  children,
  width = "auto",
  height = "auto",
  borderRadius = 20,
  borderWidth = 1,
  brightness = 50,
  opacity = 0.93,
  blur = 12,
  displace = 10,
  backgroundOpacity = 0.1,
  saturation = 1.2,
  distortionScale = 20,
  redOffset = 15,
  greenOffset = 0,
  blueOffset = -15,
  className = '',
  style = {}
}: {
  children: React.ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  className?: string;
  style?: React.CSSProperties;
}) => {
  const uniqueId = useId().replace(/:/g, '-');
  const filterId = `glass-filter-${uniqueId}`;
  
  const [isSupported, setIsSupported] = useState(true);
  const feImageRef = useRef<SVGFEImageElement>(null);
  
  // Refs for direct manipulation (Performance)
  const redChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement>(null);

  // 1. GENERATE THE MAP (Low res is fine because we stretch it now)
  const generateDisplacementMap = () => {
    const svgContent = `
      <svg width="400" height="200" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradX" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stop-color="#000" />
            <stop offset="100%" stop-color="#f00" />
          </linearGradient>
          <linearGradient id="gradY" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#000" />
            <stop offset="100%" stop-color="#00f" />
          </linearGradient>
        </defs>
        <rect width="100%" height="100%" fill="url(#gradX)" />
        <rect width="100%" height="100%" fill="url(#gradY)" style="mix-blend-mode:screen" />
      </svg>
    `;
    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  };

  // 2. CHECK BROWSER SUPPORT
  useEffect(() => {
    // Safari/WebKit cannot render this filter correctly. We force the fallback.
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    setIsSupported(!isSafari);
  }, []);

  // 3. UPDATE FILTER VALUES
  useEffect(() => {
    if (!isSupported) return;
    
    // Set the map image
    if (feImageRef.current) {
      feImageRef.current.setAttribute('href', generateDisplacementMap());
    }

    // Apply the Prism/Rainbow offsets
    if (redChannelRef.current) redChannelRef.current.setAttribute('scale', (distortionScale + redOffset).toString());
    if (greenChannelRef.current) greenChannelRef.current.setAttribute('scale', (distortionScale + greenOffset).toString());
    if (blueChannelRef.current) blueChannelRef.current.setAttribute('scale', (distortionScale + blueOffset).toString());

  }, [isSupported, distortionScale, redOffset, greenOffset, blueOffset]);

  const containerStyle: React.CSSProperties = {
    ...style,
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    border: `${borderWidth}px solid rgba(255, 255, 255, 0.1)`,
  };

  return (
    <div
      className={cn(
        "relative overflow-hidden isolate",
        // === LAYOUT FIX: Ensures glass hugs content and doesn't squish ===
        "inline-flex flex-col items-center justify-center",
        "min-w-max box-border",
        className
      )}
      style={containerStyle}
    >
      {/* === MODE A: CHROME/DESKTOP (The Full Magic) === */}
      {isSupported ? (
        <>
          <svg className="absolute w-0 h-0 pointer-events-none" aria-hidden="true">
            <defs>
              <filter id={filterId} colorInterpolationFilters="sRGB" x="-50%" y="-50%" width="200%" height="200%">
                
                {/* === TILING FIX: Force the map to stretch to 100% of the container === */}
                <feImage 
                  ref={feImageRef} 
                  result="map" 
                  x="0" 
                  y="0" 
                  width="100%" 
                  height="100%" 
                  preserveAspectRatio="none" 
                />
                
                {/* RGB Split (The Rainbow Prism Effect) */}
                <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" result="dispRed" />
                <feColorMatrix in="dispRed" type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" result="red" />

                <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" result="dispGreen" />
                <feColorMatrix in="dispGreen" type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" result="green" />

                <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" xChannelSelector="R" yChannelSelector="B" result="dispBlue" />
                <feColorMatrix in="dispBlue" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" result="blue" />

                <feBlend in="red" in2="green" mode="screen" result="rg" />
                <feBlend in="rg" in2="blue" mode="screen" result="output" />
                <feGaussianBlur in="output" stdDeviation={0.5} />
              </filter>
            </defs>
          </svg>

          {/* Apply the Filter */}
          <div 
            className="absolute inset-0 -z-10"
            style={{
              backdropFilter: `url(#${filterId}) saturate(${saturation}) brightness(${1 + brightness/100})`,
              WebkitBackdropFilter: `url(#${filterId}) saturate(${saturation}) brightness(${1 + brightness/100})`,
              backgroundColor: `rgba(20, 20, 30, ${backgroundOpacity})`
            }}
          />
        </>
      ) : (
        /* === MODE B: SAFARI/MOBILE (The Robust Fallback) === */
        <div className="absolute inset-0 -z-10">
            <div 
                className="absolute inset-0" 
                style={{ 
                    backdropFilter: `blur(${blur}px) saturate(${saturation})`,
                    WebkitBackdropFilter: `blur(${blur}px) saturate(${saturation})`,
                    backgroundColor: `rgba(20, 20, 30, ${Math.max(0.3, backgroundOpacity)})`
                }} 
            />
            {/* Fake Holographic Gradient to match the Desktop vibe */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-transparent to-red-500/10 opacity-50 mix-blend-overlay pointer-events-none" />
            <div className="absolute inset-0 border border-white/10 rounded-[inherit] pointer-events-none" />
        </div>
      )}

      {/* Content */}
      <div className="relative z-10 w-full">{children}</div>
    </div>
  );
};

export default GlassSurface;
