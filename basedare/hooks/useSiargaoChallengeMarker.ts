'use client';

import { useEffect, type RefObject } from 'react';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { SIARGAO_CHALLENGE_AREA, inSiargaoChallengeArea, siargaoCampaignOpen, siargaoChallengeHref } from '@/lib/siargao-challenge';

/** One authored area marker. No attendee count, venue association, API, or camera mutation. */
export function useSiargaoChallengeMarker(mapRef: RefObject<MapLibreMap | null>, ready: boolean, enabled: boolean) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !enabled) return;
    let marker: maplibregl.Marker | undefined;
    const reconcile = () => {
      const center = map.getCenter();
      const visible = siargaoCampaignOpen(new Date()) && inSiargaoChallengeArea({ lat: center.lat, lng: center.lng });
      if (!visible) { marker?.remove(); marker = undefined; return; }
      if (marker) return;
      const link = document.createElement('a');
      link.href = siargaoChallengeHref();
      link.setAttribute('aria-label', 'Is Siargao worth the hype? Free self-guided challenge · General Luna area');
      link.title = 'Free adventure · General Luna area · Daylight';
      link.className = 'bd-siargao-challenge-marker';
      const icon = document.createElement('img');
      icon.src = '/assets/peebear-head.webp'; icon.alt = ''; icon.width = 30; icon.height = 30;
      const label = document.createElement('span'); label.textContent = 'Worth the hype?';
      link.append(icon, label);
      link.addEventListener('click', (event) => event.stopPropagation());
      marker = new maplibregl.Marker({ element: link, anchor: 'bottom', pitchAlignment: 'viewport', rotationAlignment: 'viewport' })
        .setLngLat([SIARGAO_CHALLENGE_AREA.lng, SIARGAO_CHALLENGE_AREA.lat]).addTo(map);
    };
    reconcile();
    map.on('moveend', reconcile);
    const interval = window.setInterval(reconcile, 60_000);
    return () => { map.off('moveend', reconcile); window.clearInterval(interval); marker?.remove(); };
  }, [mapRef, ready, enabled]);
}
