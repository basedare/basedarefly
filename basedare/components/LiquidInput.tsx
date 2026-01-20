'use client';

import React, { useState, useRef, useEffect } from 'react';
import { cn } from "@/lib/utils";

// Popular streamer tags for autocomplete
const STREAMER_SUGGESTIONS = [
  '@KaiCenat',
  '@xQc',
  '@Asmongold',
  '@Pokimane',
  '@Ninja',
  '@shroud',
  '@TimTheTatman',
  '@DrDisrespect',
  '@Speed',
  '@AdinRoss',
  '@HasanAbi',
  '@Mizkif',
  '@Ludwig',
  '@Valkyrae',
  '@Sykkuno',
];

interface LiquidInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  prefix?: string;
  value?: string;
  onChange?: (value: string) => void;
  onStreamerSelect?: (tag: string) => void;
}

export function LiquidInput({ className, prefix, value, onChange, onStreamerSelect, ...props }: LiquidInputProps) {
  const [internalValue, setInternalValue] = useState(value || '');
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync with external value
  useEffect(() => {
    if (value !== undefined) {
      setInternalValue(value);
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInternalValue(newValue);
    onChange?.(newValue);

    // Check for @ mentions and show suggestions
    const atMatch = newValue.match(/@(\w*)$/);
    if (atMatch) {
      const query = atMatch[1].toLowerCase();
      const filtered = STREAMER_SUGGESTIONS.filter(tag =>
        tag.toLowerCase().includes(query) || tag.toLowerCase().startsWith('@' + query)
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(0);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (tag: string) => {
    // Replace the partial @mention with the full tag
    const newValue = internalValue.replace(/@\w*$/, tag + ' ');
    setInternalValue(newValue);
    onChange?.(newValue);
    onStreamerSelect?.(tag);
    setShowSuggestions(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && suggestions[selectedIndex]) {
      e.preventDefault();
      handleSuggestionClick(suggestions[selectedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  return (
    <div className="relative group w-full max-w-xl mx-auto">
      {/* 1. The Liquid Glow Container (Purple/Blue) */}
      <div className="absolute -inset-[3px] bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 rounded-xl blur-md opacity-60 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 pointer-events-none" />

      {/* 2. The Spinning Liquid Border */}
      <div className="absolute -inset-[1px] rounded-xl overflow-hidden pointer-events-none">
        <div className="absolute inset-[-100%] bg-[conic-gradient(from_0deg,#000_0%,#000_20%,#A855F7_35%,#fff_45%,#3B82F6_60%,#000_80%,#000_100%)] group-hover:animate-[spin_4s_linear_infinite] opacity-100 blur-[2px] contrast-150 transition-all duration-500" />
      </div>

      {/* 3. The Input Itself (Black Inner) */}
      <div className="relative rounded-xl p-[2px] backface-hidden transform translate-z-0">
        <div className="relative bg-[#120a00] rounded-[10px] flex items-center h-16 px-6 border border-purple-500/20 shadow-2xl">
          {prefix && (
            <span className="mr-2 text-[#FFD700] font-black text-2xl select-none drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
              {prefix}
            </span>
          )}
          <input
            ref={inputRef}
            value={internalValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            {...props}
            className={cn(
              "w-full bg-transparent border-none text-xl font-bold text-white placeholder:text-white/40 focus:ring-0 focus:outline-none font-mono tracking-wide",
              className
            )}
          />
        </div>
      </div>

      {/* 4. Autocomplete Suggestions Dropdown */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-2 z-50">
          <div className="bg-black/95 backdrop-blur-xl border border-purple-500/30 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            {suggestions.map((tag, index) => (
              <button
                key={tag}
                onClick={() => handleSuggestionClick(tag)}
                className={cn(
                  "w-full px-4 py-3 text-left font-mono text-sm transition-colors flex items-center gap-3",
                  index === selectedIndex
                    ? "bg-purple-500/20 text-white"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <span className="text-purple-400">@</span>
                <span>{tag.slice(1)}</span>
                <span className="ml-auto text-[10px] text-gray-600 uppercase">Streamer</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
