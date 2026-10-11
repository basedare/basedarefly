import { SURF_SPOT_PATHS } from "@/lib/map-surf-art";

export default function SurfSpotGlyph({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 44" className={`surf-spot-glyph ${className}`} aria-hidden="true" focusable="false">
      {SURF_SPOT_PATHS.map((path) => <path key={path.className} {...path} />)}
    </svg>
  );
}
