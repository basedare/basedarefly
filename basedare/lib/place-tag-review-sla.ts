export const PLACE_TAG_REVIEW_SLA_MINUTES = 120;

export type PlaceTagReviewTone = 'fresh' | 'active' | 'due' | 'overdue';

export type PlaceTagReviewState = {
  label: string;
  detail: string;
  elapsedLabel: string;
  dueLabel: string;
  progress: number;
  tone: PlaceTagReviewTone;
  elapsedMinutes: number;
  remainingMinutes: number;
};

export function formatCompactReviewDuration(minutes: number) {
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;

  return remainder === 0 ? `${hours}h` : `${hours}h ${remainder}m`;
}

export function getPlaceTagReviewState(submittedAt: string | Date): PlaceTagReviewState {
  const submittedTime = submittedAt instanceof Date ? submittedAt.getTime() : new Date(submittedAt).getTime();
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - submittedTime) / 60000));
  const remainingMinutes = PLACE_TAG_REVIEW_SLA_MINUTES - elapsedMinutes;
  const progress = Math.min(100, Math.max(8, Math.round((elapsedMinutes / PLACE_TAG_REVIEW_SLA_MINUTES) * 100)));
  const elapsedLabel = `${formatCompactReviewDuration(elapsedMinutes)} queued`;

  if (remainingMinutes <= 0) {
    const overdueLabel = `${formatCompactReviewDuration(Math.abs(remainingMinutes))} overdue`;

    return {
      label: 'Review overdue',
      detail: `${formatCompactReviewDuration(Math.abs(remainingMinutes))} over SLA`,
      elapsedLabel,
      dueLabel: overdueLabel,
      progress: 100,
      tone: 'overdue',
      elapsedMinutes,
      remainingMinutes,
    };
  }

  const dueLabel = `${formatCompactReviewDuration(remainingMinutes)} left`;

  if (remainingMinutes <= 30) {
    return {
      label: 'Nearing referee SLA',
      detail: dueLabel,
      elapsedLabel,
      dueLabel,
      progress,
      tone: 'due',
      elapsedMinutes,
      remainingMinutes,
    };
  }

  if (elapsedMinutes < 15) {
    return {
      label: 'Fresh in queue',
      detail: dueLabel,
      elapsedLabel,
      dueLabel,
      progress,
      tone: 'fresh',
      elapsedMinutes,
      remainingMinutes,
    };
  }

  return {
    label: 'Referee review live',
    detail: dueLabel,
    elapsedLabel,
    dueLabel,
    progress,
    tone: 'active',
    elapsedMinutes,
    remainingMinutes,
  };
}
