'use client';

import { useEffect } from 'react';

const MAP_ROUTE_CLASS = 'bd-map-route-active';
const NO_GLOBAL_BACKGROUND_CLASS = 'bd-route-no-global-bg';

export default function MapRouteChromeGuard() {
  useEffect(() => {
    const desktopMedia = window.matchMedia('(min-width: 768px)');
    const originalHtmlOverflow = document.documentElement.style.overflow;
    const originalHtmlOverscroll = document.documentElement.style.overscrollBehavior;
    const originalBodyOverflow = document.body.style.overflow;
    const originalBodyOverscroll = document.body.style.overscrollBehavior;

    const syncDesktopScrollLock = () => {
      if (!desktopMedia.matches) {
        document.documentElement.style.overflow = originalHtmlOverflow;
        document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
        document.body.style.overflow = originalBodyOverflow;
        document.body.style.overscrollBehavior = originalBodyOverscroll;
        return;
      }

      document.documentElement.style.overflow = 'hidden';
      document.documentElement.style.overscrollBehavior = 'none';
      document.body.style.overflow = 'hidden';
      document.body.style.overscrollBehavior = 'none';
    };

    document.documentElement.classList.add(MAP_ROUTE_CLASS, NO_GLOBAL_BACKGROUND_CLASS);
    document.body.classList.add(MAP_ROUTE_CLASS, NO_GLOBAL_BACKGROUND_CLASS);
    syncDesktopScrollLock();
    desktopMedia.addEventListener('change', syncDesktopScrollLock);

    return () => {
      desktopMedia.removeEventListener('change', syncDesktopScrollLock);
      document.documentElement.classList.remove(MAP_ROUTE_CLASS, NO_GLOBAL_BACKGROUND_CLASS);
      document.body.classList.remove(MAP_ROUTE_CLASS, NO_GLOBAL_BACKGROUND_CLASS);
      document.documentElement.style.overflow = originalHtmlOverflow;
      document.documentElement.style.overscrollBehavior = originalHtmlOverscroll;
      document.body.style.overflow = originalBodyOverflow;
      document.body.style.overscrollBehavior = originalBodyOverscroll;
    };
  }, []);

  return null;
}
