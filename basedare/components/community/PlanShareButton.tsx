'use client';

import { Check, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { getBaseDareUrl } from '@/lib/social-share';

export default function PlanShareButton({
  title,
  text,
  href,
  label = 'Share plan',
  compact = false,
  className = '',
}: {
  title: string;
  text: string;
  href: string;
  label?: string;
  compact?: boolean;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => getBaseDareUrl(href), [href]);

  const copyPlan = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard access can be denied in embedded browsers. Keep the button usable
      // without surfacing an unhandled rejection; native share remains the primary path.
    }
  };

  const sharePlan = async () => {
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyPlan();
  };

  return (
    <button
      type="button"
      onClick={() => void sharePlan()}
      className={`${compact ? 'min-h-10 rounded-full px-3 text-[9px]' : 'min-h-11 rounded-2xl px-4 text-[10px]'} inline-flex items-center justify-center gap-2 border border-cyan-200/22 bg-cyan-300/[0.08] font-black uppercase tracking-[0.13em] text-cyan-100 transition hover:border-cyan-100/40 hover:bg-cyan-300/[0.13] ${className}`.trim()}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </button>
  );
}
