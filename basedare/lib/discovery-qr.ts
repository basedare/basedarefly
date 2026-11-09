import { z } from "zod";

export const DISCOVERY_QR_KIND = "discovery_qr_v1";
export const QR_DESTINATIONS = [
  "VENUE",
  "ADVENTURE",
  "EVENT",
  "MEETUP",
  "CREATOR",
] as const;
export const QrCreateSchema = z
  .object({
    slug: z.string().min(1).max(64),
    creatorCode: z.string().default("basedare"),
    contentCode: z.string().min(1).max(64),
    campaignCode: z.string().max(64).nullable().optional(),
    placementPermissionConfirmed: z.boolean().default(false),
    discoveryQr: z
      .object({
        kind: z.enum(QR_DESTINATIONS),
        key: z.string().trim().min(1).max(191),
        hostVenueSlug: z.string().trim().min(1).max(191),
        expiresInDays: z.number().int().min(1).max(90).default(30),
      })
      .strict(),
  })
  .strict();
export const QrMetadataSchema = z.object({
  kind: z.literal(DISCOVERY_QR_KIND),
  destinationKind: z.enum(QR_DESTINATIONS),
  key: z.string().min(1).max(191),
  expiresAt: z.string().datetime(),
  subjectWallet: z.string().nullable(),
  ambassadorId: z.string().nullable(),
  ambassadorWallet: z.string().nullable(),
});
export function parseDiscoveryQr(value: unknown) {
  const result = QrMetadataSchema.safeParse(value);
  return result.success ? result.data : null;
}
export function isDiscoveryQr(value: unknown) {
  return Boolean(
    value &&
      typeof value === "object" &&
      "kind" in value &&
      value.kind === DISCOVERY_QR_KIND,
  );
}
export type QrMetadata = z.infer<typeof QrMetadataSchema>;
export const QrStatusSchema = z
  .object({
    linkId: z.string().min(1).max(191),
    active: z.boolean().optional(),
    placementPermissionConfirmed: z.boolean().optional(),
  })
  .strict()
  .refine(
    (v) =>
      v.active !== undefined || v.placementPermissionConfirmed !== undefined,
    "Choose a status change.",
  );
