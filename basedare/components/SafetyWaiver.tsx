'use client';

import Link from 'next/link';
import { ShieldCheck } from 'lucide-react';

/**
 * Safety waiver gate shown before claiming a dare or submitting proof.
 * Missions are skill/task-based only — this is the assumption-of-risk +
 * content-policy acknowledgement (P0-4 launch requirement).
 */

type SafetyWaiverProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  /** 'claim' tweaks the lead line for the claim step; 'proof' for submission. */
  context?: 'claim' | 'proof';
};

export function SafetyWaiver({ checked, onChange, context = 'claim' }: SafetyWaiverProps) {
  return (
    <div
      className="rounded-2xl border border-yellow-300/14 bg-yellow-300/[0.04] px-4 py-3 text-left"
      onClick={(event) => event.stopPropagation()}
    >
      <p className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-[0.24em] text-yellow-100/80">
        <ShieldCheck className="h-3.5 w-3.5" />
        Safety check
      </p>
      <p className="mt-2 text-xs leading-5 text-white/62">
        {context === 'claim'
          ? 'Missions are skill-based tasks — never chance, wagering, or anything dangerous.'
          : 'Proof must show a skill-based task completed safely and legally.'}{' '}
        By continuing you confirm you are 18+, you will act safely and legally, you will not
        endanger yourself or others, and you accept full responsibility for your actions.
        Unsafe or illegal submissions are rejected and can end your account.
      </p>
      <label className="mt-3 flex cursor-pointer items-start gap-2.5 text-xs font-bold text-white/78">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-yellow-400"
        />
        <span>
          I understand and accept the safety terms and the{' '}
          <Link href="/terms" target="_blank" className="text-yellow-200/90 underline underline-offset-2 hover:text-yellow-100">
            Terms
          </Link>
          .
        </span>
      </label>
    </div>
  );
}

export default SafetyWaiver;
