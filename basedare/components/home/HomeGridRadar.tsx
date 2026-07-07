'use client';

import type { CSSProperties } from 'react';
import { useMemo, useState } from 'react';
import { Crosshair, LocateFixed, Loader2, MapPin, Navigation, Radio } from 'lucide-react';
import { useRouter } from 'next/navigation';

type RadarTone = 'gold' | 'cyan' | 'purple' | 'emerald';
type RadarMode = 'idle' | 'locating' | 'located' | 'denied' | 'error';

type NearbyVenue = {
  slug: string;
  name: string;
  handle: string | null;
  latitude: number;
  longitude: number;
  distanceDisplay?: string;
  activeDareCount?: number;
  checkInCount?: number;
  liveSession?: unknown;
  firstSparkWindow?: {
    state?: 'quiet' | 'heating' | 'live' | 'proven';
    checkIns?: number;
    targetCheckIns?: number;
  } | null;
  memorySummary?: {
    checkInCount?: number;
    proofCount?: number;
  } | null;
};

type RadarPoint = {
  key: string;
  label: string;
  x: number;
  y: number;
  tone: RadarTone;
  signal: string;
  href: string;
};

type NearbyResponse = {
  success: boolean;
  data?: {
    venues?: NearbyVenue[];
  };
  source?: string;
};

type HomeGridRadarProps = {
  compact?: boolean;
  floating?: boolean;
  className?: string;
  style?: CSSProperties;
};

const fallbackPoints: RadarPoint[] = [
  {
    key: 'hideaway',
    label: 'Hideaway',
    x: 52,
    y: 45,
    tone: 'gold',
    signal: 'pilot ready',
    href: '/map?place=hideaway&source=home-radar',
  },
  {
    key: 'catgun',
    label: 'Cat & Gun',
    x: 38,
    y: 61,
    tone: 'purple',
    signal: 'live proof',
    href: '/map?place=the-cat-and-gun&source=home-radar',
  },
  {
    key: 'cloud9',
    label: 'Cloud 9',
    x: 70,
    y: 33,
    tone: 'purple',
    signal: 'surf spark',
    href: '/map?place=cloud-9-boardwalk&source=home-radar',
  },
  {
    key: 'beach-club',
    label: 'Beach Club',
    x: 67,
    y: 63,
    tone: 'gold',
    signal: 'qr ready',
    href: '/map?place=siargao-beach-club&source=home-radar',
  },
  {
    key: 'greenhouse',
    label: 'Greenhouse',
    x: 31,
    y: 43,
    tone: 'purple',
    signal: 'coffee loop',
    href: '/map?source=home-radar',
  },
];

