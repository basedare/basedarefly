'use client';

import { ReactNode } from "react";

interface MetallicTextProps {
  children: ReactNode;
  className?: string;
}

export default function MetallicText({ children, className = "" }: MetallicTextProps) {
  return (
    <span className={`inline-block metallic-text ${className}`}>
      {children}
    </span>
  );
}

