'use client';

import { useEffect } from 'react';

const RECOVERY_KEY = 'basedare:runtime-recovery-at';
const RECOVERY_REASON_KEY = 'basedare:runtime-recovery-reason';
const RECOVERY_COOLDOWN_MS = 60_000;

function getErrorText(value: unknown): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Error) return `${value.name} ${value.message} ${value.stack || ''}`;

  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function isRecoverableRuntimeLoadError(text: string): boolean {
  const normalized = text.toLowerCase();

  return [
    'chunkloaderror',
    'loading chunk',
    'loading css chunk',
    'failed to fetch dynamically imported module',
    'importing a module script failed',
    'module script load',
    'dynamically imported module',
    '/_next/static/',
  ].some((needle) => normalized.includes(needle));
}

function recoverFromRuntimeLoadError(reason: string) {
  const now = Date.now();
  const lastRecovery = Number(window.sessionStorage.getItem(RECOVERY_KEY) || 0);

  if (Number.isFinite(lastRecovery) && now - lastRecovery < RECOVERY_COOLDOWN_MS) {
    return;
  }

  window.sessionStorage.setItem(RECOVERY_KEY, String(now));
  window.sessionStorage.setItem(RECOVERY_REASON_KEY, reason.slice(0, 300));

  const url = new URL(window.location.href);
  url.searchParams.set('bd_recover', String(now));
  window.location.replace(url.toString());
}

export default function AppStabilityGuard() {
  useEffect(() => {
    const handleWindowError = (event: ErrorEvent) => {
      const message = [event.message, event.filename, getErrorText(event.error)]
        .filter(Boolean)
        .join(' ');

      if (isRecoverableRuntimeLoadError(message)) {
        recoverFromRuntimeLoadError(message);
      }
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const message = getErrorText(event.reason);

      if (isRecoverableRuntimeLoadError(message)) {
        recoverFromRuntimeLoadError(message);
      }
    };

    window.addEventListener('error', handleWindowError);
    window.addEventListener('unhandledrejection', handleUnhandledRejection);

    return () => {
      window.removeEventListener('error', handleWindowError);
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
    };
  }, []);

  return null;
}
