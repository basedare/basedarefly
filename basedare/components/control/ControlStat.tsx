import type { LucideIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { controlInset } from './tokens';

/**
 * Compact stat tile + row. `ControlStatRow` is the single replacement for the
 * repeated stat-tile grids scattered across the Control sections.
 */

export type ControlStatItem = {
  label: string;
  value: string | number;
  icon?: LucideIcon;
};

export function ControlStat({ label, value, icon: Icon }: ControlStatItem) {
  return (
    <div className={cn(controlInset, 'px-4 py-4')}>
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-[10px] font-black uppercase tracking-[0.2em] text-white/48">
            {label}
          </div>
          <div className="mt-2 truncate text-2xl font-black text-white md:text-3xl">{value}</div>
        </div>
        {Icon ? <Icon className="h-5 w-5 shrink-0 text-white/52" /> : null}
      </div>
    </div>
  );
}

type ControlStatRowProps = {
  items: ControlStatItem[];
  /** Tailwind grid-cols utility classes. */
  columnsClass?: string;
  className?: string;
};

export function ControlStatRow({
  items,
  columnsClass = 'grid-cols-2 lg:grid-cols-4',
  className,
}: ControlStatRowProps) {
  return (
    <div className={cn('grid gap-3', columnsClass, className)}>
      {items.map((item) => (
        <ControlStat key={item.label} {...item} />
      ))}
    </div>
  );
}

export default ControlStatRow;
