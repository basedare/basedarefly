'use client';

import { Check, Share2 } from 'lucide-react';
import { useMemo, useState } from 'react';

import { trackClientEvent } from '@/lib/analytics';
import { getBaseDareUrl } from '@/lib/social-share';

export default function PlanShareButton({
  title,
  text,
  href,
  label = 'Share plan',
  compact = false,
  className = '',
  analyticsSource = 'live_plan',
}: {
  title: string;
  text: string;
  href: string;
  label?: string;
  compact?: boolean;
  className?: string;
  analyticsSource?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);
  const url = useMemo(() => getBaseDareUrl(href), [href]);

  const copyPlan = async () => {
    try {
      await navigator.clipboard.writeText(`${text}\n\n${url}`);
      trackClientEvent('live_plan_invite_shared', {
        method: 'copy_link',
        plan_path: href,
        source: analyticsSource,
      });
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setFailed(true);
    }
  };

  const sharePlan = async () => {
    setFailed(false);
    if (typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text, url });
        trackClientEvent('live_plan_invite_shared', {
          method: 'native',
          plan_path: href,
          source: analyticsSource,
        });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === 'AbortError') return;
      }
    }
    await copyPlan();
  };

  return <span className="inline-flex min-w-0 flex-col">
    <button
      type="button"
      onClick={() => void sharePlan()}
      className={`${compact ? 'min-h-11 rounded-full px-3 text-xs' : 'min-h-11 rounded-2xl px-4 text-xs'} inline-flex items-center justify-center gap-2 border border-cyan-200/22 bg-cyan-300/[0.08] font-bold text-cyan-100 transition hover:border-cyan-100/40 hover:bg-cyan-300/[0.13] ${className}`.trim()}
    >
      {copied ? <Check className="h-4 w-4" /> : <Share2 className="h-4 w-4" />}
      {copied ? 'Copied' : label}
    </button>
    {failed ? <span role="status" className="mt-2 max-w-xs break-words text-xs leading-5 text-amber-100">Sharing is unavailable. <a className="underline" href={url}>Open the adventure or plan</a> and copy its address.</span> : null}
  </span>;
}
