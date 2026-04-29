'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import TagPlaceButton from '@/components/place-tags/TagPlaceButton';

type TagPlaceButtonProps = Parameters<typeof TagPlaceButton>[0];

type VenueMarkButtonProps = TagPlaceButtonProps & {
  syncCopy?: string;
};

export default function VenueMarkButton({
  syncCopy = 'Your mark is queued for referee review. It will stay visible here while you are signed in.',
  onTagSubmitted,
  ...tagButtonProps
}: VenueMarkButtonProps) {
  const router = useRouter();
  const [isRefreshing, startTransition] = useTransition();
  const [submissionStatus, setSubmissionStatus] = useState<string | null>(null);

  const handleTagSubmitted: NonNullable<TagPlaceButtonProps['onTagSubmitted']> = (tag) => {
    setSubmissionStatus(tag.status);
    onTagSubmitted?.(tag);
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="grid gap-2">
      <TagPlaceButton {...tagButtonProps} onTagSubmitted={handleTagSubmitted} />
      {submissionStatus ? (
        <p
          aria-live="polite"
          className="rounded-2xl border border-cyan-300/12 bg-cyan-400/[0.06] px-3 py-2 text-[0.69rem] font-semibold uppercase tracking-[0.14em] text-cyan-100/72"
        >
          {isRefreshing ? 'Syncing venue logbook...' : syncCopy}
        </p>
      ) : null}
    </div>
  );
}
