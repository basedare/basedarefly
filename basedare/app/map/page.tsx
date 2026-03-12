import { Space_Mono, Syne } from "next/font/google";
import GradualBlurOverlay from "@/components/GradualBlurOverlay";
import MapClient from "./MapClient";

const syne = Syne({
  subsets: ["latin"],
  weight: ["400", "700", "800"],
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
});

export default function MapPage() {
  return (
    <div className={syne.className}>
      <div className="fixed inset-0 z-10 pointer-events-none">
        <GradualBlurOverlay intensity="light" placement="lower" />
      </div>
      <MapClient monoClass={spaceMono.className} />
    </div>
  );
}
