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
  title?: string;
  subtitle?: string;
  badge?: string;
  className?: string;
};

export function ControlChrome({
  children,
  action,
  maxWidthClass = 'max-w-6xl',
  title = 'Control Mode',
  subtitle = 'Mission control',
  badge = 'Portal',
  className,
}: ControlChromeProps) {
  return (
    <div
      className={cn(
        'fixed inset-0 z-[100] overflow-auto bg-[#030305] text-white',
        className
      )}
    >
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_1px_1px,rgba(185,127,255,0.12)_1px,transparent_0)] [background-size:112px_112px]" />
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_14%_8%,rgba(255,213,74,0.16),transparent_34%),radial-gradient(circle_at_82%_8%,rgba(154,82,255,0.2),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(31,220,255,0.11),transparent_36%),linear-gradient(180deg,#05040a_0%,#07020f_48%,#000_100%)]" />
      <div className="pointer-events-none fixed inset-0 z-[1] opacity-[0.025] [background-image:repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.3)_2px,rgba(0,0,0,0.3)_4px)] [background-size:100%_4px]" />

      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/80 px-4 py-3 shadow-[0_16px_44px_rgba(0,0,0,0.36)] backdrop-blur-xl md:px-6 md:py-4">
        <div className={cn('mx-auto flex flex-col gap-3 md:flex-row md:items-center md:justify-between', maxWidthClass)}>
          <div className="flex min-w-0 items-center gap-2 md:gap-4">
            <Link
              href="/?mode=control"
              className="inline-flex min-h-11 shrink-0 items-center gap-2 rounded-xl border border-white/[0.15] bg-white/[0.06] px-3 py-2 text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08),0_12px_28px_rgba(0,0,0,0.28)] transition hover:border-white/25 hover:bg-white/[0.09]"
              aria-label="Back to control"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="min-w-0">
              <div className="truncate text-[1.05rem] font-black uppercase leading-none tracking-[-0.03em] text-white antialiased md:text-2xl">
                {title}
              </div>
              <div className="mt-1 hidden truncate text-[10px] font-black uppercase tracking-[0.22em] text-cyan-200/70 md:block">
                {subtitle}
              </div>
            </div>
            <div className="hidden rounded-full border border-[#f5c518]/[0.35] bg-[#f5c518]/10 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-[#ffe785] md:block">
              {badge}
            </div>
          </div>
          {action}
        </div>
      </header>

      <section
        className={cn(
          'relative z-10 mx-auto flex w-full flex-col gap-6 px-4 pb-[calc(7rem+env(safe-area-inset-bottom))] pt-5 md:px-6 md:py-8',
          maxWidthClass
        )}
      >
        {children}
      </section>
    </div>
  );
}

export default ControlChrome;
