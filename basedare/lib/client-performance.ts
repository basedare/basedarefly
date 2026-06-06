'use client';

type NavigatorWithHints = Navigator & {
  connection?: {
    effectiveType?: string;
    saveData?: boolean;
  };
  deviceMemory?: number;
};

type IdleWindow = Window & {
  requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
  cancelIdleCallback?: (handle: number) => void;
};

export function getClientPerformanceHints() {
  if (typeof window === 'undefined') {
    return {
      deviceMemory: null,
      effectiveType: null,
      isConstrainedViewport: false,
      isIOSWebKit: false,
      isLowMemory: false,
      isMobileViewport: false,
      isTabletViewport: false,
      prefersReducedMotion: false,
      saveData: false,
      slowConnection: false,
    };
  }

  const nav = navigator as NavigatorWithHints;
  const userAgent = navigator.userAgent || '';
  const connection = nav.connection;
  const effectiveType = connection?.effectiveType ?? null;
  const deviceMemory = typeof nav.deviceMemory === 'number' ? nav.deviceMemory : null;
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const saveData = Boolean(connection?.saveData);
  const slowConnection = effectiveType === 'slow-2g' || effectiveType === '2g';
  const isMobileViewport = window.innerWidth < 768;
  const isTouchDevice = navigator.maxTouchPoints > 0;
  const isIOSWebKit =
    /iP(ad|hone|od)/.test(userAgent) ||
    (userAgent.includes('Macintosh') && navigator.maxTouchPoints > 1);
  const isTabletViewport =
    window.innerWidth >= 768 &&
    window.innerWidth < 1180 &&
    (isTouchDevice || /Tablet|iPad/.test(userAgent));
  const isConstrainedViewport = isMobileViewport || isTabletViewport;
  const isLowMemory = typeof deviceMemory === 'number' && deviceMemory <= 4;

  return {
    deviceMemory,
    effectiveType,
    isConstrainedViewport,
    isIOSWebKit,
    isLowMemory,
    isMobileViewport,
    isTabletViewport,
    prefersReducedMotion,
    saveData,
    slowConnection,
  };
}

export function shouldPreferLightweightClient() {
  const hints = getClientPerformanceHints();
  return (
    hints.prefersReducedMotion ||
    hints.saveData ||
    hints.slowConnection ||
    hints.isLowMemory ||
    (hints.isIOSWebKit && hints.isConstrainedViewport)
  );
}

export function runAfterPageIdle(callback: () => void, timeout = 1600) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let settled = false;
  const idleWindow = window as IdleWindow;
  const run = () => {
    if (settled) return;
    settled = true;
    callback();
  };

  if (idleWindow.requestIdleCallback) {
    const idleId = idleWindow.requestIdleCallback(run, { timeout });
    return () => {
      settled = true;
      idleWindow.cancelIdleCallback?.(idleId);
    };
  }

  const timeoutId = window.setTimeout(run, timeout);
  return () => {
    settled = true;
    window.clearTimeout(timeoutId);
  };
}

export function runAfterFirstInteraction(callback: () => void) {
  if (typeof window === 'undefined') {
    return () => {};
  }

  let settled = false;
  const events: Array<keyof WindowEventMap> = ['pointerdown', 'keydown', 'touchstart', 'scroll'];
  const run = () => {
    if (settled) return;
    settled = true;
    cleanup();
    callback();
  };
  const cleanup = () => {
    events.forEach((eventName) => window.removeEventListener(eventName, run));
  };

  events.forEach((eventName) => window.addEventListener(eventName, run, { once: true, passive: true }));
  return () => {
    settled = true;
    cleanup();
  };
}
