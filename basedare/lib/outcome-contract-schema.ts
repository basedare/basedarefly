import { z } from 'zod';

import { ACTIVE_OUTCOME_CONTRACT_FAMILIES } from '@/lib/outcome-contracts';

export const OutcomeContractRequestSchema = z.object({
  family: z.enum(ACTIVE_OUTCOME_CONTRACT_FAMILIES).optional(),
  buyerQuestion: z.string().min(3).max(500).optional(),
  maximumObservationAgeHours: z.number().int().min(1).max(168).optional(),
}).optional();
