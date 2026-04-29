'use client';

import { useCallback, useEffect, useState } from 'react';

const ADMIN_SECRET_SESSION_KEY = 'basedare.adminSecret.session.v1';

function readSessionSecret() {
  if (typeof window === 'undefined') return '';

  try {
    return window.sessionStorage.getItem(ADMIN_SECRET_SESSION_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeSessionSecret(value: string) {
  if (typeof window === 'undefined') return;

  try {
    const nextValue = value.trim();
    if (nextValue) {
      window.sessionStorage.setItem(ADMIN_SECRET_SESSION_KEY, nextValue);
    } else {
      window.sessionStorage.removeItem(ADMIN_SECRET_SESSION_KEY);
    }
  } catch {
    // Browser privacy modes can block storage. The in-memory input still works.
  }
}

export function useSessionAdminSecret() {
  const [adminSecret, setAdminSecretState] = useState('');

  useEffect(() => {
    setAdminSecretState(readSessionSecret());
  }, []);

  const setAdminSecret = useCallback((value: string) => {
    setAdminSecretState(value);
    writeSessionSecret(value);
  }, []);

  const clearAdminSecret = useCallback(() => {
    setAdminSecretState('');
    writeSessionSecret('');
  }, []);

  return {
    adminSecret,
    setAdminSecret,
    clearAdminSecret,
    hasSessionAdminSecret: Boolean(adminSecret.trim()),
  };
}
