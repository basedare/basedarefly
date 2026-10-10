'use client';

import { useRef, useState } from 'react';
import { Info, X } from 'lucide-react';

/** Measure available space when opening so the key fits a scrolled mobile map. */
export default function MapLegend({ className = '' }: { className?: string }) {
  const [availableHeight, setAvailableHeight] = useState<number | null>(null);
  const open = availableHeight !== null;
  const toggleRef = useRef<HTMLButtonElement>(null);
  const close = () => { setAvailableHeight(null); toggleRef.current?.focus({ preventScroll: true }); };
  return (
    <div className={`map-key ${className}`} onClick={(event) => event.stopPropagation()} onKeyDown={(event) => { if (event.key === 'Escape') close(); }}>
      <button ref={toggleRef} type="button" className="map-key-toggle" aria-expanded={open} aria-controls="basedare-map-key" onClick={(event) => setAvailableHeight(open ? null : Math.max(160, event.currentTarget.getBoundingClientRect().top - 100))}><Info size={15} aria-hidden="true" /><span>Map key</span></button>
      {open ? <div id="basedare-map-key" className="map-key-panel" role="region" aria-label="Map key" style={{ maxHeight: availableHeight }}>
        <div className="map-key-header"><p className="map-key-heading">Read the map</p><button type="button" className="map-key-close" aria-label="Close map key" onClick={close}><X size={15} aria-hidden="true" /></button></div>
        <p className="map-key-intro">Place icons show what’s there. Badges show what you can do.</p>
        <ul>
          <li><span className="map-key-example map-key-place" aria-hidden="true" /><span><strong>Places</strong><small>Cafés, bars, surf spots and more</small></span></li>
          <li><span className="map-key-example map-key-paid" aria-hidden="true">ϟ</span><span><strong>Paid dare</strong><small>A challenge with a reward</small></span></li>
          <li><span className="map-key-example map-key-free" aria-hidden="true">✦</span><span><strong>Free challenge</strong><small>Play without funding a reward</small></span></li>
          <li><span className="map-key-example map-key-meet" aria-hidden="true">••</span><span><strong>Meetup or crew</strong><small>People making a plan</small></span></li>
          <li><span className="map-key-example map-key-tonight" aria-hidden="true">▦</span><span><strong>Tonight</strong><small>Listed for this evening</small></span></li>
          <li><span className="map-key-example map-key-update" aria-hidden="true">•</span><span><strong>Recent update</strong><small>A verified visit or contribution</small></span></li>
        </ul>
        <p className="map-key-footer"><span aria-hidden="true">3</span> A number groups places. Tap to zoom in.</p>
      </div> : null}
      <style jsx>{`
        .map-key { position: absolute; right: 12px; bottom: 58px; z-index: 12; color: #f5f3fa; }
        .map-key-toggle { display: flex; min-height: 44px; align-items: center; justify-content: center; gap: 7px; padding: 0 14px; list-style: none; cursor: pointer; border: 1px solid rgba(255,255,255,.16); border-radius: 999px; background: linear-gradient(180deg,#20212de8,#090b14f5); box-shadow: 0 6px 16px #0005, inset 0 1px 0 #ffffff14; font-size: 11px; font-weight: 700; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); }
        .map-key-toggle:hover, .map-key-toggle[aria-expanded="true"] { border-color: #f5c51866; color: #ffe697; }
        .map-key-toggle:focus-visible { outline: 2px solid #f5c518; outline-offset: 4px; }
        .map-key-panel { position: absolute; right: 0; bottom: calc(100% + 8px); width: min(254px,calc(100vw - 40px)); overflow-y: auto; overscroll-behavior: contain; padding: 17px; border: 1px solid #ffffff20; border-radius: 20px; background: linear-gradient(155deg,#1c1b2cf7,#090c15fa 62%); box-shadow: 0 18px 44px #0007, inset 0 1px 0 #ffffff12; backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px); }
        .map-key-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-top: -8px; }
        .map-key-close { display: grid; width: 44px; height: 44px; flex-shrink: 0; place-items: center; border-radius: 50%; color: #c0bfcd; }
        .map-key-close:hover { background: #ffffff0a; color: #fff; }
        .map-key-close:focus-visible { outline: 2px solid #f5c518; }
        .map-key-heading { margin: 0; font-size: 14px; font-weight: 800; letter-spacing: -.02em; }
        .map-key-intro { margin: 5px 0 13px; color: #c0bfcd; font-size: 11px; line-height: 1.5; }
        ul { display: grid; gap: 11px; margin: 0; padding: 0; list-style: none; }
        li { display: flex; align-items: center; gap: 10px; }
        strong, small { display: block; }
        strong { font-size: 12px; font-weight: 700; line-height: 1.4; }
        small { margin-top: 1px; color: #aaa9bb; font-size: 10px; line-height: 1.4; }
        .map-key-example { display: grid; width: 30px; height: 30px; flex: 0 0 30px; place-items: center; border: 1px solid #ffffff1f; border-radius: 9px; background: #ffffff06; font-size: 20px; font-weight: 800; line-height: 1; }
        .map-key-place { background: url('/assets/map/holograms/cafe.webp') center/32px no-repeat; }
        .map-key-paid { color: #f5d66b; border-color: #f5c5184d; background: #f5c5180c; }
        .map-key-free { color: #67e8f9; border-color: #22d3ee4d; background: #22d3ee0c; }
        .map-key-meet { color: #67e8f9; letter-spacing: 2px; font-size: 15px; }
        .map-key-tonight { color: #d7baff; border-color: #b87fff4d; }
        .map-key-update { color: #fff; font-size: 25px; }
        .map-key-footer { display: flex; align-items: center; gap: 9px; margin: 14px 0 0; padding-top: 12px; border-top: 1px solid #ffffff14; color: #aaa9bb; font-size: 10px; line-height: 1.5; }
        .map-key-footer span { display: grid; width: 24px; height: 24px; flex-shrink: 0; place-items: center; border: 1px solid #b87fff66; border-radius: 50%; color: #fff; font-size: 12px; font-weight: 800; }
        @media (min-width: 768px) { .map-key { right: 20px; bottom: 20px; } }
      `}</style>
    </div>
  );
}
