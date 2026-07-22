export const MISSION_KIT_VERSION = 1 as const;

export const MISSION_KIT_KEYS = [
  'OPEN_NOW',
  'OFFER_AVAILABLE',
  'CURRENT_PRICE',
  'EVENT_ACTIVE',
  'ACCESSIBLE_NOW',
  'CROWD_LEVEL',
] as const;

export type MissionKitKey = (typeof MISSION_KIT_KEYS)[number];

export type MissionKit = {
  key: MissionKitKey;
  version: typeof MISSION_KIT_VERSION;
  label: string;
  useWhen: string;
  questionExample: string;
  answerPrompt: string;
  allowedOutcomes: readonly ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'];
  requiredEvidence: readonly string[];
  safetyRules: readonly string[];
  privacyRules: readonly string[];
  rejectionReasons: readonly string[];
  defaultFreshnessHours: number;
  allowedFreshnessHours: readonly number[];
  expectedMinutes: number;
  recommendedGrossRewardUsd: number;
  recheckRule: string;
};

export type MissionKitSnapshot = MissionKit & {
  compiledQuestion: string;
  compiledAt: string;
};

export const MISSION_KITS: Record<MissionKitKey, MissionKit> = {
  OPEN_NOW: {
    key: 'OPEN_NOW', version: MISSION_KIT_VERSION, label: 'Open now',
    useWhen: 'A buyer needs a current operating-status answer for one named place.',
    questionExample: 'Is [place] visibly open to ordinary customers between 6pm and 8pm today?',
    answerPrompt: 'Choose YES, NO, PARTIAL, or INCONCLUSIVE and describe the observable operating state.',
    allowedOutcomes: ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'],
    requiredEvidence: ['One fresh exterior or entrance view.', 'Opening indicators or closure indicators must be readable.', 'Device-reported presence within the mission radius.'],
    safetyRules: ['Observe only from public or customer-authorized areas.', 'Do not enter a closed or restricted property.'],
    privacyRules: ['Avoid identifiable faces unless they are incidental and lawful to capture.', 'Do not record private conversations.'],
    rejectionReasons: ['Place identity is unclear.', 'Media does not show whether ordinary customers can enter.', 'Evidence is outside the agreed time or radius.'],
    defaultFreshnessHours: 3, allowedFreshnessHours: [1, 3, 6, 12], expectedMinutes: 15,
    recommendedGrossRewardUsd: 125, recheckRule: 'Recheck when the answer is older than the selected freshness window or a conflicting signal arrives.',
  },
  OFFER_AVAILABLE: {
    key: 'OFFER_AVAILABLE', version: MISSION_KIT_VERSION, label: 'Offer available',
    useWhen: 'A buyer needs to know whether one publicly advertised offer is actually available.',
    questionExample: 'Is the publicly advertised 2-for-1 sangria offer at [place] available before midnight tonight?',
    answerPrompt: 'Report whether the exact named offer is available, unavailable, partly available, or could not be established.',
    allowedOutcomes: ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'],
    requiredEvidence: ['Fresh public menu, sign, listing, or willing staff confirmation.', 'The exact offer and material conditions must be captured.', 'Device-reported presence within the mission radius.'],
    safetyRules: ['Do not pressure staff to honor an outdated or unofficial offer.', 'No purchase is required unless the brief explicitly funds it.'],
    privacyRules: ['Do not publish a staff member’s name or face without consent.', 'Redact customer receipts and personal payment details.'],
    rejectionReasons: ['The evidence concerns a different offer.', 'Conditions or validity window are missing.', 'The answer relies only on an old online post.'],
    defaultFreshnessHours: 6, allowedFreshnessHours: [3, 6, 12, 24], expectedMinutes: 20,
    recommendedGrossRewardUsd: 125, recheckRule: 'Recheck after the validity window, a reported refusal, or a material condition change.',
  },
  CURRENT_PRICE: {
    key: 'CURRENT_PRICE', version: MISSION_KIT_VERSION, label: 'Current price',
    useWhen: 'A buyer needs one current, public price with its conditions.',
    questionExample: 'What is the current walk-in price for a one-hour board rental at [place] today?',
    answerPrompt: 'Record the current price, currency, unit, inclusions, exclusions, and whether availability was confirmed.',
    allowedOutcomes: ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'],
    requiredEvidence: ['Fresh public menu, rate card, booking screen, or willing staff confirmation.', 'Currency, unit, and material conditions must be recorded.', 'Device-reported presence when the price is collected in person.'],
    safetyRules: ['Do not negotiate, misrepresent yourself, or obstruct staff.', 'Do not make a purchase unless explicitly included in the brief.'],
    privacyRules: ['Never capture card data, customer receipts, phone numbers, or private booking records.', 'Staff identity is not required.'],
    rejectionReasons: ['Currency or unit is missing.', 'The price is not tied to the named product.', 'Evidence is stale or privately obtained without authorization.'],
    defaultFreshnessHours: 24, allowedFreshnessHours: [6, 12, 24, 72], expectedMinutes: 20,
    recommendedGrossRewardUsd: 125, recheckRule: 'Recheck after the selected freshness window or when a user reports a different charged price.',
  },
  EVENT_ACTIVE: {
    key: 'EVENT_ACTIVE', version: MISSION_KIT_VERSION, label: 'Event active',
    useWhen: 'A buyer needs to establish whether one named public event is actually happening.',
    questionExample: 'Is the named quiz night at [place] actively running between 7pm and 9pm today?',
    answerPrompt: 'Report whether the named event is active, cancelled, delayed/partial, or impossible to establish.',
    allowedOutcomes: ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'],
    requiredEvidence: ['Fresh venue context and an event-specific public indicator.', 'The named event and observation time must be distinguishable.', 'Device-reported presence within the mission radius.'],
    safetyRules: ['Do not disrupt the event or film attendees intrusively.', 'Follow venue entry, filming, and age rules.'],
    privacyRules: ['Prefer signage, stage, schedule, or wide contextual media over identifiable close-ups.', 'Minors must not be identifiable.'],
    rejectionReasons: ['Media only proves the venue is open.', 'The named event cannot be identified.', 'Observation occurred outside the agreed window.'],
    defaultFreshnessHours: 3, allowedFreshnessHours: [1, 3, 6, 12], expectedMinutes: 25,
    recommendedGrossRewardUsd: 125, recheckRule: 'Retire after the event window; create a new dated check for the next occurrence.',
  },
  ACCESSIBLE_NOW: {
    key: 'ACCESSIBLE_NOW', version: MISSION_KIT_VERSION, label: 'Accessible now',
    useWhen: 'A buyer needs to know whether an ordinary visitor can safely reach a public entrance or access point.',
    questionExample: 'Can an ordinary visitor currently reach the public entrance to [place] using the signed access route?',
    answerPrompt: 'Report accessible, inaccessible, partly accessible, or inconclusive, with the observable obstruction or route condition.',
    allowedOutcomes: ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'],
    requiredEvidence: ['Fresh public access-point or route evidence.', 'Any closure, obstruction, fee, hours, or permission requirement must be noted.', 'Device-reported presence near the public access point.'],
    safetyRules: ['Never cross barriers, water hazards, unstable ground, traffic, or restricted land.', 'An unsafe route is a valid negative answer, not a challenge to continue.'],
    privacyRules: ['Do not expose precise coordinates for sensitive or intentionally approximate places.', 'Do not identify private residents or access codes.'],
    rejectionReasons: ['Evidence was captured from an unsafe or unauthorized location.', 'The public access point is not identifiable.', 'The answer makes unsupported universal accessibility claims.'],
    defaultFreshnessHours: 12, allowedFreshnessHours: [3, 6, 12, 24], expectedMinutes: 30,
    recommendedGrossRewardUsd: 125, recheckRule: 'Recheck after weather, construction, access-rule changes, or the selected freshness window.',
  },
  CROWD_LEVEL: {
    key: 'CROWD_LEVEL', version: MISSION_KIT_VERSION, label: 'Crowd level',
    useWhen: 'A buyer needs a bounded count or occupancy band during an exact time window.',
    questionExample: 'Between 8pm and 9pm, does [place] have at least 20 customers visibly present in public areas?',
    answerPrompt: 'Choose the outcome and record the agreed count or occupancy band, observation duration, and limiting conditions.',
    allowedOutcomes: ['YES', 'NO', 'PARTIAL', 'INCONCLUSIVE'],
    requiredEvidence: ['Fresh wide contextual media or a bounded manual count.', 'The observation window and threshold must be explicit.', 'Device-reported presence within the mission radius.'],
    safetyRules: ['Observe without blocking entrances or counting from restricted areas.', 'Do not manufacture attendance or ask people to pose as customers.'],
    privacyRules: ['Use wide context; avoid identifiable close-ups.', 'Report aggregate counts only.'],
    rejectionReasons: ['No explicit threshold or time window.', 'Media is too narrow to support the count.', 'The count includes staff or passers-by contrary to the brief.'],
    defaultFreshnessHours: 3, allowedFreshnessHours: [1, 3, 6], expectedMinutes: 30,
    recommendedGrossRewardUsd: 125, recheckRule: 'Treat the answer as expired after the exact observation window; compare only like-for-like windows.',
  },
};

