/** Enquiries describe a job; they never publish, fund or grant media rights. */
export const BUSINESS_REQUESTS = {
  'content-brief': {
    title: 'Content at a real place',
    heading: 'Plan your content brief.',
    detail: 'Tell us which photo or video you need, where it should be made and how you want to use it. Scope, permissions, availability and price must be agreed before work starts.',
    prompt: 'What should the creator deliver?',
    placeholder: 'e.g. One vertical 20-second café video showing the entrance and signature drink. For our own organic social accounts; needed next month.',
    goal: 'ugc',
  },
  'activity-brief': {
    title: 'A funded local activity',
    heading: 'Plan a funded activity.',
    detail: 'Describe one safe activity, its place and the result you want reviewed. Availability, venue permission, evidence, rewards and service costs must be agreed before launch.',
    prompt: 'What should people do, and what should the result show?',
    placeholder: 'e.g. A small daytime discovery challenge at our venue. Describe the action, intended participants and evidence; include any venue approval already arranged.',
    goal: 'other',
  },
} as const;

export type BusinessRequestKind = keyof typeof BUSINESS_REQUESTS;

export function businessRequestKind(value: string | null | undefined): BusinessRequestKind | null {
  return value === 'content-brief' || value === 'activity-brief' ? value : null;
}

export function businessRequestHref(kind: BusinessRequestKind) {
  return '/activations?' + new URLSearchParams({
    source: 'buyer-workspace', missionType: kind, goal: BUSINESS_REQUESTS[kind].goal,
    budgetRange: 'discuss', packageId: 'pilot-drop', buyerType: 'other',
  });
}

/** Keep retries together without merging two different kinds of buyer request. */
export function businessRequestDedupeSource(source: string, missionType?: string | null) {
  const kind = businessRequestKind(missionType);
  return kind ? `${source}:${kind}` : source;
}
