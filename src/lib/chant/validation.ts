import { z } from "zod";
import { chantingMethodSchema } from "@/lib/domain/sadhana";

export const createSessionInputSchema = z.object({
  method: chantingMethodSchema,
  clientSessionKey: z.string().trim().min(8).max(128),
  sadhanaDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export const updateSessionInputSchema = z.object({
  sessionId: z.uuid(),
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  currentBeadCount: z.number().int().min(0).max(107).optional(),
});

export const recordRoundApiInputSchema = z.object({
  method: chantingMethodSchema,
  idempotencyKey: z.string().trim().min(8).max(128),
  sessionId: z.uuid().nullable().optional(),
  clientRecordedAt: z.iso.datetime().nullable().optional(),
});

export const undoRoundApiInputSchema = z.object({
  recordId: z.uuid(),
  reason: z.string().trim().min(1).max(200).optional(),
});

export const chantPreferencesInputSchema = z
  .object({
    tactileFeedbackEnabled: z.boolean().optional(),
    soundFeedbackEnabled: z.boolean().optional(),
    defaultCountingMethod: chantingMethodSchema.optional(),
  })
  .refine(
    (v) =>
      v.tactileFeedbackEnabled !== undefined ||
      v.soundFeedbackEnabled !== undefined ||
      v.defaultCountingMethod !== undefined,
    { message: "At least one preference field is required." }
  );

