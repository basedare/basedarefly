"use client";

import React, { useMemo } from "react";

type Variant = "swirl" | "hue" | "cosmos"; // Added 'cosmos'

export type ElectricCardProps = {
  /** Visual style: "swirl", "hue", or the new "cosmos" */
  variant?: Variant;
  /** Accent / border color. For cosmos, this tints the stars/nebula. */
  color?: string;
  badge?: string;
  title?: string;
  description?: string;
  width?: string;
  aspectRatio?: string;
  className?: string;
};

export const ElectricCard = ({
  variant = "swirl",
  color = "#dd8448",
  badge = "Dramatic",
  title = "Original",
  description = "In case you'd like to emphasize something very dramatically.",
  width = "100%", 
  aspectRatio = "4 / 5", 
  className = "",
}: ElectricCardProps) => {
  
  const ids = useMemo(() => {
    const key = Math.random().toString(36).slice(2, 8);
    return {
      swirl: `swirl-${key}`,
      hue: `hue-${key}`,
      cosmos: `cosmos-${key}`, // New ID
    };
  }, []);

  // Map variant to filter
  let filterURL = `url(#${ids.swirl})`;
  if (variant === "hue") filterURL = `url(#${ids.hue})`;
  if (variant === "cosmos") filterURL = `url(#${ids.cosmos})`;

  return (
    <div className={`ec-wrap w-full max-w-full ${className}`}>
      
      {/* --- SVG FILTERS --- */}
      <svg className="svg-container" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          {/* 1. SWIRL FILTER */}
          <filter id={ids.swirl} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate attributeName="dy" values="700; 0" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate attributeName="dy" values="0; -700" dur="6s" repeatCount="indefinite" calcMode="linear" />
            </feOffset>
            <feBlend in="offsetNoise1" in2="offsetNoise2" mode="color-dodge" result="combinedNoise" />
            <feDisplacementMap in="SourceGraphic" in2="combinedNoise" scale="30" xChannelSelector="R" yChannelSelector="B" />
          </filter>

          {/* 2. HUE FILTER */}
          <filter id={ids.hue} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="7" />
            <feColorMatrix type="hueRotate">
              <animate attributeName="values" values="0;360;" dur=".6s" repeatCount="indefinite" calcMode="paced" />
            </feColorMatrix>
            <feDisplacementMap in="SourceGraphic" scale="30" xChannelSelector="R" yChannelSelector="B" />
          </filter>

          {/* 3. COSMOS VORTEX FILTER (New) */}
          <filter id={ids.cosmos} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            {/* Fractal noise creates the "cloud/nebula" texture */}
            <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="5" result="nebula" />
            
            {/* Shift the nebula slowly to make it feel alive */}
            <feOffset in="nebula" dx="0" dy="0" result="movedNebula">
               <animate attributeName="dx" values="0; -100" dur="20s" repeatCount="indefinite" />
            </feOffset>

            {/* Distort the source graphic (the spinning vortex) with the nebula texture */}
            <feDisplacementMap in="SourceGraphic" in2="movedNebula" scale="40" xChannelSelector="R" yChannelSelector="G" />
            
            {/* Add a subtle glow/blur to smooth the stars */}
            <feGaussianBlur stdDeviation="0.5" />
          </filter>
        </defs>
      </svg>

      {/* --- CARD STRUCTURE --- */}
      <div 
        className={`card-container ${variant === "cosmos" ? "variant-cosmos" : ""}`}
        style={{ 
          ["--electric-border-color" as any]: color, 
          ["--f" as any]: filterURL 
        }}
      >
        <div className="inner-container">
          <div className="border-outer">
            {/* The Main Card Background */}
            <div className="main-card">
              {variant === "cosmos" && (
                <>
                  {/* The Spinning Vortex Layer */}
                  <div className="cosmos-vortex" />
                  {/* The Star Shimmer Layer */}
                  <div className="cosmos-stars" />
                </>
              )}
            </div>
          </div>
          <div className="glow-layer-1" />
          <div className="glow-layer-2" />
        </div>

        <div className="overlay-1" />
        <div className="overlay-2" />
        <div className="background-glow" />

        <div className="content-container">
          <div className="content-top">
            <div className="scrollbar-glass">{badge}</div>
            <p className="title">{title}</p>
          </div>

          <hr className="divider" />

          <div className="content-bottom">
            <p className="description">{description}</p>
          </div>
        </div>
      </div>

      <style jsx>{`
        :root {
          --color-neutral-900: oklch(0.185 0 0);
        }

        .ec-wrap {
          position: relative;
          display: inline-block;
          color-scheme: light dark;
          width: 100%;
          max-width: 100%;
          overflow: hidden;
        }

        .svg-container {
          position: absolute;
          width: 0;
          height: 0;
          overflow: hidden;
        }

        .card-container {
          padding: 2px;
          border-radius: 1.5em;
          position: relative;
          
          /* Default Colors */
          --electric-light-color: oklch(from var(--electric-border-color) l c h);
          --gradient-color: oklch(from var(--electric-border-color) 0.3 calc(c / 2) h / 0.4);

          background: linear-gradient(-30deg, var(--gradient-color), transparent, var(--gradient-color)),
            linear-gradient(to bottom, var(--color-neutral-900), var(--color-neutral-900));
          color: oklch(0.985 0 0);

          /* Hover Physics */
          transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.4s ease;
        }

        /* COSMOS VARIANT OVERRIDES */
        .card-container.variant-cosmos {
          --electric-light-color: #d8b4fe; /* Light Purple */
          --gradient-color: #581c87;      /* Dark Purple */
          background: linear-gradient(to bottom, #0f0518, #2e1065); /* Deep cosmic bg */
        }

        .card-container:hover {
          transform: translateY(-8px) scale(1.02);
          box-shadow: 0 20px 40px -5px rgba(0, 0, 0, 0.4);
          z-index: 10;
        }

        .inner-container { position: relative; }

        .border-outer {
          border: 2px solid oklch(from var(--electric-border-color) l c h / 0.5);
          border-radius: 1.5em;
          padding-right: 0.15em;
          padding-bottom: 0.15em;
        }

        .main-card {
          width: 100%;
          max-width: 100%;
          aspect-ratio: ${aspectRatio};
          border-radius: 1.5em;
          border: 2px solid var(--electric-border-color);
          margin-top: -4px;
          margin-left: -4px;
          filter: var(--f);
          background: oklch(0.145 0 0);
          position: relative;
          overflow: hidden;
        }

        /* --- COSMOS VORTEX & STARS --- */
        
        .cosmos-vortex {
          position: absolute;
          top: -50%;
          left: -50%;
          width: 200%;
          height: 200%;
          /* The Vortex Gradient */
          background: conic-gradient(
            from 0deg at 50% 50%,
            transparent 0deg,
            var(--electric-border-color) 40deg,
            transparent 80deg,
            #4c1d95 120deg, /* Violet */
            transparent 160deg,
            var(--electric-border-color) 200deg,
            transparent 240deg,
            #0f172a 280deg, /* Dark Slate */
            transparent 360deg
          );
          opacity: 0.6;
          animation: vortexSpin 20s linear infinite;
        }

        .cosmos-stars {
          position: absolute;
          inset: 0;
          background-image: 
            radial-gradient(white 1px, transparent 1px),
            radial-gradient(rgba(255,255,255,0.7) 1px, transparent 1px);
          background-size: 40px 40px, 90px 90px;
          background-position: 0 0, 20px 20px;
          opacity: 0.5;
          mix-blend-mode: overlay;
          animation: starShimmer 4s ease-in-out infinite alternate;
        }

        @keyframes vortexSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes starShimmer {
          0% { opacity: 0.3; transform: scale(0.9); }
          100% { opacity: 0.8; transform: scale(1.1); }
        }

        /* --------------------------- */

        .glow-layer-1, .glow-layer-2, .overlay-1, .overlay-2, .background-glow {
          border-radius: 24px;
          position: absolute;
          inset: 0;
        }

        .glow-layer-1 {
          border: 2px solid oklch(from var(--electric-border-color) l c h / 0.6);
          filter: blur(1px);
        }

        .glow-layer-2 {
          border: 2px solid var(--electric-light-color);
          filter: blur(4px);
        }

        .overlay-1, .overlay-2 {
          mix-blend-mode: overlay;
          transform: scale(1.1);
          filter: blur(16px);
          background: linear-gradient(-30deg, white, transparent 30%, transparent 70%, white);
        }
        .overlay-1 { opacity: 1; }
        .overlay-2 { opacity: 0.5; }

        .background-glow {
          filter: blur(32px);
          transform: scale(1.1);
          opacity: 0.3;
          z-index: -1;
          background: linear-gradient(-30deg, var(--electric-light-color), transparent, var(--electric-border-color));
        }

        .content-container {
          position: absolute;
          inset: 0;
          display: flex;
          flex-direction: column;
        }

        .content-top {
          display: flex;
          flex-direction: column;
          padding: 24px;
          padding-bottom: 16px;
          height: 100%;
        }

        .content-bottom {
          display: flex;
          flex-direction: column;
          padding: 24px;
          padding-top: 16px;
        }

        .scrollbar-glass {
          background: radial-gradient(47.2% 50% at 50.39% 88.37%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%), rgba(255, 255, 255, 0.04);
          position: relative;
          transition: background 0.3s ease;
          border-radius: 14px;
          width: fit-content;
          padding: 0.5em 1em;
          text-transform: uppercase;
          font-weight: bold;
          font-size: 0.85em;
          color: rgba(255, 255, 255, 0.8);
        }
        .scrollbar-glass:hover {
          background: radial-gradient(47.2% 50% at 50.39% 88.37%, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0) 100%), rgba(255, 255, 255, 0.08);
        }

        /* TITLE */
        .title {
          font-size: 1.65em;
          font-weight: 900;
          font-style: italic;
          letter-spacing: -0.02em;
          margin-top: auto;
          color: transparent;
          background: linear-gradient(180deg, #ffffff, #a5a5a5);
          -webkit-background-clip: text;
          background-clip: text;
          text-shadow: 0 2px 10px rgba(0,0,0,0.3);
          font-family: monospace;
          line-height: 1.1;
          word-wrap: break-word;
        }

        .description {
          opacity: 0.8; /* Increased opacity for readability on dark cards */
          font-size: 0.95em;
          line-height: 1.5;
        }

        .divider {
          margin-top: auto;
          border: none;
          height: 1px;
          background-color: currentColor;
          opacity: 0.1;
          mask-image: linear-gradient(to right, transparent, black, transparent);
          -webkit-mask-image: linear-gradient(to right, transparent, black, transparent);
        }
      `}</style>
    </div>
  );
};
