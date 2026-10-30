import { z } from "zod";
/** A proposal in the existing founder/intake ledger, never an executable payment instruction. */
export const SponsoredBriefSchema = z
  .object({
    requestId: z.string().uuid(),
    sponsor: z.string().trim().min(2).max(140),
    objective: z.string().trim().min(5).max(400),
    activityId: z.string().max(80).optional(),
    venueSlug: z.string().max(180).optional(),
    campaignId: z.string().max(80).optional(),
    audience: z.string().trim().min(3).max(400),
    deliverable: z.string().trim().min(5).max(600),
    platforms: z
      .array(z.enum(["TIKTOK", "INSTAGRAM", "X", "ORIGINAL_MEDIA"]))
      .min(1)
      .max(4),
    evidencePolicy: z.string().trim().min(5).max(600),
    reviewCriteria: z.string().trim().min(5).max(600),
    rightsTerms: z.string().trim().min(5).max(800),
    startsOn: z.iso.date(),
    endsOn: z.iso.date(),
    model: z.enum([
      "FIXED_DELIVERABLE",
      "FUTURE_VERIFIED_VIEWS",
      "FUTURE_QUALIFIED_ACTION",
      "VENUE_PERK",
    ]),
    proposedBudgetUsd: z.number().min(0).max(1000000),
    proposedPerCreatorUsd: z.number().min(0).max(100000),
    creatorCap: z.number().int().min(1).max(1000),
    postCap: z.number().int().min(1).max(10000),
  })
  .strict()
  .refine(
    (v) => Boolean(v.activityId || v.venueSlug),
    "Choose an existing challenge or venue.",
  )
  .refine((v) => v.endsOn >= v.startsOn, "End must follow start.")
  .refine(
    (v) => v.proposedPerCreatorUsd <= v.proposedBudgetUsd,
    "Per-creator proposal exceeds total proposal.",
  );
export function sponsoredBriefState(
  input: z.infer<typeof SponsoredBriefSchema>,
) {
  return {
    ...input,
    publicationStatus: "PRIVATE_DRAFT",
    fundingStatus: "NOT_FUNDED",
    rightsStatus: "PROPOSED_NOT_ACCEPTED",
    paymentEnabled: false,
    liabilityCreated: false,
  } as const;
}
