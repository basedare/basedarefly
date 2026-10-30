/** Enquiries describe a job; they never publish, fund or grant media rights. */
export const BUSINESS_REQUESTS = {
  "content-brief": {
    title: "Get creator content",
    outcome: "Work with creators to produce real, usable videos and photos.",
    example:
      "A café could request an original short video of its signature drink, with the intended usage agreed in advance.",
    heading: "Plan your content brief.",
    detail:
      "Tell us which photo or video you need, where it should be made and how you want to use it. Scope, permissions, availability and price must be agreed before work starts.",
    prompt: "What should the creator deliver?",
    placeholder:
      "e.g. One vertical 20-second café video showing the entrance and signature drink. For our own organic social accounts; needed next month.",
    goal: "ugc",
  },
  "activity-brief": {
    title: "Bring people in",
    outcome:
      "Turn your business into an experience people want to visit and share.",
    example:
      "A hostel could propose a small, safe photo walk with a public meeting point and a clear plan for guests.",
    heading: "Bring people in.",
    detail:
      "Describe one safe activity, its place and the result you want reviewed. Availability, venue permission, evidence, rewards and service costs must be agreed before launch.",
    prompt: "What should people do, and what should the result show?",
    placeholder:
      "e.g. A small daytime discovery challenge at our venue. Describe the action, intended participants and evidence; include any venue approval already arranged.",
    goal: "other",
  },
  "visibility-brief": {
    title: "Get more visibility",
    outcome:
      "Help new customers discover your business through challenges, local discovery and community activity.",
    example:
      "A surf school could propose a beginner-friendly local discovery idea and a creator story. Participation and reach would still need to be earned.",
    heading: "Plan a shareable local idea.",
    detail:
      "Tell us who you want to reach and what makes your place worth sharing. We’ll agree on the creative idea, permissions, scope and price before work starts. Reach and sales aren’t guaranteed.",
    prompt: "What should people discover about your place?",
    placeholder:
      "e.g. Help visitors discover our new café with an original local challenge and creator story. No promised views or sales.",
    goal: "launch",
  },
} as const;

export type BusinessRequestKind = keyof typeof BUSINESS_REQUESTS;

export function businessRequestKind(
  value: string | null | undefined,
): BusinessRequestKind | null {
  return value === "content-brief" ||
    value === "activity-brief" ||
    value === "visibility-brief"
    ? value
    : null;
}

export function businessRequestHref(
  kind: BusinessRequestKind,
  source: "buyer-workspace" | "home-business" = "buyer-workspace",
  city?: string | null,
) {
  const query = new URLSearchParams({
    source,
    missionType: kind,
    goal: BUSINESS_REQUESTS[kind].goal,
    budgetRange: "discuss",
    packageId: "pilot-drop",
    buyerType: "other",
  });
  if (city?.trim())
    query.set(
      "city",
      city
        .replace(/[\x00-\x1f\x7f]/g, "")
        .trim()
        .slice(0, 140),
    );
  return "/activations?" + query;
}

/** Keep retries together without merging two different kinds of buyer request. */
export function businessRequestDedupeSource(
  source: string,
  missionType?: string | null,
) {
  const kind = businessRequestKind(missionType);
  return kind ? `${source}:${kind}` : source;
}

export const BUSINESS_DEFINITION =
  "BaseDare helps businesses attract real people, create authentic content, and turn everyday experiences into opportunities for growth.";
export const BUSINESS_STEPS = [
  "Tell us your goal.",
  "We help shape a suitable campaign or activity.",
  "Review the proposed plan before anything goes live.",
] as const;
export const BUSINESS_GOAL_ORDER: readonly BusinessRequestKind[] = [
  "activity-brief",
  "content-brief",
  "visibility-brief",
];

export function confirmedBusinessEnquiry(
  payload: unknown,
): { id: string; closeRoomHref: string | null } | null {
  if (!payload || typeof payload !== "object") return null;
  const body = payload as {
    success?: unknown;
    data?: { id?: unknown; closeRoomHref?: unknown };
  };
  if (
    body.success !== true ||
    typeof body.data?.id !== "string" ||
    !/^[a-zA-Z0-9-]{8,80}$/.test(body.data.id) ||
    body.data.id === "received"
  )
    return null;
  const href = body.data.closeRoomHref;
  return {
    id: body.data.id,
    closeRoomHref:
      typeof href === "string" &&
      /^\/activations\/close\/[a-zA-Z0-9._-]+$/.test(href)
        ? href
        : null,
  };
}
