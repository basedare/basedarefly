"use client";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import ShareAdventure from "./ShareAdventure";
export default function MomentSubmit({ activityId }: { activityId: string }) {
  const query = useSearchParams();
  const [runId] = useState(() => crypto.randomUUID());
  const parent = query.get("moment");
  return (
    <ShareAdventure
      activityId={activityId}
      runId={runId}
      placeSlug={query.get("place") ?? undefined}
      parentMomentId={
        parent && /^[a-zA-Z0-9-]{8,80}$/.test(parent) ? parent : undefined
      }
      initiallyOpen
    />
  );
}
