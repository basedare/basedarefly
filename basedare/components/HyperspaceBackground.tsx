'use client';
import React, { useEffect, useRef } from 'react';

export default function HyperspaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // PHYSICS CONSTANTS
    const NODE_SPACING = 80; // Fixed pixels: High density everywhere
    const CONNECTION_DIST = 180; // Tight connections
    const MOUSE_INFLUENCE = 150;

    canvas.width = width;
    canvas.height = height;

    const points: { x: number; y: number; originX: number; originY: number; phase: number }[] = [];

    // FIXED DENSITY GRID GENERATION
    // We extend well beyond the viewport (-200) to ensure no edges are seen
    for (let x = -200; x < width + 200; x += NODE_SPACING) {
      for (let y = -200; y < height + 200; y += NODE_SPACING) {
        // Add randomness to break the grid pattern
        const px = x + (Math.random() - 0.5) * 50;
        const py = y + (Math.random() - 0.5) * 50;
        points.push({ x: px, originX: px, y: py, originY: py, phase: Math.random() * Math.PI * 2 });
      }
    }

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      
      // No black fill - let galaxy background show through fully
      // Just render the network nodes and connections

      // Render High-Voltage Network (Fully visible)
      const time = Date.now() / 2000;
      points.forEach((p, i) => {
        // Organic Movement
        p.x = p.originX + Math.sin(time + p.phase) * 15;
        p.y = p.originY + Math.cos(time + p.phase) * 15;

        // Draw Node (fully visible)
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(168, 85, 247, 0.6)'; // Much more visible
        ctx.fill();

        // Draw Connections (fully visible)
        for (let j = i + 1; j < points.length; j++) {
          const p2 = points[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          if (dist < CONNECTION_DIST) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            // Fully visible purple lines
            const alpha = (1 - dist / CONNECTION_DIST) * 0.5; // Much higher opacity
            ctx.strokeStyle = `rgba(168, 85, 247, ${alpha})`;
            ctx.lineWidth = 1.2;
            ctx.stroke();
          }
        }
      });

      requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      // Note: In a full prod app, we'd regenerate points here, 
      // but for visual stability we usually just let the canvas expand.
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ zIndex: -30 }}
    />
  );
}
