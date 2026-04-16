'use client';

import { useEffect, useMemo, useState } from 'react';
import { Download, Plus, X } from 'lucide-react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
};

const DISMISS_KEY = 'pwa-install-dismissed-at';
const DISMISS_MS = 1000 * 60 * 60 * 24 * 7;

function isStandaloneDisplayMode() {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(display-mode: standalone)').matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

export default function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIos, setIsIos] = useState(false);

  const canShow = useMemo(() => {
    if (isInstalled || dismissed) return false;
    return Boolean(deferredPrompt) || isIos;
  }, [deferredPrompt, dismissed, isInstalled, isIos]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
    const ua = window.navigator.userAgent.toLowerCase();

    queueMicrotask(() => {
      setIsInstalled(isStandaloneDisplayMode());
      setIsIos(/iphone|ipad|ipod/.test(ua));

      if (!dismissedAt) {
        setDismissed(false);
        return;
      }

      const isExpired = Date.now() - Number(dismissedAt) > DISMISS_MS;
      setDismissed(!isExpired);
    });

    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
      setDismissed(false);
    };

    const onInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  const dismiss = () => {
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    }
    setDismissed(true);
  };

  const install = async () => {
    if (!deferredPrompt) {
      return;
    }

    await deferredPrompt.prompt();
    const choice = await deferredPrompt.userChoice;

    if (choice.outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return;
    }

    dismiss();
  };

  if (!canShow) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-[95] flex justify-center px-4 md:hidden">
      <div className="pointer-events-auto relative w-full max-w-sm overflow-hidden rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(18,20,36,0.96)_0%,rgba(8,9,18,0.94)_100%)] shadow-[0_20px_60px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-xl">
        <div className="absolute inset-x-10 top-0 h-px bg-white/20" />
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-black/20 text-white/60 transition hover:text-white"
          aria-label="Dismiss install prompt"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-start gap-3 px-4 py-4 pr-12">
          <div className="mt-0.5 flex h-11 w-11 items-center justify-center rounded-2xl border border-cyan-300/30 bg-cyan-400/12 shadow-[0_0_24px_rgba(34,211,238,0.15)]">
            {deferredPrompt ? (
              <Download className="h-5 w-5 text-cyan-200" />
            ) : (
              <Plus className="h-5 w-5 text-cyan-200" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-black uppercase tracking-[0.28em] text-cyan-200/80">
              Install BaseDare
            </div>
            <p className="mt-1 text-sm font-semibold leading-5 text-white">
              Keep the map, nearby missions, and command base one tap away.
            </p>
            <p className="mt-1 text-xs leading-5 text-white/55">
              {deferredPrompt
                ? 'Add BaseDare to your home screen for a faster app-like launch.'
                : 'On iPhone, tap Share then Add to Home Screen to install BaseDare.'}
            </p>
          </div>
        </div>

        <div className="border-t border-white/8 bg-white/[0.02] px-4 py-3">
          {deferredPrompt ? (
            <button
              type="button"
              onClick={() => void install()}
              className="w-full rounded-2xl border border-cyan-300/30 bg-[linear-gradient(180deg,rgba(33,163,196,0.35)_0%,rgba(7,66,84,0.68)_100%)] px-4 py-3 text-sm font-black uppercase tracking-[0.22em] text-white shadow-[0_12px_30px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.18)]"
            >
              Install App
            </button>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-center text-[11px] font-bold uppercase tracking-[0.2em] text-white/70">
              Share → Add to Home Screen
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
