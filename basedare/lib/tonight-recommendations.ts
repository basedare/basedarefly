import type { TonightActivity } from './tonight';
import { rankRecommendations, type RecommendationContext } from './recommendation-policy';

export function rankTonightActivities(activities: readonly TonightActivity[], context: RecommendationContext) {
  return rankRecommendations(activities, (activity) => ({
    title: activity.title,
    kind: 'activity',
    latitude: activity.place.lat,
    longitude: activity.place.lng,
    startsAt: activity.startsAt,
    endsAt: activity.endsAt,
    distanceKm: activity.distanceKm,
  }), context);
}
