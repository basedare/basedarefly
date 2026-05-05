'use client';

import { useEffect } from 'react';

const SESSION_STORAGE_KEY = 'basedare:activation-close-room-session';

function randomId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function getSessionKey() {
  try {
    const existing = window.localStorage.getItem(SESSION_STORAGE_KEY);
    if (existing) return existing;

    const generated = randomId();
    window.localStorage.setItem(SESSION_STORAGE_KEY, generated);
    return generated;
  } catch {
    return randomId();
  }
}

function postCloseRoomEvent(token: string, eventType: 'OPEN' | 'PAYMENT_CLICK' | 'REPLY_CLICK', target?: string | null) {
  try {
    void fetch(`/api/activation-close-room/${encodeURIComponent(token)}/event`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      keepalive: true,
      body: JSON.stringify({
        eventType,
        sessionKey: getSessionKey(),
        target: target ?? null,
      }),
    });
  } catch {
    // Close-room analytics should never block the buyer path.
  }
}

export default function CloseRoomTracker({ token }: { token: string }) {
  useEffect(() => {
    const sessionKey = getSessionKey();
    const openKey = `basedare:activation-close-room-open:${token}:${sessionKey}`;

    try {
      if (!window.sessionStorage.getItem(openKey)) {
        window.sessionStorage.setItem(openKey, '1');
        postCloseRoomEvent(token, 'OPEN', 'close-room-open');
      }
    } catch {
      postCloseRoomEvent(token, 'OPEN', 'close-room-open');
    }

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof Element)) return;

      const tracked = target.closest<HTMLElement>('[data-close-room-track]');
      if (!tracked) return;

      const trackType = tracked.dataset.closeRoomTrack;
      if (trackType === 'payment') {
        postCloseRoomEvent(token, 'PAYMENT_CLICK', tracked.dataset.closeRoomTarget || 'payment');
      } else if (trackType === 'reply') {
        postCloseRoomEvent(token, 'REPLY_CLICK', tracked.dataset.closeRoomTarget || 'reply');
      }
    };

    window.addEventListener('click', onClick, { capture: true });
    return () => window.removeEventListener('click', onClick, { capture: true });
  }, [token]);

  return null;
}
