import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import MapClient from "./MapClient";
import VenueBeaconStrip from "./VenueBeaconStrip";

export const dynamic = 'force-dynamic';

export default function MapPage() {
  return (
    <div className="font-display">
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay intensity="light" placement="lower" />
      </div>
      <MapClient monoClass="font-mono" />
      <VenueBeaconStrip />
    </div>
  );
}
