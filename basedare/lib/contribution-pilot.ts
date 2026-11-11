import { z } from "zod";
import { ACTIVITY_SUGGESTIONS } from "./home-activities";

export const PILOT_CAMPAIGN_EVENT = "CONTRIBUTION_PILOT_CAMPAIGN";
export const PILOT_AWARD_EVENT = "CONTRIBUTION_PILOT_AWARD";
export const PILOT_AUDIT_EVENT = "CONTRIBUTION_PILOT_AUDIT";
export const PILOT_XP_AWARD = "xp:contribution-pilot:award:v1";
export const PILOT_XP_REVERSAL = "xp:contribution-pilot:reversal:v1";
export const PILOT_LIMIT = 100;
export const PILOT_NOTICE =
  "Non-cash XP only. XP is separate from reputation, attendance claims, money and eligibility for future opportunities. No payment or prize is promised.";

const id = z
  .string()
  .trim()
  .min(1)
  .max(191)
  .regex(/^[a-zA-Z0-9_-]+$/);
export const pilotIdSchema = id;
export const pilotSourceKindSchema = z.enum([
  "VENUE_CHECK_IN",
  "REVIEWED_CREATION",
]);
export type PilotSourceKind = z.infer<typeof pilotSourceKindSchema>;
export const pilotPolicySchema = z
  .object({
    version: z.literal(1),
    title: z.string().trim().min(5).max(100),
    description: z.string().trim().min(10).max(600),
    startsAt: z.string().datetime({ offset: true }),
    endsAt: z.string().datetime({ offset: true }),
    activityIds: z
      .array(id)
      .min(1)
      .max(12)
      .refine(
        (ids) =>
          new Set(ids).size === ids.length &&
          ids.every((activityId) =>
            ACTIVITY_SUGGESTIONS.some((a) => a.id === activityId)
          ),
        "Use distinct authored activities."
      ),
    venueId: id.nullable(),
    xp: z
      .object({
        venueVisit: z.number().int().min(0).max(100),
        reviewedCreation: z.number().int().min(0).max(100),
        maxPerPerson: z.number().int().min(1).max(1000),
      })
      .strict(),
  })
  .strict()
  .superRefine((policy, ctx) => {
    const start = Date.parse(policy.startsAt),
      end = Date.parse(policy.endsAt);
    if (end <= start || end - start > 91 * 86400000)
      ctx.addIssue({
        code: "custom",
        message: "Use a genuine window of at most 91 days.",
      });
    if (!policy.xp.venueVisit && !policy.xp.reviewedCreation)
      ctx.addIssue({
        code: "custom",
        message: "Enable at least one contribution type.",
      });
    if (policy.xp.venueVisit && !policy.venueId)
      ctx.addIssue({
        code: "custom",
        message: "Venue visits require a canonical venue.",
      });
  });
export type PilotPolicy = z.infer<typeof pilotPolicySchema>;
export const pilotCommandSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), policy: pilotPolicySchema }).strict(),
  z
    .object({ action: z.enum(["activate", "pause", "close"]), campaignId: id })
    .strict(),
  z
    .object({
      action: z.literal("award"),
      campaignId: id,
      sourceKind: pilotSourceKindSchema,
      sourceId: id,
      publicLeaderboardConsent: z.boolean(),
    })
    .strict(),
  z
    .object({
      action: z.literal("reverse"),
      awardId: id,
      reason: z.string().trim().min(5).max(300),
    })
    .strict(),
  z
    .object({
      action: z.literal("withdrawLeaderboardConsent"),
      awardId: id,
      reason: z.string().trim().min(5).max(300),
    })
    .strict(),
]);
export type PilotCommand = z.infer<typeof pilotCommandSchema>;
export type PilotCampaign = {
  id: string;
  status: string;
  policy: PilotPolicy;
  createdAt: string;
};
export type PilotAward = {
  id: string;
  campaignId: string;
  sourceKind: PilotSourceKind;
  sourceId: string;
  xp: number;
  label: string;
  publicLeaderboardConsent: boolean;
  leaderboardConsentWithdrawn: boolean;
  reversed: boolean;
  current: boolean;
  createdAt: string;
};
export type PilotAdminSnapshot = {
  enabled: boolean;
  campaigns: PilotCampaign[];
  campaignsLimited: boolean;
  awards: PilotAward[];
  awardsLimited: boolean;
  notice: string;
};
export type PilotStanding = {
  rank: number;
  tag: string;
  profileHref: string;
  xp: number;
  contributions: number;
};
export type PublicPilot = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  activityIds: string[];
  venue: { name: string; href: string } | null;
  rules: {
    venueVisitXp: number;
    reviewedCreationXp: number;
    maxXpPerPerson: number;
    repeatRule: string;
  };
  standings: PilotStanding[] | null;
  standingsAvailable: boolean;
  asOf: string;
  notice: string;
};

export function contributionPilotEnabled() {
  return process.env.CONTRIBUTION_PILOT_ENABLED === "true";
}
export function pilotWindowOpen(policy: PilotPolicy, at: Date) {
  return (
    Date.parse(policy.startsAt) <= at.getTime() &&
    at.getTime() < Date.parse(policy.endsAt)
  );
}
export function pilotSourceKey(kind: PilotSourceKind, sourceId: string) {
  return `${kind}:${sourceId}`;
}
