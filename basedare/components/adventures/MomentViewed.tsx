"use client";
import { useEffect } from "react";
import { trackClientEvent } from "@/lib/analytics";
export default function MomentViewed({ activityId }: { activityId: string }) {
  useEffect(() => {
    trackClientEvent("moment_opened", {
      activity_id: activityId,
      source: "canonical_moment",
    });
  }, [activityId]);
  return null;
}
