'use client';

import { useEffect } from 'react';

/** The app shell mounts its children after hydration; replay a help deep link then. */
export default function HelpPageAnchor() {
  useEffect(() => {
    let cancelled = false;
    const reveal = () => {
      const id = window.location.hash.slice(1);
      if (!cancelled && id) document.getElementById(id)?.scrollIntoView({ behavior: 'instant', block: 'start' });
    };
    void document.fonts.ready.then(reveal);
    window.addEventListener('hashchange', reveal);
    return () => { cancelled = true; window.removeEventListener('hashchange', reveal); };
  }, []);
  return null;
}
