/** Enquiries describe a job; they never publish, fund or grant media rights. */
export const BUSINESS_REQUESTS = {
  'content-brief': {
    title: 'Get creator content',
    heading: 'Plan your content brief.',
    detail: 'Tell us which photo or video you need, where it should be made and how you want to use it. Scope, permissions, availability and price must be agreed before work starts.',
    prompt: 'What should the creator deliver?',
    placeholder: 'e.g. One vertical 20-second café video showing the entrance and signature drink. For our own organic social accounts; needed next month.',
    goal: 'ugc',
  },
  'activity-brief': {
    title: 'Bring people in',
    heading: 'Plan a funded activity.',
    detail: 'Describe one safe activity, its place and the result you want reviewed. Availability, venue permission, evidence, rewards and service costs must be agreed before launch.',
    prompt: 'What should people do, and what should the result show?',
    placeholder: 'e.g. A small daytime discovery challenge at our venue. Describe the action, intended participants and evidence; include any venue approval already arranged.',
    goal: 'other',
  },
  'visibility-brief': {
    title: 'Get more visibility', heading: 'Plan a shareable local idea.',
    detail: 'Tell us who you want to reach and what makes your place worth sharing. We’ll agree on the creative idea, permissions, scope and price before work starts. Reach and sales aren’t guaranteed.',
    prompt: 'What should people discover about your place?', placeholder: 'e.g. Help visitors discover our new café with an original local challenge and creator story. No promised views or sales.', goal: 'launch',
  },
} as const;

export type BusinessRequestKind = keyof typeof BUSINESS_REQUESTS;

export function businessRequestKind(value: string | null | undefined): BusinessRequestKind | null {
  return value === 'content-brief' || value === 'activity-brief' || value === 'visibility-brief' ? value : null;
}

export function businessRequestHref(kind: BusinessRequestKind, source: 'buyer-workspace' | 'home-business' = 'buyer-workspace') {
  return '/activations?' + new URLSearchParams({
    source, missionType: kind, goal: BUSINESS_REQUESTS[kind].goal,
    budgetRange: 'discuss', packageId: 'pilot-drop', buyerType: 'other',
  });
}

/** Keep retries together without merging two different kinds of buyer request. */
export function businessRequestDedupeSource(source: string, missionType?: string | null) {
  const kind = businessRequestKind(missionType);
  return kind ? `${source}:${kind}` : source;
}