const SUBJECTIVE_TERMS = /\b(best|amazing|cool|popular|good|bad|worth it|safe|vibe|fun)\b/i;
const UNSAFE_TERMS = /\b(sneak|trespass|break in|secret code|private area|without permission|confront)\b/i;

export function isMissionKitKey(value: string): value is MissionKitKey {
  return (MISSION_KIT_KEYS as readonly string[]).includes(value);
}

export function preflightMissionKit(input: {
  kitKey: MissionKitKey;
  question: string;
  freshnessWindowHours: number;
  areaLabel: string;
  createdAt?: Date;
}) {
  const kit = MISSION_KITS[input.kitKey];
  const question = input.question.replace(/\s+/g, ' ').trim();
  const areaLabel = input.areaLabel.replace(/\s+/g, ' ').trim();
  const errors: string[] = [];
  const warnings: string[] = [];
  if (question.length < 12 || question.length > 500) errors.push('Write one precise 12–500 character question.');
  if (!question.endsWith('?')) errors.push('The brief must be one explicit question.');
  if (areaLabel.length < 2 || areaLabel.length > 191) errors.push('Name a bounded area.');
  if (!kit.allowedFreshnessHours.includes(input.freshnessWindowHours)) {
    errors.push(`${kit.label} supports freshness windows of ${kit.allowedFreshnessHours.join(', ')} hours.`);
  }
  if (SUBJECTIVE_TERMS.test(question)) errors.push('Replace subjective wording with one observable state, threshold, price, offer, or access condition.');
  if (UNSAFE_TERMS.test(question)) errors.push('The brief asks for unsafe or unauthorized conduct.');
  if (!/\b(at|in|near|for|between|during|today|tonight|currently|current|now)\b/i.test(question)) {
    warnings.push('Name the place and observation window explicitly before funding.');
  }
  if (input.kitKey === 'CROWD_LEVEL' && !/\d/.test(question)) errors.push('Crowd checks require a numeric threshold or explicit occupancy band.');
  if (input.kitKey === 'CURRENT_PRICE' && !/\b(price|cost|rate|fee)\b/i.test(question)) warnings.push('State the exact price, rate, cost, or fee being checked.');
  if (input.kitKey === 'OFFER_AVAILABLE' && !/\b(offer|deal|discount|free|2-for-1|two-for-one|available)\b/i.test(question)) warnings.push('Name the exact offer and its conditions.');
  const compiledAt = input.createdAt ?? new Date();
  return {
    ok: errors.length === 0,
    errors,
    warnings,
    kit,
    normalizedQuestion: question,
    normalizedAreaLabel: areaLabel,
    snapshot: {
      ...kit,
      compiledQuestion: question,
      compiledAt: compiledAt.toISOString(),
    } satisfies MissionKitSnapshot,
  };
}
