'use client';

import { Component, type ErrorInfo, type ReactNode, useSyncExternalStore } from 'react';
import nextDynamic from 'next/dynamic';
import { Loader2, RefreshCw } from 'lucide-react';

function MapLoadFallback({
  mode,
  detail,
}: {
  mode: 'loading' | 'error';
  detail?: string;
}) {
  const isError = mode === 'error';

  return (
    <section className="relative z-20 flex min-h-[calc(100dvh-5rem)] items-center justify-center px-4 py-16">
      <div className="w-full max-w-xl overflow-hidden rounded-[30px] border border-cyan-200/16 bg-[radial-gradient(circle_at_12%_0%,rgba(34,211,238,0.16),transparent_34%),radial-gradient(circle_at_92%_24%,rgba(245,197,24,0.1),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.09)_0%,rgba(9,10,22,0.92)_28%,rgba(4,5,12,0.98)_100%)] p-5 text-center shadow-[0_32px_90px_rgba(0,0,0,0.52),0_0_36px_rgba(34,211,238,0.08),inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-xl sm:p-7">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-200/18 bg-cyan-300/[0.08] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.1)]">
          {isError ? <RefreshCw className="h-6 w-6" /> : <Loader2 className="h-6 w-6 animate-spin" />}
        </div>
        <p className="mt-5 text-[10px] font-black uppercase tracking-[0.26em] text-cyan-100/58">
          {isError ? 'Map renderer' : 'Loading grid'}
        </p>
        <h1 className="mt-3 text-3xl font-black uppercase italic leading-none tracking-[-0.05em] text-white sm:text-5xl">
          {isError ? 'Grid needs a reload.' : 'Warming up the live map.'}
        </h1>
        <p className="mx-auto mt-4 max-w-md text-sm font-bold leading-6 text-white/58">
          {detail ??
            (isError
              ? 'The map bundle did not finish cleanly in this browser session. Reloading usually clears a stale chunk or renderer reset.'
              : 'BaseDare is loading the venue layer, proof signals, and MapLibre canvas.')}
        </p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
          {isError ? (
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl border border-cyan-200/24 bg-cyan-300/[0.1] px-5 text-xs font-black uppercase tracking-[0.16em] text-cyan-50 transition hover:border-cyan-100/42 hover:bg-cyan-300/[0.14]"
            >
              Reload grid
              <RefreshCw className="h-4 w-4" />
            </button>
          ) : null}
          <a
            href="/create"
            className="inline-flex min-h-12 items-center justify-center rounded-2xl border border-yellow-200/24 bg-yellow-300/[0.1] px-5 text-xs font-black uppercase tracking-[0.16em] text-yellow-100 transition hover:border-yellow-100/42 hover:bg-yellow-300/[0.14]"
          >
            Create dare
          </a>
        </div>
      </div>
    </section>
  );
}

class MapClientBoundary extends Component<
  { children: ReactNode },
  { message: string | null }
> {
  state: { message: string | null } = { message: null };

  static getDerivedStateFromError(error: unknown) {
    return {
      message: error instanceof Error ? error.message : 'The map bundle failed to load.',
    };
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error('[REAL_WORLD_MAP] Client bundle failed:', error, info.componentStack);
  }

  render() {
    if (this.state.message) {
      return <MapLoadFallback mode="error" detail={this.state.message} />;
    }

    return this.props.children;
  }
}

const subscribeToClientReady = () => () => undefined;
const getClientReadySnapshot = () => true;
const getServerReadySnapshot = () => false;

const RealWorldMap = nextDynamic(() => import('@/components/maps/RealWorldMap'), {
  ssr: false,
  loading: () => <MapLoadFallback mode="loading" />,
});

export default function RealWorldMapClient() {
  const mounted = useSyncExternalStore(
    subscribeToClientReady,
    getClientReadySnapshot,
    getServerReadySnapshot
  );

  if (!mounted) {
    return <MapLoadFallback mode="loading" />;
  }

  return (
    <MapClientBoundary>
      <RealWorldMap />
    </MapClientBoundary>
  );
}
