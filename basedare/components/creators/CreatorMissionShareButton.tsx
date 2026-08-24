'use client';

import { Check, Share2 } from 'lucide-react';
import { useState } from 'react';

import { trackClientEvent } from '@/lib/analytics';

export function CreatorMissionShareButton({ missionId, title }: { missionId: string; title: string }) {
  const [copied, setCopied] = useState(false);

  const share = async () => {
    const url = window.location.href;
    trackClientEvent('creator_mission_share_started', { mission_id: missionId });
    try {
      if (navigator.share) {
        await navigator.share({
          title: `BaseDare · ${title}`,
          text: `Paid BaseDare mission: ${title}`,
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
    }
  };

  return (
    <button
      type="button"
      onClick={() => void share()}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-cyan-200/16 bg-cyan-300/[0.05] px-4 text-[10px] font-black uppercase tracking-[0.14em] text-cyan-50 transition hover:border-cyan-200/30 hover:bg-cyan-300/[0.09]"
    >
      {copied ? <Check className="h-4 w-4" aria-hidden="true" /> : <Share2 className="h-4 w-4" aria-hidden="true" />}
      {copied ? 'Link copied' : 'Share mission'}
    </button>
  );
}
