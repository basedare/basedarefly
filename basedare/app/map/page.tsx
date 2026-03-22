import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import RealWorldMap from "@/components/maps/RealWorldMap";

export const dynamic = 'force-dynamic';

export default function MapPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent font-display">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>
      <RealWorldMap />
    </div>
  );
}
