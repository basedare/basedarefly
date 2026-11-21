import { z } from "zod";

const short = z.string().trim().min(2).max(160);
export const ACCEPTANCE_CHECKS = {
  ios_account: "iPhone sign-in, sign-out and same-account recovery",
  android_account: "Android sign-in, sign-out and same-account recovery",
  ios_media: "iPhone contribution, review and playback",
  android_media: "Android contribution, review and playback",
  media_withdrawal: "Author withdrawal removes page, card and media access",
  email_inbox:
    "Real confirmation and requested update reach a consenting inbox",
  email_unsubscribe: "Unsubscribe and suppression prevent later updates",
  push_ios: "Consented iPhone notification delivery and correct destination",
  push_android:
    "Consented Android notification delivery and correct destination",
  paid_payout: "Authorized low-value mainnet funding and payout receipts",
  paid_refund: "Authorized targeted refund receipt and recovered state",
} as const;
export const AcceptanceSchema = z
  .object({
    check: z.enum(
      Object.keys(ACCEPTANCE_CHECKS) as [
        keyof typeof ACCEPTANCE_CHECKS,
        ...(keyof typeof ACCEPTANCE_CHECKS)[]
      ]
    ),
    result: z.enum(["passed", "failed"]),
    releaseRevision: z.string().regex(/^[a-f0-9]{40}$/),
    evidenceReference: z.string().trim().min(8).max(500),
    tester: short,
  })
  .strict();
export const PilotSchema = z
  .object({
    revision: z.number().int().min(0),
    owner: short,
    reviewer: short,
    supportEmail: z.email().max(254),
    startsAt: z.iso.datetime(),
    endsAt: z.iso.datetime(),
    targetHosts: z.number().int().min(1).max(10),
    targetCreators: z.number().int().min(1).max(20),
    targetParticipants: z.number().int().min(1).max(100),
    stopRule: z.string().trim().min(20).max(1000),
    activityIds: z
      .array(z.string().regex(/^[a-z0-9-]{2,80}$/))
      .min(1)
      .max(5),
    hosts: z
      .array(
        z
          .object({
            venueSlug: z.string().regex(/^[a-z0-9-]{2,100}$/),
            permissionReference: short,
            confirmedAt: z.iso.datetime(),
          })
          .strict()
      )
      .max(10),
    creatorTags: z.array(z.string().regex(/^@?[a-zA-Z0-9._-]{1,80}$/)).max(20),
    creatorPermissionReference: z.string().trim().max(500),
    trackingSlugs: z
      .array(z.string().regex(/^[a-z0-9][a-z0-9_-]{1,63}$/))
      .max(30)
      .default([]),
    businessEnquiryId: z
      .string()
      .regex(/^[a-z0-9]{20,40}$/)
      .nullable(),
    status: z.enum(["DRAFT", "READY_FOR_REVIEW", "PAUSED", "CLOSED"]),
  })
  .strict()
  .superRefine((p, ctx) => {
    const duration = Date.parse(p.endsAt) - Date.parse(p.startsAt);
    if (duration < 7 * 86400000 || duration > 30 * 86400000)
      ctx.addIssue({
        code: "custom",
        path: ["endsAt"],
        message: "Choose a pilot of seven to thirty days.",
      });
    if (
      new Set(p.hosts.map((h) => h.venueSlug)).size !== p.hosts.length ||
      new Set(p.creatorTags.map((t) => t.replace(/^@/, "").toLowerCase()))
        .size !== p.creatorTags.length ||
      new Set(p.activityIds).size !== p.activityIds.length
    )
      ctx.addIssue({
        code: "custom",
        message: "Remove repeated hosts, contributors or activities.",
      });
    if (p.creatorTags.length && p.creatorPermissionReference.length < 8)
      ctx.addIssue({
        code: "custom",
        path: ["creatorPermissionReference"],
        message: "Record the actual contributor permission reference.",
      });
    if (p.hosts.some((h) => Date.parse(h.confirmedAt) > Date.now()))
      ctx.addIssue({
        code: "custom",
        message: "Permission cannot be dated in the future.",
      });
    if (new Set(p.trackingSlugs).size !== p.trackingSlugs.length)
      ctx.addIssue({
        code: "custom",
        message: "Remove duplicate tracked links.",
      });
    if (
      p.status === "READY_FOR_REVIEW" &&
      (p.hosts.length < p.targetHosts ||
        p.creatorTags.length < p.targetCreators ||
        !p.trackingSlugs.length)
    )
      ctx.addIssue({
        code: "custom",
        message:
          "Record the target host and contributor permissions and actual tracked links before requesting review.",
      });
  });
export type TakeoffPilot = z.infer<typeof PilotSchema>;
export const PILOT_KEY = "takeoff-pilot:siargao:v1";
export const PILOT_EVENT = "TAKEOFF_PILOT";
export const ACCEPTANCE_EVENT = "TAKEOFF_ACCEPTANCE";
