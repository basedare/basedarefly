"use client";
import { useEffect } from "react";
import { trackClientEvent } from "@/lib/analytics";
export default function MomentViewed({
  activityId,
  surface = "moment",
}: {
  activityId: string;
  surface?: "moment" | "comparison" | "spotlight";
}) {
  useEffect(() => {
    trackClientEvent(
      surface === "moment"
        ? "moment_opened"
        : surface === "comparison"
        ? "moment_comparison_opened"
        : "moment_spotlight_opened",
      {
        activity_id: activityId,
        source: surface === "moment" ? "canonical_moment" : surface,
      }
    );
  }, [activityId, surface]);
  return null;
}
