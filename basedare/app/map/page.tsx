import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import LiquidBackground from "@/components/LiquidBackground";
import MapClient from "./MapClient";
import VenueBeaconStrip from "./VenueBeaconStrip";

export const dynamic = 'force-dynamic';

export default function MapPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent font-display">
      <LiquidBackground />
      <div className="pointer-events-none fixed inset-0 z-10 hidden md:block">
        <GradualBlurOverlay />
      </div>
      <MapClient monoClass="font-mono" />
      <VenueBeaconStrip />
    </div>
  );
}
