'use client';

import { useEffect, useRef } from "react";

export default function GalaxyBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let width = window.innerWidth;
    let height = window.innerHeight;
    canvas.width = width;
    canvas.height = height;

    const stars: { x: number; y: number; size: number; speed: number; alpha: number }[] = [];
    const honeyDrops: { x: number; y: number; length: number; speed: number; angle: number; active: boolean }[] = [];

    // Static Stars
    for (let i = 0; i < 150; i++) {
      stars.push({
        x: Math.random() * width,
        y: Math.random() * height,
        size: Math.random() * 2,
        speed: Math.random() * 0.1,
        alpha: Math.random(),
      });
    }

    // Honey Drop Spawner
    const spawner = setInterval(() => {
        honeyDrops.push({
            x: Math.random() * width,
            y: -50,
            length: Math.random() * 80 + 50,
            speed: Math.random() * 4 + 2, // Slow drip speed
            angle: Math.PI / 2.5, // Slight angle
            active: true
        });
    }, 1500); 

    function animate() {
      if(!ctx || !canvas) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw Stars
      stars.forEach((star) => {
        ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
        star.y += star.speed;
        if (star.y > canvas.height) star.y = 0;
      });

      // Draw Honey Flow
      honeyDrops.forEach((drop, index) => {
          if (!drop.active) return;
          
          const tailX = drop.x - drop.length * Math.cos(drop.angle);
          const tailY = drop.y - drop.length * Math.sin(drop.angle);

          const gradient = ctx.createLinearGradient(drop.x, drop.y, tailX, tailY);
          gradient.addColorStop(0, "rgba(250, 204, 21, 0.8)"); // Gold Head
          gradient.addColorStop(1, "rgba(168, 85, 247, 0)"); // Purple Tail

          ctx.beginPath();
          ctx.strokeStyle = gradient;
          ctx.lineWidth = 3;
          ctx.lineCap = "round";
          ctx.moveTo(tailX, tailY);
          ctx.lineTo(drop.x, drop.y);
          ctx.stroke();

          drop.x += drop.speed * Math.cos(drop.angle);
          drop.y += drop.speed * Math.sin(drop.angle);

          if (drop.y > canvas.height) {
              drop.active = false;
              honeyDrops.splice(index, 1);
          }
      });

      requestAnimationFrame(animate);
    }

    animate();

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener("resize", handleResize);
    return () => {
        window.removeEventListener("resize", handleResize);
        clearInterval(spawner);
    };
  }, []);

  return <canvas ref={canvasRef} className="fixed inset-0 z-[-1] pointer-events-none bg-[#020204]" />;
}
