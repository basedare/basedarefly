'use client';

import { useCallback, useEffect, useState } from 'react';

const ADMIN_SESSION_FLAG_KEY = 'basedare.adminSession.active.v1';

function readSessionFlag() {
  if (typeof window === 'undefined') return false;

  try {
    return window.sessionStorage.getItem(ADMIN_SESSION_FLAG_KEY) === '1';
  } catch {
    return false;
  }
}

function writeSessionFlag(active: boolean) {
  if (typeof window === 'undefined') return;

  try {
    if (active) {
      window.sessionStorage.setItem(ADMIN_SESSION_FLAG_KEY, '1');
    } else {
      window.sessionStorage.removeItem(ADMIN_SESSION_FLAG_KEY);
    }
  } catch {
    // Browser privacy modes can block storage. The HttpOnly cookie still works.
  }
}

export function useSessionAdminSecret() {
  const [adminSecret, setAdminSecret] = useState('');
  const [hasAdminSession, setHasAdminSession] = useState(false);

  useEffect(() => {
    setHasAdminSession(readSessionFlag());
  }, []);

  const ensureAdminSession = useCallback(async () => {
    const candidate = adminSecret.trim();
    if (!candidate) return hasAdminSession;

    const response = await fetch('/api/admin/session', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ adminSecret: candidate }),
    });

    if (!response.ok) {
      setHasAdminSession(false);
      writeSessionFlag(false);
      return false;
    }

    setAdminSecret('');
    setHasAdminSession(true);
    writeSessionFlag(true);
    return true;
  }, [adminSecret, hasAdminSession]);

  const clearAdminSecret = useCallback(async () => {
    setAdminSecret('');
    setHasAdminSession(false);
    writeSessionFlag(false);

    try {
      await fetch('/api/admin/session', { method: 'DELETE' });
    } catch {
      // Clearing local state is still useful if the network request fails.
    }
  }, []);

  return {
    adminSecret,
    setAdminSecret,
    ensureAdminSession,
    clearAdminSecret,
    hasAdminSession,
    hasSessionAdminSecret: hasAdminSession,
    hasAdminSecretDraft: Boolean(adminSecret.trim()),
  };
}
