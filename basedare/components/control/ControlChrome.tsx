import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

import { cn } from '@/lib/utils';

/**
 * Shared page chrome for Control surfaces: the dot-grid + radial background and
 * the back-to-Control navigation row. Replaces the per-page background blocks
 * that were duplicated (with drift) across First Spark and Creator Radar.
 */

type ControlChromeProps = {
  children: ReactNode;
  /** Optional right-aligned link in the nav row. */
  action?: ReactNode;
  /** Max width of the content column. */
  maxWidthClass?: string;
  className?: string;
};

export function ControlChrome({
  children,
  action,
  maxWidthClass = 'max-w-6xl',
  className,
}: ControlChromeProps) {
  return (
    <main
      className={cn(
        'relative min-h-screen overflow-hidden bg-[#030305] px-4 py-8 text-white sm:px-6 lg:px-10 lg:py-10',
        className
      )}
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.1)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_22%_0%,rgba(245,197,24,0.1),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(168,85,247,0.12),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.04)_0%,rgba(0,0,0,0)_30%,rgba(0,0,0,0.84)_100%)]" />

      <section className={cn('relative z-10 mx-auto flex w-full flex-col gap-6', maxWidthClass)}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Link
            href="/?mode=control"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.045] px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white/64 transition hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
            Control
          </Link>
          {action}
        </div>
        {children}
      </section>
    </main>
  );
}

export default ControlChrome;
