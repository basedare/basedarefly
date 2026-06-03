import { cn } from '@/lib/utils';

/**
 * Filter / sort pill used in Control list toolbars (Creator Radar, Brand Portal).
 */

type ControlChipProps = {
  label: string;
  active: boolean;
  onClick: () => void;
};

export function ControlChip({ label, active, onClick }: ControlChipProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] transition',
        active
          ? 'border-yellow-300/40 bg-yellow-300/[0.12] text-yellow-100'
          : 'border-white/12 bg-white/[0.05] text-white/60 hover:text-white'
      )}
    >
      {label}
    </button>
  );
}

export default ControlChip;
