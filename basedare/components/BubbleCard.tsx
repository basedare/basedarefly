'use client';

import React, { useMemo } from 'react';
import GradientText from './GradientText';
import './BubbleCard.css';

interface BubbleCardProps {
  badge?: string;
  title?: string;
  description?: string;
  color?: string;
  className?: string;
}

// Helper to generate gradient colors from base color
function generateGradientColors(baseColor: string): string[] {
  // Create a lighter and slightly different hue variant
  const colorMap: Record<string, string[]> = {
    '#A855F7': ['#A855F7', '#E879F9', '#C084FC'], // Purple
    '#FACC15': ['#FACC15', '#FDE68A', '#F59E0B'], // Gold/Yellow
    '#3B82F6': ['#3B82F6', '#93C5FD', '#60A5FA'], // Blue
    '#22D3EE': ['#22D3EE', '#A5F3FC', '#67E8F9'], // Cyan
  };

  return colorMap[baseColor] || [baseColor, '#FFFFFF', baseColor];
}

export default function BubbleCard({
  badge = 'Badge',
  title = 'Title',
  description = 'Description text goes here.',
  color = '#A855F7',
  className = ''
}: BubbleCardProps) {
  const gradientColors = useMemo(() => generateGradientColors(color), [color]);

  const handlePointerMove = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    event.currentTarget.style.setProperty('--x', `${x}px`);
    event.currentTarget.style.setProperty('--y', `${y}px`);
    event.currentTarget.style.setProperty('--width', `${rect.width}px`);
    event.currentTarget.style.setProperty('--height', `${rect.height}px`);
  };

  const handlePointerLeave = (event: React.PointerEvent<HTMLButtonElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    event.currentTarget.style.setProperty('--x', `${rect.width / 2}px`);
    event.currentTarget.style.setProperty('--y', `${rect.height / 2}px`);
  };

  return (
    <div className={`bubble-card-wrapper ${className}`}>
      <div className="bubble-card-container">
        {/* The hoverable button area */}
        <button
          className="bubble-card-button"
          style={{ '--bubble-color': color } as React.CSSProperties}
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <span className="bubble-card-reactive-glow" aria-hidden="true" />
          <span className="bubble-card-reactive-sheen" aria-hidden="true" />
          <span className="bubble-card-panel bd-dent-surface bd-dent-surface--soft">
            <span className="bubble-card-content">
              <span className="bubble-badge">{badge}</span>
              <span className="bubble-title">
                <GradientText
                  colors={gradientColors}
                  animationSpeed={6}
                  className="bubble-gradient-title"
                >
                  {title}
                </GradientText>
              </span>
              <span className="bubble-divider" />
              <span className="bubble-description">{description}</span>
            </span>
          </span>
        </button>
      </div>
    </div>
  );
}
