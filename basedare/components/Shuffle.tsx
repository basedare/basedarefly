'use client';

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import './Shuffle.css';

interface ShuffleProps {
  text: string;
  className?: string;
  style?: React.CSSProperties;
  duration?: number;
  tag?: keyof JSX.IntrinsicElements;
  textAlign?: 'left' | 'center' | 'right';
  onShuffleComplete?: () => void;
  shuffleTimes?: number;
  stagger?: number;
  scrambleCharset?: string;
  triggerOnHover?: boolean;
}

const Shuffle: React.FC<ShuffleProps> = ({
  text,
  className = '',
  style = {},
  duration = 0.6,
  tag = 'span',
  textAlign = 'center',
  onShuffleComplete,
  shuffleTimes = 5,
  stagger = 0.02,
  scrambleCharset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*',
  triggerOnHover = true
}) => {
  const ref = useRef<HTMLElement>(null);
  const [displayChars, setDisplayChars] = useState<string[]>(() => text.split(''));
  const [isReady, setIsReady] = useState(false);
  const isAnimatingRef = useRef(false);
  const animationRef = useRef<number | null>(null);

  const randomChar = useCallback(() => {
    return scrambleCharset[Math.floor(Math.random() * scrambleCharset.length)];
  }, [scrambleCharset]);

  const animate = useCallback(() => {
    if (isAnimatingRef.current) return;
    isAnimatingRef.current = true;

    const originalChars = text.split('');
    const totalDuration = duration * 1000;
    const charDelay = stagger * 1000;

    let startTime: number | null = null;

    const step = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;

      const newChars = originalChars.map((char, index) => {
        if (char === ' ') return ' ';

        const charStartTime = index * charDelay;
        const charElapsed = elapsed - charStartTime;
        const charDuration = totalDuration * 0.8; // Each char takes 80% of total duration

        if (charElapsed < 0) {
          // Not started yet - show scrambled
          return randomChar();
        }

        if (charElapsed >= charDuration) {
          return char; // Final character
        }

        const charProgress = charElapsed / charDuration;

        // Shuffle through random chars, settling at certain progress points
        const settlePoint = 0.7 + (index / originalChars.length) * 0.2;
        if (charProgress >= settlePoint) {
          return char;
        }

        // Random char during animation
        return randomChar();
      });

      setDisplayChars(newChars);

      const totalAnimTime = totalDuration + originalChars.length * charDelay;
      if (elapsed < totalAnimTime) {
        animationRef.current = requestAnimationFrame(step);
      } else {
        setDisplayChars(originalChars);
        isAnimatingRef.current = false;
        onShuffleComplete?.();
      }
    };

    // Start with scrambled text
    setDisplayChars(originalChars.map(c => c === ' ' ? ' ' : randomChar()));
    animationRef.current = requestAnimationFrame(step);
  }, [text, duration, stagger, randomChar, onShuffleComplete]);

  // Trigger on mount and scroll into view
  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isReady) {
            setIsReady(true);
            // Small delay to ensure DOM is ready
            setTimeout(() => {
              animate();
            }, 100);
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px' }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [animate, isReady]);

  // Hover re-trigger
  const handleMouseEnter = useCallback(() => {
    if (triggerOnHover && !isAnimatingRef.current) {
      animate();
    }
  }, [triggerOnHover, animate]);

  const commonStyle = useMemo(
    () => ({ textAlign, ...style } as React.CSSProperties),
    [textAlign, style]
  );

  const classes = useMemo(
    () => `shuffle-parent ${isReady ? 'is-ready' : ''} ${className}`.trim(),
    [isReady, className]
  );

  const Tag = tag;

  return (
    <Tag
      ref={ref as any}
      className={classes}
      style={commonStyle}
      onMouseEnter={handleMouseEnter}
    >
      {displayChars.map((char, i) => (
        <span key={i} className="shuffle-char">
          {char}
        </span>
      ))}
    </Tag>
  );
};

export default Shuffle;
