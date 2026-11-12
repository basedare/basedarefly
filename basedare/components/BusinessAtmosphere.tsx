"use client";
import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { getClientPerformanceHints } from "@/lib/client-performance";
const ParticleNetwork = dynamic(() => import("./ParticleNetwork"), {
  ssr: false,
});

/** The original Control node network, carried onto the actual business entry. */
export default function BusinessAtmosphere() {
  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    const update = () => {
      const hints = getClientPerformanceHints();
      setAnimated(
        !hints.prefersReducedMotion &&
          !hints.saveData &&
          !hints.slowConnection &&
          !hints.isConstrainedViewport
      );
    };
    update();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    motion.addEventListener("change", update);
    window.addEventListener("resize", update, { passive: true });
    return () => {
      motion.removeEventListener("change", update);
      window.removeEventListener("resize", update);
    };
  }, []);
  return (
    <div
      data-business-network={animated ? "animated" : "static"}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden bg-[#08090f]"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_12%_8%,rgba(179,158,90,.09),transparent_50%),radial-gradient(ellipse_at_88%_40%,rgba(143,124,190,.08),transparent_55%)]" />
      {animated ? (
        <ParticleNetwork
          className="business-network-canvas"
          particleCount={85}
          minDist={155}
          particleColor="rgba(208,207,216,0.55)"
          lineColor="rgba(179,177,195,"
          speed={0.22}
        />
      ) : (
        <svg
          className="absolute inset-0 h-full w-full opacity-20"
          viewBox="0 0 1000 800"
          preserveAspectRatio="xMidYMid slice"
        >
          <path
            d="M0 180L160 80 310 240 510 90 730 210 1000 80M0 180L190 430 310 240 480 480 730 210 840 490 1000 620M0 650L190 430 260 750 480 480 660 700 840 490 1000 620"
            fill="none"
            stroke="#a9a5bb"
            strokeWidth="1"
          />
          {[
            [160, 80],
            [310, 240],
            [510, 90],
            [730, 210],
            [190, 430],
            [480, 480],
            [840, 490],
            [260, 750],
            [660, 700],
          ].map(([x, y]) => (
            <circle key={x} cx={x} cy={y} r="3" fill="#ddd7be" />
          ))}
        </svg>
      )}
    </div>
  );
}
