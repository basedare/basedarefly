import { z } from 'zod';

export const conflictActionSchema = z
  .object({
    conflictId: z.string().trim().min(1).max(128),
    action: z.enum(['DISMISS_OBSERVATION', 'ACCEPT_CORRECTION', 'REQUEST_CORROBORATION']),
    selectedObservationId: z.string().trim().min(1).max(128).optional(),
    note: z.string().trim().min(3).max(500).optional(),
  })
  .strict()
  .superRefine((value, context) => {
    if (value.action === 'ACCEPT_CORRECTION' && !value.selectedObservationId) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['selectedObservationId'],
        message: 'Select the challenger observation to accept.',
      });
    }
  });

export type ConflictActionInput = z.infer<typeof conflictActionSchema>;

export function buildCorroborationMissionDraft(input: {
  conflictId: string;
  venueId: string;
  venueName: string;
  kind: string;
  subjectKey: string;
  requestedBy: string;
  requestedAt: Date;
  note?: string;
}) {
  return {
    version: 1,
    status: 'UNFUNDED_DRAFT',
    purpose: 'CONFLICT_CORROBORATION',
    conflictId: input.conflictId,
    venue: { id: input.venueId, name: input.venueName },
    assertion: { kind: input.kind, subjectKey: input.subjectKey },
    requestedBy: input.requestedBy,
    requestedAt: input.requestedAt.toISOString(),
    note: input.note ?? null,
    moneyMovementAuthorized: false,
  } as const;
}
