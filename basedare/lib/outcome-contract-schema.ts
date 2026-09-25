import { z } from 'zod';

import { CONTENT_RIGHTS_VERSION } from '@/lib/content-delivery';

export const ContentDeliverySchema = z.object({
  termsVersion: z.literal(CONTENT_RIGHTS_VERSION),
  buyerName: z.string().trim().min(2).max(160),
  assetType: z.enum(['PHOTO', 'VIDEO']),
  format: z.string().trim().min(3).max(240),
  acceptanceCriteria: z.string().trim().min(10).max(1000),
  posting: z.enum(['NONE', 'PUBLIC_POST']),
  postingInstructions: z.string().max(500),
  deadline: z.string().datetime(),
  revisionLimit: z.literal(0),
}).refine((value) => value.posting !== 'PUBLIC_POST' || value.postingInstructions.trim().length >= 10, 'Describe the posting account, disclosure and required availability window.');

import { ACTIVE_OUTCOME_CONTRACT_FAMILIES } from '@/lib/outcome-contracts';

export const OutcomeContractRequestSchema = z.object({
  contentDelivery: ContentDeliverySchema.optional(),
  family: z.enum(ACTIVE_OUTCOME_CONTRACT_FAMILIES).optional(),
  buyerQuestion: z.string().min(3).max(500).optional(),
  maximumObservationAgeHours: z.number().int().min(1).max(168).optional(),
}).optional();
