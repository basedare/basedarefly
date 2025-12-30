'use client'

import React, { useRef, useState, MouseEvent, useCallback } from 'react'
import { cn } from '@/lib/utils'

interface HoloCardProps {
  children: React.ReactNode
  className?: string
  imgSrc?: string
}

export default function HoloCard({ children, className, imgSrc }: HoloCardProps) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [rotate, setRotate] = useState({ x: 0, y: 0 })
  const [opacity, setOpacity] = useState(0) 
  const [bgPosition, setBgPosition] = useState({ x: 50, y: 50 })

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return

    const rect = cardRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    // Percentage 0-100
    const px = (x / rect.width) * 100
    const py = (y / rect.height) * 100
    
    setBgPosition({ x: px, y: py })
    setOpacity(1)

    // Physics Tilt
    const centerX = rect.width / 2
    const centerY = rect.height / 2
    const rotateX = ((y - centerY) / centerY) * -12 
    const rotateY = ((x - centerX) / centerX) * 12

    setRotate({ x: rotateX, y: rotateY })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setOpacity(0)
    setRotate({ x: 0, y: 0 })
    setBgPosition({ x: 50, y: 50 })
  }, [])

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={cn(
        "relative overflow-hidden rounded-xl transition-all duration-300 ease-out will-change-transform select-none group",
        className
      )}
      style={{
        transform: `perspective(1000px) rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(1, 1, 1)`,
        transformStyle: 'preserve-3d',
      }}
    >
      {/* 1. CONTENT LAYER */}
      <div className="relative z-10 w-full h-full bg-slate-950 border border-slate-800 rounded-xl overflow-hidden">
        {imgSrc ? (
            <img src={imgSrc} alt="card art" className="w-full h-full object-cover" />
        ) : (
            children
        )}
      </div>

      {/* 2. SMOOTH COSMIC FOIL (Matte Finish) */}
      <div 
        className="absolute inset-0 z-20 pointer-events-none mix-blend-color-dodge transition-opacity duration-500"
        style={{
          opacity: opacity > 0 ? 0.5 : 0, 
          backgroundImage: `
            linear-gradient(
              115deg, 
              transparent 0%, 
              rgba(168, 85, 247, 0.4) 30%,  /* Soft Purple */
              rgba(234, 179, 8, 0.4) 50%,   /* Soft Gold */
              rgba(168, 85, 247, 0.4) 70%,  /* Soft Purple */
              transparent 100%
            )
          `,
          backgroundPosition: `${bgPosition.x}% ${bgPosition.y}%`,
          backgroundSize: '350% 350%', // Wide matte spread
          filter: 'brightness(1.1) contrast(1.1) blur(2px)', // Blur for matte look
        }}
      />

      {/* 3. STARS TEXTURE */}
      <div
        className="absolute inset-0 z-30 pointer-events-none mix-blend-screen transition-opacity duration-300"
        style={{
          opacity: opacity > 0 ? 0.4 : 0,
          backgroundImage: `url("https://assets.codepen.io/13471/sparkles.gif")`,
          backgroundPosition: `${bgPosition.x}% ${bgPosition.y}%`,
          backgroundSize: '180%',
        }}
      />

      {/* 4. SURFACE GLARE */}
      <div
        className="absolute inset-0 z-40 pointer-events-none mix-blend-overlay transition-opacity duration-300"
        style={{
          opacity: opacity * 0.6,
          background: `
            radial-gradient(
              farthest-corner at ${bgPosition.x}% ${bgPosition.y}%, 
              rgba(255,255,255,0.6) 0%, 
              transparent 80%
            )
          `,
        }}
      />

      {/* 5. BORDER HIGHLIGHT */}
      <div className="absolute inset-0 border border-white/10 rounded-xl z-50 pointer-events-none" />
    </div>
  )
}

