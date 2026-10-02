"use client";
import { getClientPerformanceHints } from "@/lib/client-performance";
import React, { useEffect, useRef } from "react";

export default function HyperspaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;

    // PHYSICS CONSTANTS
    const lowMemory = getClientPerformanceHints().isLowMemory;
    const NODE_SPACING = lowMemory ? 105 : 80; // Fixed pixels: High density everywhere
    const CONNECTION_DIST = 180; // Tight connections

    canvas.width = width;
    canvas.height = height;

    const points: {
      x: number;
      y: number;
      originX: number;
      originY: number;
      phase: number;
    }[] = [];

    const regenerate = () => {
      points.length = 0;
      // FIXED DENSITY GRID GENERATION
      // We extend well beyond the viewport (-200) to ensure no edges are seen
      for (let x = -200; x < width + 200; x += NODE_SPACING) {
        for (let y = -200; y < height + 200; y += NODE_SPACING) {
          // Add randomness to break the grid pattern
          const px = x + (Math.random() - 0.5) * 50;
          const py = y + (Math.random() - 0.5) * 50;
          points.push({
            x: px,
            originX: px,
            y: py,
            originY: py,
            phase: Math.random() * Math.PI * 2,
          });
        }
      }
    };
    regenerate();
    // Origins are fixed; only nearby pairs can connect during the 15px drift.
    let pairs: [number, number][] = [];
    const connect = () => {
      pairs = [];
      for (let i = 0; i < points.length; i++)
        for (let j = i + 1; j < points.length; j++) {
          if (
            Math.hypot(
              points[i].originX - points[j].originX,
              points[i].originY - points[j].originY
            ) <
            CONNECTION_DIST + 45
          )
            pairs.push([i, j]);
        }
    };
    connect();
    let frameId = 0;
    let disposed = false;
    let lastFrame = 0;
    const animate = (now: number) => {
      if (disposed || document.hidden) return;
      frameId = requestAnimationFrame(animate);
      if (now - lastFrame < 1000 / (lowMemory ? 20 : 30)) return;
      lastFrame = now;
      ctx.clearRect(0, 0, width, height);

      // No black fill - let galaxy background show through fully
      // Just render the network nodes and connections

      // Render High-Voltage Network (Fully visible)
      const time = Date.now() / 2000;
      points.forEach((p) => {
        // Organic Movement
        p.x = p.originX + Math.sin(time + p.phase) * 15;
        p.y = p.originY + Math.cos(time + p.phase) * 15;

        // Draw Node (fully visible)
        ctx.beginPath();
        ctx.arc(p.x, p.y, 2, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(168, 85, 247, 0.6)"; // Much more visible
        ctx.fill();
      });
      // Precomputed neighbors avoid scanning every node pair on every frame.
      for (const [i, j] of pairs) {
        const p = points[i];
        const p2 = points[j];
        const dx = p.x - p2.x;
        const dy = p.y - p2.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
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
    };
    const visibility = () => {
      cancelAnimationFrame(frameId);
      if (!document.hidden) frameId = requestAnimationFrame(animate);
    };
    document.addEventListener("visibilitychange", visibility);
    frameId = requestAnimationFrame(animate);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
      regenerate();
      connect();
    };

    window.addEventListener("resize", handleResize);
    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 z-[6] h-full w-full pointer-events-none"
    />
  );
}
