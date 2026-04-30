export type ActivationBrandMemoryInput = {
  originStory?: string;
  audience?: string;
  vibe?: string;
  avoid?: string;
  rituals?: string;
  desiredFeeling?: string;
};

export type ActivationStoryBriefInput = {
  company?: string;
  buyerType?: string;
  city?: string;
  venue?: string;
  goal?: string;
  packageId?: string;
  notes?: string;
  brandMemory?: ActivationBrandMemoryInput;
};

export type ActivationStoryMission = {
  title: string;
  detail: string;
  proofMetric: string;
};

export type ActivationStoryBrief = {
  positioningLine: string;
  creatorBrief: string;
  proofLogic: string;
  repeatMetric: string;
  missionIdeas: ActivationStoryMission[];
  proofChecklist: string[];
};

const GOAL_REPEAT_METRIC: Record<string, string> = {
  foot_traffic: 'repeat if check-ins, creator proofs, or staff feedback show real people moved toward the place',
  ugc: 'repeat if the buyer gets reusable clips, captions, and proof media that feels on-brand',
  launch: 'repeat if the launch moment creates proof, social posts, and a clear second-wave hook',
  event: 'repeat if the activation creates live energy, timestamped proof, and a sharper event recap',
  repeat_visits: 'repeat if the mission creates a ritual people can come back and perform again',
  other: 'repeat if the Spark Receipt gives the buyer a clear next move',
};

function clean(value?: string | null) {
  return value?.replace(/\s+/g, ' ').trim() || '';
}

export function normalizeActivationBrandMemory(
  memory: ActivationBrandMemoryInput | null | undefined
): Required<ActivationBrandMemoryInput> {
  return {
    originStory: clean(memory?.originStory),
    audience: clean(memory?.audience),
    vibe: clean(memory?.vibe),
    avoid: clean(memory?.avoid),
    rituals: clean(memory?.rituals),
    desiredFeeling: clean(memory?.desiredFeeling),
  };
}

export function hasActivationBrandMemory(memory: ActivationBrandMemoryInput | null | undefined) {
  const normalized = normalizeActivationBrandMemory(memory);
  return Object.values(normalized).some(Boolean);
}

export function buildActivationStoryBrief(input: ActivationStoryBriefInput): ActivationStoryBrief {
  const brandMemory = normalizeActivationBrandMemory(input.brandMemory);
  const company = clean(input.company) || 'the buyer';
  const venue = clean(input.venue) || company;
  const city = clean(input.city) || 'the local grid';
  const audience = brandMemory.audience || 'local creators, customers, and fans';
  const vibe = brandMemory.vibe || 'specific, human, proof-led';
  const rituals = brandMemory.rituals || `${venue}'s most recognizable moment`;
  const desiredFeeling = brandMemory.desiredFeeling || 'like they found something worth remembering';
  const originStory =
    brandMemory.originStory ||
    clean(input.notes) ||
    `${company} wants to turn attention into verified real-world movement.`;
  const avoid = brandMemory.avoid ? ` Avoid: ${brandMemory.avoid}.` : '';
  const repeatMetric = GOAL_REPEAT_METRIC[clean(input.goal)] || GOAL_REPEAT_METRIC.other;

  const positioningLine = `${company} is activating ${audience} around ${vibe} energy in ${city}.`;
  const creatorBrief = `${originStory} Create proof that feels warm, local, and specific to ${venue}.${avoid}`;
  const proofLogic = `Creators should show the place, the action, the story cue, and one timestamp-worthy proof signal.`;

  return {
    positioningLine,
    creatorBrief,
    proofLogic,
    repeatMetric,
    missionIdeas: [
      {
        title: 'Signature ritual proof',
        detail: `Film ${rituals}. Make the viewer understand why this place is not interchangeable.`,
        proofMetric: 'recognizable venue context + repeatable brand ritual',
      },
      {
        title: 'Story in the room',
        detail: `Capture one real scene that makes ${audience} feel ${desiredFeeling}. Keep it usable for the venue to repost.`,
        proofMetric: 'human moment + on-brand emotional signal',
      },
      {
        title: 'Bring one more person',
        detail: `Show the exact reason someone should come to ${venue} now instead of just liking another post.`,
        proofMetric: 'clear invitation + proof of real-world presence',
      },
    ],
    proofChecklist: [
      'visible place or product anchor',
      'creator physically present or clearly participating',
      'one brand-memory cue from the brief',
      'caption or hook the buyer can reuse',
      'timestamp, check-in, QR scan, or proof context where available',
    ],
  };
}
