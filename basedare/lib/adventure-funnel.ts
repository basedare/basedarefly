"use client";
/** Best-effort self-reported activity, never proof or a paid completion. */
let queue = Promise.resolve();
export function recordAdventureEvent(
  activityId: string,
  runId: string,
  event: "STARTED" | "COMPLETED_SELF_REPORTED",
) {
  queue = queue.then(async () => {
    try {
      await fetch("/api/adventures/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId, runId, event }),
        signal: AbortSignal.timeout(8000),
      });
    } catch {
      /* Playing never depends on analytics availability. */
    }
  });
}
