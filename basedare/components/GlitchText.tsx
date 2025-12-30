'use client';
import React from 'react';
import './GlitchText.css';

interface GlitchTextProps {
  children: React.ReactNode;
  speed?: number;
  className?: string;
  enableShadows?: boolean;
  glowColor?: string;
}

export default function GlitchText({ 
  children, 
  speed = 0.5, 
  className = '', 
  enableShadows = true,
  glowColor = '#FFD700'
}: GlitchTextProps) {
  return (
    <div 
      className={`glitch-text ${className}`}
      data-text={children}
      style={{
        '--glitch-speed': `${speed}s`,
        '--glow-color': glowColor,
      } as React.CSSProperties}
    >
      <span className={enableShadows ? 'glitch-shadows' : ''} style={{ textShadow: enableShadows ? `0 0 15px ${glowColor}40` : undefined }}>{children}</span>
    </div>
  );
}

