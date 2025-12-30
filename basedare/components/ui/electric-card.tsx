"use client";

import React, { useId } from "react";

type Variant = "swirl" | "hue";

export type ElectricCardProps = {
  variant?: Variant;
  color?: string;
  badge?: string;
  title?: string;
  description?: string;
  width?: string;
  aspectRatio?: string;
  className?: string;
  children?: React.ReactNode;
};

const ElectricCard = ({
  variant = "swirl",
  color = "#FACC15",
  badge,
  title,
  description,
  width = "100%",
  aspectRatio = "auto",
  className = "",
  children,
}: ElectricCardProps) => {
  // FIX: Replace dynamic/random ID generation with useId()
  const componentId = useId().replace(/:/g, ''); // Generate a stable ID and clean it up for SVG use

  const ids = {
    crackle: `crackle-${componentId}`,
    noise1: `noise1-${componentId}`,
    noise2: `noise2-${componentId}`,
  };

  // Animated crackling electricity filter
  const filterURL = `url(#${ids.crackle})`;

  return (
    <div className={`ec-wrap w-full h-full ${className}`}>
      
      {/* CRACKLING ELECTRICITY FILTER 
         - Multiple turbulence layers with fast, erratic animations
         - Creates a "crackling" electric border effect
      */}
      <svg className="svg-container" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
          <filter id={ids.crackle} colorInterpolationFilters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
            {/* First turbulence layer - fast vertical crackle */}
            <feTurbulence type="turbulence" baseFrequency="0.04" numOctaves="8" result="noise1" seed="1">
              <animate attributeName="baseFrequency" values="0.04;0.08;0.04" dur="0.3s" repeatCount="indefinite" />
            </feTurbulence>
            <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
              <animate attributeName="dy" values="0;50;-50;0" dur="0.4s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1" />
            </feOffset>
            
            {/* Second turbulence layer - horizontal crackle */}
            <feTurbulence type="turbulence" baseFrequency="0.05" numOctaves="6" result="noise2" seed="2">
              <animate attributeName="baseFrequency" values="0.05;0.1;0.05" dur="0.25s" repeatCount="indefinite" />
            </feTurbulence>
            <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
              <animate attributeName="dx" values="0;-40;40;0" dur="0.35s" repeatCount="indefinite" calcMode="spline" keySplines="0.4 0 0.6 1; 0.4 0 0.6 1; 0.4 0 0.6 1" />
            </feOffset>
            
            {/* Combine the crackling layers */}
            <feComposite in="offsetNoise1" in2="offsetNoise2" operator="arithmetic" k1="0.5" k2="0.5" k3="0" k4="0" result="combinedNoise" />
            
            {/* Apply the crackling displacement */}
            <feDisplacementMap in="SourceGraphic" in2="combinedNoise" scale="18" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
      </svg>

      <div className="card-container h-full" style={{ ["--electric-border-color" as any]: color, ["--f" as any]: filterURL }}>
        <div className="inner-container h-full">
          <div className="border-outer h-full">
            {/* The element receiving the crackling distortion */}
            <div className="main-card h-full" />
          </div>
          
          {/* Glow layers with crackling flicker */}
          <div className="glow-layer-1 crackle-flicker" />
          <div className="glow-layer-2 crackle-flicker" />
        </div>

        {/* Ambient background glow with pulse */}
        <div className="background-glow crackle-pulse" />

        <div className="content-container p-6 flex flex-col justify-between z-10">
            {children ? children : (
                <>
                    <div className="content-top">
                        {badge && <div className="scrollbar-glass mb-4">{badge}</div>}
                        {title && <p className="title text-3xl font-black uppercase italic tracking-tighter">{title}</p>}
                    </div>
                    {description && (
                        <div className="content-bottom mt-auto">
                            <hr className="divider my-4" />
                            <p className="description font-mono text-xs opacity-70">{description}</p>
                        </div>
                    )}
                </>
            )}
        </div>
      </div>

      <style jsx>{`
        :root { --color-neutral-900: #020204; }
        
        /* CRACKLING FLICKER ANIMATION 
           Erratic, fast flickering like electricity
        */
        @keyframes crackleFlicker {
          0%, 100% { opacity: 1; }
          10% { opacity: 0.95; }
          20% { opacity: 0.85; }
          30% { opacity: 1; }
          45% { opacity: 0.9; }
          50% { opacity: 0.7; }
          55% { opacity: 1; }
          65% { opacity: 0.88; }
          75% { opacity: 1; }
          85% { opacity: 0.92; }
          90% { opacity: 0.8; }
          95% { opacity: 1; }
        }

        /* PULSE ANIMATION for background glow */
        @keyframes cracklePulse {
          0%, 100% { opacity: 0.1; transform: scale(1); }
          25% { opacity: 0.15; transform: scale(1.05); }
          50% { opacity: 0.12; transform: scale(0.98); }
          75% { opacity: 0.18; transform: scale(1.02); }
        }

        .crackle-flicker {
          animation: crackleFlicker 0.8s infinite;
        }

        .crackle-pulse {
          animation: cracklePulse 1.2s infinite;
        }

        .ec-wrap { position: relative; display: inline-block; color-scheme: light dark; }
        .svg-container { position: absolute; width: 0; height: 0; overflow: hidden; }
        
        .card-container {
          padding: 2px; border-radius: 1.5em; position: relative;
          --electric-light-color: color-mix(in srgb, var(--electric-border-color), white 40%);
          --gradient-color: color-mix(in srgb, var(--electric-border-color), transparent 80%);
          
          /* Static dark background */
          background: #020204;
          color: white; 
          box-shadow: 0 0 15px -5px var(--electric-border-color);
          transition: transform 0.3s ease, box-shadow 0.3s ease;
        }
        
        .ec-wrap:hover .card-container { 
          transform: translateY(-3px); 
          box-shadow: 0 5px 30px -10px var(--electric-border-color);
        }
        
        .inner-container, .border-outer { position: relative; }
        
        .border-outer { 
            border: 1px solid color-mix(in srgb, var(--electric-border-color), transparent 70%); 
            border-radius: 1.5em; padding: 2px; 
        }
        
        .main-card { 
            width: 100%; height: 100%; border-radius: 1.4em; 
            /* THE CRACKLING ELECTRIC BORDER */
            border: 2px solid var(--electric-border-color); 
            filter: var(--f); 
            background: #020204; 
            opacity: 0.9; 
        }

        .glow-layer-1, .glow-layer-2, .background-glow { border-radius: 24px; position: absolute; inset: 0; pointer-events: none; }
        
        .glow-layer-1 { 
            border: 2px solid color-mix(in srgb, var(--electric-border-color), transparent 50%); 
            filter: blur(2px); 
        }
        
        .glow-layer-2 { 
            border: 1px solid var(--electric-light-color); 
            filter: blur(4px); 
            opacity: 0.6; 
        }
        
        .background-glow { 
            filter: blur(50px); z-index: -1; 
            background: radial-gradient(circle at center, var(--electric-border-color), transparent 70%); 
            opacity: 0.1; 
        }

        .content-container { position: absolute; inset: 0; }
        .scrollbar-glass { background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 99px; padding: 4px 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; color: var(--electric-border-color); width: fit-content; }
        .divider { border-top: 1px solid rgba(255,255,255,0.1); }
      `}</style>
    </div>
  );
};

export default ElectricCard;
