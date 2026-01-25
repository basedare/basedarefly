"use client";

import React from "react";
import { motion } from "framer-motion";

interface LiquidMetalButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: "button" | "submit";
  size?: "sm" | "md" | "lg";
}

export const LiquidMetalButton: React.FC<LiquidMetalButtonProps> = ({
  children,
  onClick,
  disabled = false,
  className = "",
  type = "button",
  size = "md",
}) => {
  const sizeClasses = {
    sm: "px-4 py-2.5 text-xs",
    md: "px-6 py-3.5 text-sm",
    lg: "px-8 py-4 text-base",
  };

  return (
    <div
      className={`relative group p-[1.5px] rounded-xl overflow-hidden transition-all duration-500 ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      } ${className}`}
    >
      {/* Liquid metal spinning border - only animates on hover */}
      <div
        className={`
          absolute inset-[-100%]
          bg-[conic-gradient(from_0deg,#1a1a1a_0%,#525252_15%,#a3a3a3_25%,#fff_30%,#a3a3a3_35%,#525252_45%,#1a1a1a_50%,#525252_65%,#a3a3a3_75%,#fff_80%,#a3a3a3_85%,#525252_95%,#1a1a1a_100%)]
          ${disabled ? "" : "group-hover:animate-[spin_2.5s_linear_infinite]"}
          transition-all duration-500
        `}
        aria-hidden="true"
      />

      {/* Button content */}
      <motion.button
        type={type}
        whileTap={disabled ? undefined : { scale: 0.98 }}
        onClick={disabled ? undefined : onClick}
        disabled={disabled}
        className={`
          relative w-full h-full flex items-center justify-center gap-2
          bg-[#0a0a0a] backdrop-blur-xl rounded-[10px]
          font-bold uppercase tracking-wider
          transition-all duration-300
          ${disabled ? "cursor-not-allowed" : "cursor-pointer"}
          ${sizeClasses[size]}
        `}
      >
        {/* Subtle inner glow */}
        <div className="absolute inset-0 rounded-[10px] bg-gradient-to-tr from-white/[0.08] via-transparent to-white/[0.04] pointer-events-none" />

        {/* Content */}
        <span
          className={`
            relative z-10 flex items-center gap-2
            text-white transition-all duration-300
            ${disabled ? "" : "group-hover:tracking-[0.15em]"}
          `}
        >
          {children}
        </span>
      </motion.button>
    </div>
  );
};

export default LiquidMetalButton;
