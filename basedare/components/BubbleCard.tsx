'use client';

import React, { useId, useMemo } from 'react';
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
  const id = useId().replace(/:/g, '');

  const gradientColors = useMemo(() => generateGradientColors(color), [color]);

  return (
    <div className={`bubble-card-wrapper ${className}`}>
      {/* SVG Goo Filter */}
      <svg className="goo-filter" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id={`goo-${id}`}>
            <feGaussianBlur in="SourceGraphic" stdDeviation="10" result="blur" />
            <feColorMatrix
              in="blur"
              mode="matrix"
              values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 18 -7"
              result="goo"
            />
            <feBlend in="SourceGraphic" in2="goo" />
          </filter>
        </defs>
      </svg>

      <div className="bubble-card-container">
        {/* The hoverable button area */}
        <button
          className="bubble-card-button"
          style={{ '--bubble-color': color } as React.CSSProperties}
        >
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
        </button>

        {/* Goo effect container - sits behind button */}
        <div
          className="bubble-effect-container"
          style={{
            filter: `url(#goo-${id})`,
            '--bubble-color': color
          } as React.CSSProperties}
        >
          <span className="effect-button" />
          <span className="circle top-left" />
          <span className="circle bottom-right" />
          <span className="circle top-right" />
          <span className="circle bottom-left" />
        </div>
      </div>
    </div>
  );
}
