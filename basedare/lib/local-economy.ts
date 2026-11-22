import { z } from "zod";
export const ECONOMY_RIGHTS_VERSION = "session-recording-v1";
const id = z.string().trim().min(1).max(100);
const text = (max: number) => z.string().trim().min(1).max(max);
const date = z.string().datetime({ offset: true });
const consent = z.literal(true);
export const EconomyCommand = z.discriminatedUnion("action", [
  z
    .object({
      action: z.literal("node.create"),
      slug: z.string().regex(/^[a-z0-9][a-z0-9-]{2,59}$/),
      name: text(100),
      about: text(1000),
      category: text(40),
      city: text(80),
    })
    .strict(),
  z.object({ action: z.literal("node.publish"), id, consent }).strict(),
  z.object({ action: z.literal("node.withdraw"), id }).strict(),
  z
    .object({
      action: z.literal("member.invite"),
      id,
      tag: text(80),
      role: z.enum(["ADMIN", "MEMBER"]),
    })
    .strict(),
  z
    .object({
      action: z.literal("member.respond"),
      id,
      accept: z.boolean(),
      publicConsent: z.boolean(),
    })
    .strict(),
  z.object({ action: z.literal("member.remove"), id }).strict(),
  z
    .object({
      action: z.literal("opportunity.create"),
      venueId: id,
      nodeId: id.optional(),
      targetNodeId: id.optional(),
      kind: z.enum(["OFFER", "NEED", "GIG", "COLLABORATION", "EXPERIENCE"]),
      title: text(120),
      description: text(1500),
      compensation: z.enum(["FREE", "BARTER", "PAID"]),
      amountMinor: z.number().int().min(1).max(100000000).optional(),
      currency: z.enum(["PHP", "USD"]).optional(),
      exchangeTerms: text(1000),
      startsAt: date,
      endsAt: date,
      expiresAt: date,
      capacity: z.number().int().min(1).max(30),
      placePermission: consent,
    })
    .strict(),
  z
    .object({
      action: z.literal("opportunity.request"),
      decline: z.boolean().optional(),
      id,
      message: text(500),
      termsHash: z.string().regex(/^[a-f0-9]{64}$/),
    })
    .strict(),
  z
    .object({
      action: z.literal("opportunity.decide"),
      id,
      decision: z.enum(["CONFIRMED", "DECLINED"]),
    })
    .strict(),
  z.object({ action: z.literal("opportunity.cancel"), id }).strict(),
  z.object({ action: z.literal("booking.cancel"), id }).strict(),
  z.object({ action: z.literal("booking.complete"), id }).strict(),
  z
    .object({
      action: z.literal("session.create"),
      nodeId: id.optional(),
      venueId: id,
      title: text(120),
      description: text(500),
      startsAt: date,
      endsAt: date,
      guestCapacity: z.number().int().min(1).max(30),
      recordingPolicy: z.enum(["NO_RECORDING", "SEPARATE_CONSENT"]),
      placePermission: consent,
    })
    .strict(),
  z
    .object({
      action: z.literal("session.apply"),
      id,
      role: text(60),
      application: text(500),
    })
    .strict(),
  z
    .object({
      action: z.literal("session.decide"),
      id,
      decision: z.enum(["APPROVED", "DECLINED"]),
    })
    .strict(),
  z.object({ action: z.literal("session.leave"), id }).strict(),
  z.object({ action: z.literal("session.cancel"), id }).strict(),
  z.object({ action: z.literal("session.attest"), id }).strict(),
  z
    .object({
      action: z.literal("recording.grant"),
      id,
      submissionId: id,
      processing: z.boolean(),
      publication: z.boolean(),
      destinations: z
        .array(z.enum(["BaseDare", "TikTok", "YouTube", "Instagram", "X"]))
        .max(5),
      requiredCredit: text(140),
      rightsVersion: z.literal(ECONOMY_RIGHTS_VERSION),
      rightsConfirmed: consent,
      expiresAt: date,
    })
    .strict(),
  z.object({ action: z.literal("recording.approve"), id }).strict(),
  z.object({ action: z.literal("recording.withdraw"), id }).strict(),
  z
    .object({
      action: z.literal("report"),
      kind: z.enum(["NODE", "OPPORTUNITY", "SESSION"]),
      id,
      reason: text(500),
    })
    .strict(),
]);
export type EconomyInput = z.infer<typeof EconomyCommand>;
export class EconomyError extends Error {
  constructor(message: string, public status = 400) {
    super(message);
  }
}
export function requireEconomy(
  condition: unknown,
  message: string,
  status = 409
): asserts condition {
  if (!condition) throw new EconomyError(message, status);
}
export function validateSchedule(
  startsAt: Date,
  endsAt: Date,
  now = new Date()
) {
  requireEconomy(
    startsAt > now && startsAt.getTime() <= now.getTime() + 90 * 86400000,
    "Choose a future date within 90 days."
  );
  requireEconomy(
    endsAt > startsAt && endsAt.getTime() - startsAt.getTime() <= 24 * 3600000,
    "Choose an end within 24 hours of the start."
  );
}
export function participationLabel(
  host: Date | null,
  participant: Date | null
) {
  return host && participant
    ? "Host and participant confirmed"
    : host || participant
    ? "Awaiting the other participant"
    : "Not confirmed";
}
