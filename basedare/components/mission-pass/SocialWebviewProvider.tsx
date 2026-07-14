'use client';

import { createContext, useContext, useMemo, useSyncExternalStore, type ReactNode } from 'react';

import {
  classifySocialWebview,
  socialWebviewLabel,
  type SocialWebviewClass,
} from '@/lib/social-webview';

type SocialWebviewContextValue = {
  checked: boolean;
  kind: SocialWebviewClass;
  isSocialWebview: boolean;
  label: string;
};

const SocialWebviewContext = createContext<SocialWebviewContextValue>({
  checked: false,
  kind: 'browser',
  isSocialWebview: false,
  label: 'your browser',
});

const subscribe = () => () => undefined;
const getServerSnapshot = () => 'unresolved' as const;
const getBrowserSnapshot = (): SocialWebviewClass => classifySocialWebview(navigator.userAgent);

export function SocialWebviewProvider({ children }: { children: ReactNode }) {
  const snapshot = useSyncExternalStore(subscribe, getBrowserSnapshot, getServerSnapshot);
  const checked = snapshot !== 'unresolved';
  const kind: SocialWebviewClass = checked ? snapshot : 'browser';

  const value = useMemo<SocialWebviewContextValue>(() => ({
    checked,
    kind,
    isSocialWebview: kind !== 'browser',
    label: socialWebviewLabel(kind),
  }), [checked, kind]);

  return <SocialWebviewContext.Provider value={value}>{children}</SocialWebviewContext.Provider>;
}

export function useSocialWebview() {
  return useContext(SocialWebviewContext);
}
