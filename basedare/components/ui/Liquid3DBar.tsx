"use client";

import React from "react";

interface Liquid3DBarProps {
  value: number; // 0-100
  color?: "yellow" | "cyan" | "lime" | "purple" | "pink" | "blue";
  size?: "sm" | "md" | "lg";
  className?: string;
  showLabel?: boolean;
  label?: string;
}

const colorMap = {
  yellow: {
    bar: "rgba(250, 204, 21, 0.6)",
    glow: "rgba(250, 204, 21, 0.8)",
    shadow: "#FACC15",
  },
  cyan: {
    bar: "rgba(87, 202, 244, 0.6)",
    glow: "rgba(87, 202, 244, 0.8)",
    shadow: "#57caf4",
  },
  lime: {
    bar: "rgba(118, 201, 0, 0.6)",
    glow: "rgba(118, 201, 0, 0.8)",
    shadow: "#76c900",
  },
  purple: {
    bar: "rgba(168, 85, 247, 0.6)",
    glow: "rgba(168, 85, 247, 0.8)",
    shadow: "#a855f7",
  },
  pink: {
    bar: "rgba(236, 0, 140, 0.6)",
    glow: "rgba(236, 0, 140, 0.8)",
    shadow: "#ec008c",
  },
  blue: {
    bar: "rgba(59, 130, 246, 0.6)",
    glow: "rgba(59, 130, 246, 0.8)",
    shadow: "#3B82F6",
  },
};

const sizeMap = {
  sm: { height: "3em", barHeight: "1em", fontSize: "0.75em" },
  md: { height: "5em", barHeight: "1.5em", fontSize: "1em" },
  lg: { height: "8em", barHeight: "2em", fontSize: "1.25em" },
};

export const Liquid3DBar: React.FC<Liquid3DBarProps> = ({
  value,
  color = "purple",
  size = "md",
  className = "",
  showLabel = false,
  label,
}) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const colors = colorMap[color];
  const sizes = sizeMap[size];
  const faceColor = "rgba(255, 255, 255, 0.15)";

  return (
    <div className={`relative ${className}`} style={{ fontSize: sizes.fontSize }}>
      {/* 3D Bar Chart Container */}
      <div
        className="chart"
        style={{
          perspective: "1000px",
          perspectiveOrigin: "50% 50%",
        }}
      >
        <div
          className="bar"
          style={{
            position: "relative",
            height: sizes.height,
            transition: "all 0.3s ease-in-out",
            transform: "rotateX(60deg) rotateY(0deg)",
            transformStyle: "preserve-3d",
          }}
        >
          {/* Floor face */}
          <div
            className="face floor"
            style={{
              position: "relative",
              width: "100%",
              height: sizes.barHeight,
              backgroundColor: faceColor,
              transform: `rotateX(90deg) rotateY(0) translateX(0) translateY(${sizes.barHeight}) translateZ(-${sizes.barHeight})`,
              boxShadow: `0 0.1em 0.6em rgba(0,0,0,0.3), 0.6em -0.5em 3em rgba(0,0,0,0.3)`,
            }}
          >
            <div
              className="growing-bar"
              style={{
                transition: "all 0.5s ease-in-out",
                backgroundColor: colors.bar,
                width: `${clampedValue}%`,
                height: "100%",
                boxShadow: `0 0 2em ${colors.shadow}`,
              }}
            />
          </div>

          {/* Side 0 (back) */}
          <div
            className="face side-0"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: sizes.barHeight,
              backgroundColor: faceColor,
              transform: `rotateX(90deg) rotateY(0) translateX(0) translateY(${sizes.barHeight}) translateZ(${sizes.barHeight})`,
            }}
          >
            <div
              className="growing-bar"
              style={{
                transition: "all 0.5s ease-in-out",
                backgroundColor: colors.bar,
                width: `${clampedValue}%`,
                height: "100%",
                boxShadow: `-0.5em -1.5em 4em ${colors.shadow}`,
              }}
            />
          </div>

          {/* Side A (left) */}
          <div
            className="face side-a"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: sizes.barHeight,
              height: sizes.barHeight,
              backgroundColor: colors.bar,
              transform: `rotateX(90deg) rotateY(-90deg) translateX(${sizes.barHeight}) translateY(calc(${sizes.barHeight} / 2)) translateZ(calc(${sizes.barHeight} / 2))`,
            }}
          />

          {/* Top face */}
          <div
            className="face top"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: sizes.barHeight,
              backgroundColor: faceColor,
              transform: `rotateX(0deg) rotateY(0) translateX(0) translateY(calc(${sizes.barHeight} * 2)) translateZ(${sizes.barHeight})`,
            }}
          />
        </div>
      </div>

      {/* Label */}
      {showLabel && (
        <div className="mt-2 text-center">
          <span className="text-xs font-mono text-gray-400">
            {label || `Level ${Math.floor(clampedValue / 10)}`}
          </span>
        </div>
      )}
    </div>
  );
};

// Simpler horizontal liquid bar for inline use
export const LiquidProgressBar: React.FC<{
  value: number;
  color?: "yellow" | "cyan" | "lime" | "purple" | "pink" | "blue";
  className?: string;
  showPercentage?: boolean;
}> = ({ value, color = "purple", className = "", showPercentage = false }) => {
  const clampedValue = Math.max(0, Math.min(100, value));
  const colors = colorMap[color];

  return (
    <div className={`relative ${className}`}>
      {/* Glass container */}
      <div
        className="relative h-3 sm:h-4 rounded-full overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.1)",
          boxShadow: "inset 0 2px 4px rgba(0, 0, 0, 0.3)",
        }}
      >
        {/* Liquid fill */}
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-all duration-500 ease-out"
          style={{
            width: `${clampedValue}%`,
            background: `linear-gradient(90deg, ${colors.bar}, ${colors.glow})`,
            boxShadow: `0 0 10px ${colors.shadow}, 0 0 20px ${colors.shadow}40`,
          }}
        >
          {/* Shine effect */}
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: "linear-gradient(180deg, rgba(255,255,255,0.4) 0%, transparent 50%)",
            }}
          />
        </div>

        {/* Bubbles effect */}
        <div className="absolute inset-0 overflow-hidden rounded-full">
          <div
            className="absolute w-1 h-1 rounded-full bg-white/40 animate-bubble"
            style={{ left: `${clampedValue * 0.3}%`, animationDelay: "0s" }}
          />
          <div
            className="absolute w-0.5 h-0.5 rounded-full bg-white/30 animate-bubble"
            style={{ left: `${clampedValue * 0.6}%`, animationDelay: "0.5s" }}
          />
          <div
            className="absolute w-1.5 h-1.5 rounded-full bg-white/20 animate-bubble"
            style={{ left: `${clampedValue * 0.8}%`, animationDelay: "1s" }}
          />
        </div>
      </div>

      {/* Percentage label */}
      {showPercentage && (
        <span className="absolute right-0 -top-5 text-[10px] sm:text-xs font-mono text-gray-400">
          {clampedValue}%
        </span>
      )}

      {/* Bubble animation styles */}
      <style jsx>{`
        @keyframes bubble {
          0%, 100% {
            transform: translateY(100%);
            opacity: 0;
          }
          50% {
            opacity: 1;
          }
          100% {
            transform: translateY(-100%);
            opacity: 0;
          }
        }
        .animate-bubble {
          animation: bubble 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default Liquid3DBar;
