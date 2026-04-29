import type { Metadata } from 'next';
import { Suspense } from 'react';
import HandshakeClient from './HandshakeClient';

export const metadata: Metadata = {
  title: 'BaseDare Secure Handshake',
  description: 'Scan a venue QR to prove presence, check in, and unlock live BaseDare venue actions.',
  alternates: {
    canonical: '/handshake',
  },
};

function HandshakeFallback() {
  return (
    <section className="min-h-[72vh] px-4 pb-16 pt-6">
      <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-[32px] border border-white/10 bg-black/40 px-6 py-16 text-center shadow-[0_24px_80px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.08)]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-cyan-200/20 border-t-cyan-200" />
        <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-cyan-100/72">
          Reading secure handshake
        </p>
      </div>
    </section>
  );
}

export default function HandshakePage() {
  return (
    <Suspense fallback={<HandshakeFallback />}>
      <HandshakeClient />
    </Suspense>
  );
}