const toneClasses: Record<RadarTone, string> = {
  gold: 'bg-[#f5c518] shadow-[0_0_18px_rgba(245,197,24,0.82)]',
  cyan: 'bg-[#d8b4fe] shadow-[0_0_18px_rgba(184,127,255,0.78)]',
  purple: 'bg-[#b66bff] shadow-[0_0_18px_rgba(182,107,255,0.82)]',
  emerald: 'bg-[#ffe45c] shadow-[0_0_18px_rgba(245,197,24,0.76)]',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toneForVenue(venue: NearbyVenue, index: number): RadarTone {
  if (venue.firstSparkWindow?.state === 'live') return 'gold';
  if (venue.firstSparkWindow?.state === 'heating') return 'purple';
  if (venue.firstSparkWindow?.state === 'proven') return 'gold';
  if (venue.liveSession || (venue.activeDareCount ?? 0) > 0) return 'gold';
  if ((venue.memorySummary?.proofCount ?? 0) > 0) return 'purple';
  if ((venue.checkInCount ?? 0) > 0 || (venue.memorySummary?.checkInCount ?? 0) > 0) return 'purple';
  return (['gold', 'purple', 'purple'] as RadarTone[])[index % 3];
}

function signalForVenue(venue: NearbyVenue) {
  if (venue.firstSparkWindow?.state === 'live') return 'spark live';
  if (venue.firstSparkWindow?.state === 'heating') return 'heating';
  if (venue.firstSparkWindow?.state === 'proven') return 'proof made';
  if (venue.liveSession) return 'live qr';
  if ((venue.activeDareCount ?? 0) > 0) return `${venue.activeDareCount} open`;
  if ((venue.memorySummary?.proofCount ?? 0) > 0) return `${venue.memorySummary?.proofCount} proofs`;
  if (venue.distanceDisplay) return venue.distanceDisplay;
  return 'nearby';
}

function mapNearbyVenuesToPoints(venues: NearbyVenue[], origin: { lat: number; lng: number }): RadarPoint[] {
  const shown = venues.slice(0, 7);
  const metersPerLat = 111_000;
  const metersPerLng = metersPerLat * Math.max(0.22, Math.cos((origin.lat * Math.PI) / 180));

  // Fit the dial to the venues actually on it. A fixed 5km scale collapsed a
  // dense town (everything within a few hundred meters) into one center blob.
  const maxDistanceMeters = shown.reduce((max, venue) => {
    const dx = (venue.longitude - origin.lng) * metersPerLng;
    const dy = (venue.latitude - origin.lat) * metersPerLat;
    return Math.max(max, Math.hypot(dx, dy));
  }, 0);
  const radiusMeters = clamp(maxDistanceMeters * 1.15, 250, 5000);
  const latRange = radiusMeters / metersPerLat;
  const lngRange = radiusMeters / metersPerLng;

  return shown.map((venue, index) => {
    const x = clamp(50 + ((venue.longitude - origin.lng) / lngRange) * 34, 18, 82);
    const y = clamp(50 - ((venue.latitude - origin.lat) / latRange) * 34, 18, 82);

    return {
      key: venue.slug || `${venue.name}-${index}`,
      label: venue.name,
      x,
      y,
      tone: toneForVenue(venue, index),
      signal: signalForVenue(venue),
      href: `/map?place=${encodeURIComponent(venue.slug)}&source=home-radar`,
    };
  });
}

function getRadarCopy(mode: RadarMode, count: number) {
  if (mode === 'locating') {
    return {
      eyebrow: 'Grid radar',
      title: 'Finding signal',
      detail: 'Nearby venues',
      action: 'Scanning',
    };
  }

  if (mode === 'located') {
    if (count === 0) {
      return {
        eyebrow: 'Live grid',
        title: 'Grid locked',
        detail: 'No venues nearby',
        action: 'Open map',
      };
    }

    return {
      eyebrow: 'Live grid',
      title: `${count} venues ready`,
      detail: 'Near you',
      action: 'Open map',
    };
  }

  if (mode === 'denied') {
    return {
      eyebrow: 'Grid radar',
      title: 'Siargao grid',
      detail: 'Tap map',
      action: 'Open map',
    };
  }

  if (mode === 'error') {
    return {
      eyebrow: 'Grid radar',
      title: 'Signal cached',
      detail: 'Siargao live',
      action: 'Open map',
    };
  }

  return {
    eyebrow: 'Grid radar',
    title: `${count} venues ready`,
    detail: 'Siargao live',
    action: 'Reveal nearby',
  };
}

export default function HomeGridRadar({ compact = false, floating = false, className = '', style }: HomeGridRadarProps) {
  const router = useRouter();
  const [mode, setMode] = useState<RadarMode>('idle');
  const [points, setPoints] = useState<RadarPoint[]>(fallbackPoints);
  const [activePointKey, setActivePointKey] = useState(fallbackPoints[0]?.key ?? null);
  const [lockedLocation, setLockedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const activePoint = useMemo(
    () => points.find((point) => point.key === activePointKey) ?? points[0],
    [activePointKey, points]
  );
  const copy = getRadarCopy(mode, points.length);

  const mapHref = useMemo(() => {
    if (activePoint) return activePoint.href;
    if (lockedLocation) {
      const params = new URLSearchParams({
        source: 'home-radar',
        lat: lockedLocation.lat.toFixed(6),
        lng: lockedLocation.lng.toFixed(6),
      });
      return `/map?${params.toString()}`;
    }
    return '/map?source=home-radar';
  }, [activePoint, lockedLocation]);

  async function loadNearbyVenues(position: GeolocationPosition) {
    const { latitude, longitude } = position.coords;
    setLockedLocation({ lat: latitude, lng: longitude });
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 2600);

    try {
      const params = new URLSearchParams({
        lat: String(latitude),
        lng: String(longitude),
        radiusMeters: '5000',
        limit: '7',
      });
      const response = await fetch(`/api/venues/nearby?${params.toString()}`, {
        signal: controller.signal,
      });
      const payload = (await response.json()) as NearbyResponse;
      const venues = payload.success ? payload.data?.venues ?? [] : [];
      const nextPoints = mapNearbyVenuesToPoints(venues, { lat: latitude, lng: longitude });

      setPoints(nextPoints);
      setActivePointKey(nextPoints[0]?.key ?? null);
      setMode('located');
    } catch {
      setMode('error');
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  function handleReveal() {
    if (mode === 'locating') return;

    if (mode === 'located' || mode === 'denied' || mode === 'error') {
      router.push(mapHref);
      return;
    }

    requestLocationLock();
  }

  function requestLocationLock() {
    if (mode === 'locating') return;

    if (!('geolocation' in navigator)) {
      setMode('denied');
      return;
    }

    setMode('locating');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void loadNearbyVenues(position);
      },
      () => {
        setMode('denied');
      },
      {
        enableHighAccuracy: false,
        timeout: 5500,
        maximumAge: 120_000,
      }
    );
  }

  function openMap() {
    router.push(mapHref);
  }

  const radar = (
    <div
      className={`home-grid-radar-shell ${compact ? 'home-grid-radar-shell--compact' : ''} ${
        floating ? 'home-grid-radar-shell--floating' : ''
      }`}
    >
      <button
        type="button"
        onClick={openMap}
        className="home-grid-radar-disc group/radar"
        aria-label="Open BaseDare venue radar map"
      >
        <svg className="absolute inset-0 h-full w-full" viewBox="0 0 220 220" aria-hidden="true">
          <defs>
            <radialGradient id="homeGridRadarSea" cx="50%" cy="50%" r="60%">
              <stop offset="0%" stopColor="rgba(184, 127, 255, 0.22)" />
              <stop offset="62%" stopColor="rgba(22, 16, 42, 0.92)" />
              <stop offset="100%" stopColor="rgba(2, 3, 8, 0.98)" />
            </radialGradient>
            <linearGradient id="homeGridRadarRoad" x1="0%" x2="100%" y1="0%" y2="100%">
              <stop offset="0%" stopColor="rgba(255,255,255,0.70)" />
              <stop offset="55%" stopColor="rgba(159,128,255,0.56)" />
              <stop offset="100%" stopColor="rgba(245,197,24,0.54)" />
            </linearGradient>
            <linearGradient id="homeGridRadarRing" x1="0%" x2="100%">
              <stop offset="0%" stopColor="#b66bff" />
              <stop offset="38%" stopColor="#f5c518" />
              <stop offset="70%" stopColor="#8f4dff" />
              <stop offset="100%" stopColor="#ffe45c" />
            </linearGradient>
          </defs>
          <circle cx="110" cy="110" r="106" fill="rgba(0,0,0,0.78)" />
          <circle cx="110" cy="110" r="96" fill="url(#homeGridRadarSea)" />
          <path
            d="M14 126 C45 118, 55 96, 82 101 C105 106, 113 76, 140 82 C165 88, 177 72, 207 69 L207 214 L14 214 Z"
            fill="rgba(10, 44, 38, 0.72)"
          />
          <path
            d="M20 74 C51 58, 75 70, 91 46 C106 25, 140 23, 158 41 C178 62, 197 53, 213 45 L213 0 L20 0 Z"
            fill="rgba(62, 49, 84, 0.52)"
          />
          <path
            d="M31 158 C62 139, 88 124, 112 113 C143 99, 169 86, 193 58"
            stroke="url(#homeGridRadarRoad)"
            strokeWidth="7"
            strokeLinecap="round"
            fill="none"
            opacity="0.72"
          />
          <path
            d="M55 30 C67 58, 83 81, 100 105 C118 130, 137 154, 156 197"
            stroke="rgba(255,255,255,0.44)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.62"
          />
          <path
            d="M26 108 C57 107, 80 112, 105 126 C130 140, 157 142, 193 134"
            stroke="rgba(245,197,24,0.48)"
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
            opacity="0.52"
          />
          <path
            d="M119 15 C127 46, 127 76, 121 105 C114 138, 101 166, 83 205"
            stroke="rgba(184,127,255,0.46)"
            strokeWidth="4"
            strokeLinecap="round"
            fill="none"
            opacity="0.54"
          />
          <circle cx="110" cy="110" r="74" fill="none" stroke="rgba(255,255,255,0.10)" strokeDasharray="5 8" />
          <circle cx="110" cy="110" r="38" fill="none" stroke="rgba(182,107,255,0.14)" strokeDasharray="3 7" />
          <path
            d="M110 83 L121 127 L110 120 L99 127 Z"
            fill="white"
            stroke="rgba(0,0,0,0.72)"
            strokeWidth="3"
            strokeLinejoin="round"
            className="home-grid-radar-arrow"
          />
          <circle cx="110" cy="110" r="104" fill="none" stroke="rgba(0,0,0,0.92)" strokeWidth="8" />
          <circle cx="110" cy="110" r="100" fill="none" stroke="url(#homeGridRadarRing)" strokeWidth="4" opacity="0.88" />
          <path d="M51 26 A100 100 0 0 1 109 10" stroke="rgba(184,127,255,0.9)" strokeWidth="7" fill="none" />
          <path d="M173 33 A100 100 0 0 1 207 109" stroke="rgba(245,197,24,0.82)" strokeWidth="7" fill="none" />
          <path d="M17 139 A100 100 0 0 0 52 193" stroke="rgba(245,197,24,0.76)" strokeWidth="7" fill="none" />
        </svg>

        <span className="pointer-events-none absolute left-1/2 top-1/2 h-[2px] w-[46%] origin-left bg-gradient-to-r from-white/64 to-transparent home-grid-radar-sweep" />
        <span className="pointer-events-none absolute inset-[12%] rounded-full border border-white/10" />

        {points.map((point) => (
          <span
            key={point.key}
            className="home-grid-radar-point"
            style={{ left: `${point.x}%`, top: `${point.y}%` }}
            onMouseEnter={() => setActivePointKey(point.key)}
          >
            <span className={`home-grid-radar-point-core ${toneClasses[point.tone]}`} />
            <span className="home-grid-radar-point-pulse" />
          </span>
        ))}

        <span className="pointer-events-none absolute bottom-7 left-1/2 min-w-[84px] -translate-x-1/2 rounded-full border border-black/70 bg-black/78 px-3 py-1 text-center font-mono text-[9px] font-black uppercase tracking-normal text-white shadow-[0_8px_18px_rgba(0,0,0,0.55)]">
          {activePoint?.label ?? 'Grid'}
        </span>
      </button>

      <div className="home-grid-radar-copy">
        <div className="flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-normal text-cyan-100/80">
          <Radio className="h-3.5 w-3.5 text-cyan-200" />
          {copy.eyebrow}
        </div>
        <div className="mt-1 text-xl font-black italic leading-none text-white drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">
          {copy.title}
        </div>
        <div className="mt-2 flex items-center gap-2 font-mono text-[10px] font-black uppercase tracking-normal text-zinc-400">
          <MapPin className="h-3.5 w-3.5 text-[#f5c518]" />
          <span>{activePoint?.signal ?? copy.detail}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={handleReveal}
        className="home-grid-radar-action"
        disabled={mode === 'locating'}
      >
        {mode === 'locating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Crosshair className="h-4 w-4" />}
        <span>{copy.action}</span>
      </button>

      <button
        type="button"
        onClick={requestLocationLock}
        className="home-grid-radar-locate-button"
        disabled={mode === 'locating'}
        aria-label="Lock radar to your current location"
        title="Lock radar to your current location"
      >
        {mode === 'locating' ? <Loader2 className="h-4 w-4 animate-spin" /> : <LocateFixed className="h-4 w-4" />}
      </button>

      <button type="button" onClick={openMap} className="home-grid-radar-map-button" aria-label="Open full BaseDare map">
        <Navigation className="h-4 w-4" />
      </button>

      <style jsx>{`
        .home-grid-radar-shell {
          position: relative;
          width: 236px;
          min-height: 302px;
          padding: 14px;
          border: 1px solid rgba(255, 255, 255, 0.14);
          border-radius: 30px;
          background:
            radial-gradient(circle at 28% 8%, rgba(184, 127, 255, 0.2), transparent 35%),
            radial-gradient(circle at 82% 18%, rgba(245, 197, 24, 0.18), transparent 34%),
            linear-gradient(155deg, rgba(13, 15, 24, 0.88), rgba(4, 4, 9, 0.94));
          box-shadow:
            0 22px 50px rgba(0, 0, 0, 0.54),
            inset 0 1px 0 rgba(255, 255, 255, 0.13),
            inset 0 -18px 32px rgba(0, 0, 0, 0.46);
          backdrop-filter: blur(18px);
        }

        .home-grid-radar-shell::before {
          content: '';
          position: absolute;
          inset: 8px;
          pointer-events: none;
          border-radius: 24px;
          border: 1px solid rgba(111, 234, 255, 0.10);
          box-shadow:
            inset 0 0 28px rgba(182, 107, 255, 0.14),
            inset 0 0 18px rgba(245, 197, 24, 0.08);
        }

        .home-grid-radar-disc {
          position: relative;
          display: block;
          width: 208px;
          height: 208px;
          overflow: hidden;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.18);
          background: #020207;
          box-shadow:
            0 16px 32px rgba(0, 0, 0, 0.54),
            0 0 32px rgba(184, 127, 255, 0.16),
            0 0 26px rgba(245, 197, 24, 0.08),
            inset 0 2px 0 rgba(255, 255, 255, 0.12),
            inset 0 -16px 30px rgba(0, 0, 0, 0.74);
        }

        .home-grid-radar-disc::before {
          content: '';
          position: absolute;
          inset: 8px;
          z-index: 5;
          pointer-events: none;
          border-radius: inherit;
          border: 1px solid rgba(255, 255, 255, 0.14);
          box-shadow:
            inset 0 2px 5px rgba(255, 255, 255, 0.2),
            inset 0 -12px 22px rgba(0, 0, 0, 0.72),
            inset 10px 0 22px rgba(184, 127, 255, 0.12),
            inset -8px 0 20px rgba(245, 197, 24, 0.1);
        }

        .home-grid-radar-disc::after {
          content: '';
          position: absolute;
          inset: 0;
          z-index: 6;
          pointer-events: none;
          border-radius: inherit;
          background:
            radial-gradient(ellipse at 31% 20%, rgba(255, 255, 255, 0.30) 0%, rgba(255, 255, 255, 0.11) 16%, transparent 34%),
            radial-gradient(circle at 68% 78%, rgba(0, 0, 0, 0.68), transparent 38%),
            radial-gradient(circle at 50% 50%, transparent 42%, rgba(0, 0, 0, 0.72) 100%);
          mix-blend-mode: screen;
          opacity: 0.62;
        }

        .home-grid-radar-sweep {
          transform: rotate(-28deg);
          animation: home-grid-radar-sweep 7s linear infinite;
        }

        .home-grid-radar-arrow {
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.74));
        }

        .home-grid-radar-point {
          position: absolute;
          z-index: 3;
          width: 18px;
          height: 18px;
          transform: translate(-50%, -50%);
        }

        .home-grid-radar-point-core {
          position: absolute;
          inset: 4px;
          z-index: 2;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.88);
        }

        .home-grid-radar-point-pulse {
          position: absolute;
          inset: 0;
          z-index: 1;
          border-radius: 9999px;
          border: 1px solid rgba(255, 255, 255, 0.30);
          background: rgba(255, 255, 255, 0.05);
          animation: home-grid-radar-pulse 2.6s ease-in-out infinite;
        }

        .home-grid-radar-copy {
          position: relative;
          z-index: 2;
          margin-top: 12px;
        }

        .home-grid-radar-action {
          position: relative;
          z-index: 2;
          margin-top: 12px;
          display: flex;
          min-height: 42px;
          width: 100%;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border-radius: 9999px;
          border: 1px solid rgba(245, 197, 24, 0.46);
          background: linear-gradient(180deg, rgba(255, 226, 87, 0.96), rgba(200, 137, 0, 0.94));
          color: #100b02;
          font-family: var(--font-bricolage), var(--font-alpha), sans-serif;
          font-size: 11px;
          font-weight: 900;
          letter-spacing: 0;
          text-transform: uppercase;
          box-shadow:
            0 10px 22px rgba(245, 197, 24, 0.20),
            inset 0 2px 0 rgba(255, 255, 255, 0.46),
            inset 0 -5px 0 rgba(79, 43, 0, 0.36);
          transition: transform 160ms ease, filter 160ms ease;
        }

        .home-grid-radar-action:hover {
          transform: translateY(-1px);
          filter: brightness(1.06);
        }

        .home-grid-radar-action:active {
          transform: translateY(1px);
          box-shadow:
            0 6px 16px rgba(245, 197, 24, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.35),
            inset 0 4px 12px rgba(74, 39, 0, 0.38);
        }

        .home-grid-radar-action:disabled {
          cursor: wait;
          filter: saturate(0.85);
        }

        .home-grid-radar-map-button {
          position: absolute;
          right: 20px;
          top: 20px;
          z-index: 4;
          display: flex;
          height: 36px;
          width: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 1px solid rgba(111, 234, 255, 0.28);
          background: rgba(14, 7, 24, 0.76);
          color: #ead7ff;
          box-shadow:
            0 10px 20px rgba(0, 0, 0, 0.36),
            0 0 18px rgba(184, 127, 255, 0.16),
            inset 0 1px 0 rgba(255, 255, 255, 0.16);
          backdrop-filter: blur(10px);
        }

        .home-grid-radar-locate-button {
          position: absolute;
          left: 20px;
          top: 20px;
          z-index: 4;
          display: flex;
          height: 36px;
          width: 36px;
          align-items: center;
          justify-content: center;
          border-radius: 9999px;
          border: 1px solid rgba(245, 197, 24, 0.36);
          background:
            radial-gradient(circle at 35% 22%, rgba(255, 255, 255, 0.24), transparent 28%),
            linear-gradient(180deg, rgba(44, 35, 12, 0.92), rgba(10, 8, 15, 0.88));
          color: #ffe45c;
          box-shadow:
            0 10px 20px rgba(0, 0, 0, 0.38),
            0 0 18px rgba(245, 197, 24, 0.14),
            inset 0 1px 0 rgba(255, 255, 255, 0.17),
            inset 0 -7px 11px rgba(0, 0, 0, 0.42);
          backdrop-filter: blur(10px);
        }

        .home-grid-radar-locate-button:hover {
          filter: brightness(1.08);
          transform: translateY(-1px);
        }

        .home-grid-radar-locate-button:active {
          transform: translateY(1px);
          box-shadow:
            0 6px 16px rgba(0, 0, 0, 0.34),
            inset 0 1px 0 rgba(255, 255, 255, 0.12),
            inset 0 7px 12px rgba(0, 0, 0, 0.42);
        }

        .home-grid-radar-locate-button:disabled {
          cursor: wait;
          filter: saturate(0.82);
        }

        .home-grid-radar-shell--compact {
          display: grid;
          grid-template-columns: 86px 1fr;
          width: min(100%, 360px);
          min-height: 0;
          gap: 12px;
          padding: 12px;
          border-radius: 24px;
        }

        .home-grid-radar-shell--compact .home-grid-radar-disc {
          width: 86px;
          height: 86px;
        }

        .home-grid-radar-shell--compact .home-grid-radar-copy {
          margin-top: 2px;
          align-self: center;
        }

        .home-grid-radar-shell--compact .home-grid-radar-action {
          grid-column: 1 / -1;
          margin-top: 0;
        }

        .home-grid-radar-shell--compact .home-grid-radar-map-button {
          right: 14px;
          top: 14px;
          height: 30px;
          width: 30px;
        }

        .home-grid-radar-shell--compact .home-grid-radar-locate-button {
          display: none;
        }

        .home-grid-radar-shell--compact .home-grid-radar-disc :global(svg) {
          transform: scale(1);
        }

        .home-grid-radar-shell--compact .home-grid-radar-disc :global(svg),
        .home-grid-radar-shell--compact .home-grid-radar-sweep,
        .home-grid-radar-shell--compact .home-grid-radar-point {
          pointer-events: none;
        }

        .home-grid-radar-shell--compact .home-grid-radar-disc > span:last-child {
          display: none;
        }

        .home-grid-radar-shell--floating {
          width: 206px;
          min-height: 0;
          padding: 0;
          border: 0;
          border-radius: 9999px;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
          filter:
            drop-shadow(0 24px 34px rgba(0, 0, 0, 0.62))
            drop-shadow(0 0 22px rgba(184, 127, 255, 0.18))
            drop-shadow(0 0 16px rgba(245, 197, 24, 0.1));
        }

        .home-grid-radar-shell--floating::before {
          display: none;
        }

        .home-grid-radar-shell--floating .home-grid-radar-disc {
          width: 206px;
          height: 206px;
          border: 2px solid rgba(17, 18, 28, 0.9);
          background:
            radial-gradient(circle at 34% 24%, rgba(255, 255, 255, 0.22), transparent 18%),
            radial-gradient(circle at 50% 50%, rgba(72, 38, 108, 0.26), rgba(2, 3, 8, 0.98) 72%);
          box-shadow:
            0 0 0 1px rgba(255, 255, 255, 0.10),
            0 0 0 7px rgba(8, 9, 16, 0.78),
            0 0 0 9px rgba(255, 255, 255, 0.08),
            0 16px 34px rgba(0, 0, 0, 0.62),
            0 0 34px rgba(184, 127, 255, 0.22),
            0 0 24px rgba(245, 197, 24, 0.1),
            inset 0 5px 12px rgba(255, 255, 255, 0.16),
            inset 0 -18px 28px rgba(0, 0, 0, 0.84),
            inset 14px 0 28px rgba(184, 127, 255, 0.15),
            inset -14px 0 26px rgba(245, 197, 24, 0.12);
        }

        .home-grid-radar-shell--floating .home-grid-radar-copy {
          display: none;
        }

        .home-grid-radar-shell--floating .home-grid-radar-action {
          display: none;
        }

        .home-grid-radar-shell--floating .home-grid-radar-map-button {
          right: 12px;
          top: 12px;
          height: 32px;
          width: 32px;
          border-color: rgba(255, 255, 255, 0.18);
          background:
            radial-gradient(circle at 35% 22%, rgba(255, 255, 255, 0.24), transparent 28%),
            linear-gradient(180deg, rgba(24, 24, 34, 0.94), rgba(7, 8, 14, 0.9));
          box-shadow:
            0 8px 18px rgba(0, 0, 0, 0.42),
            inset 0 2px 0 rgba(255, 255, 255, 0.16),
            inset 0 -7px 11px rgba(0, 0, 0, 0.42);
        }

        .home-grid-radar-shell--floating .home-grid-radar-locate-button {
          left: 12px;
          top: 12px;
          height: 32px;
          width: 32px;
          border-color: rgba(245, 197, 24, 0.34);
          background:
            radial-gradient(circle at 35% 22%, rgba(255, 255, 255, 0.24), transparent 28%),
            linear-gradient(180deg, rgba(45, 35, 12, 0.94), rgba(8, 8, 14, 0.9));
          box-shadow:
            0 8px 18px rgba(0, 0, 0, 0.42),
            0 0 16px rgba(245, 197, 24, 0.16),
            inset 0 2px 0 rgba(255, 255, 255, 0.16),
            inset 0 -7px 11px rgba(0, 0, 0, 0.42);
        }

        .home-grid-radar-shell--floating .home-grid-radar-disc > span:last-child {
          bottom: 30px;
          background: rgba(0, 0, 0, 0.62);
          box-shadow:
            0 7px 18px rgba(0, 0, 0, 0.48),
            inset 0 1px 0 rgba(255, 255, 255, 0.1);
        }

        @keyframes home-grid-radar-sweep {
          from {
            transform: rotate(-28deg);
          }
          to {
            transform: rotate(332deg);
          }
        }

        @keyframes home-grid-radar-pulse {
          0%,
          100% {
            opacity: 0.28;
            transform: scale(0.82);
          }
          50% {
            opacity: 0.72;
            transform: scale(1.35);
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .home-grid-radar-sweep,
          .home-grid-radar-point-pulse {
            animation: none;
          }
        }
      `}</style>
    </div>
  );

  return (
    <aside className={className} style={style}>
      {radar}
    </aside>
  );
}
