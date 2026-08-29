export const CREATOR_MISSION_ALERT_LANES = [
  'anything',
  'photo_video',
  'place_update',
  'social_clip',
  'sports_outdoors',
  'food_nightlife',
] as const;

export type CreatorMissionAlertLane = (typeof CREATOR_MISSION_ALERT_LANES)[number];

export const CREATOR_MISSION_ALERT_LANE_LABELS: Record<CreatorMissionAlertLane, string> = {
  anything: 'Anything useful',
  photo_video: 'Photo or video',
  place_update: 'Place checks',
  social_clip: 'Social clips',
  sports_outdoors: 'Sports or outdoors',
  food_nightlife: 'Food or nightlife',
};

export function normalizeMissionAlertText(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim();
}

export function getMissionAlertContactKind(value: string) {
  const contact = normalizeMissionAlertText(value);
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) return 'email' as const;
  if (/^@[a-z0-9_.-]{2,}$/i.test(contact)) return 'telegram' as const;
  if (contact.replace(/\D/g, '').length >= 7) return 'whatsapp' as const;
  return 'unknown' as const;
}

export function isUsableMissionAlertContact(value: string) {
  return getMissionAlertContactKind(value) !== 'unknown';
}

export function normalizeMissionAlertInput(input: {
  handleOrName: string;
  city: string;
  contact: string;
  workLane?: CreatorMissionAlertLane | null;
}) {
  return {
    handleOrName: normalizeMissionAlertText(input.handleOrName),
    city: normalizeMissionAlertText(input.city),
    contact: normalizeMissionAlertText(input.contact),
    contactKind: getMissionAlertContactKind(input.contact),
    workLane: input.workLane || 'anything',
  };
}
