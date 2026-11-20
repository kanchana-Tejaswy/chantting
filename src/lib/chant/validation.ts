import { z } from "zod";
import { chantingMethodSchema } from "@/lib/domain/sadhana";

export const createSessionInputSchema = z.object({
  method: chantingMethodSchema,
  clientSessionKey: z.string().trim().min(8).max(128),
  sadhanaDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mantraId: z.string().uuid().nullable().optional(),
});

export const updateSessionInputSchema = z.object({
  sessionId: z.string().uuid(),
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  currentBeadCount: z.number().int().min(0).max(107).optional(),
  mantraId: z.string().uuid().nullable().optional(),
});

export const recordRoundApiInputSchema = z.object({
  method: chantingMethodSchema,
  idempotencyKey: z.string().trim().min(8).max(128),
  sessionId: z.string().uuid().nullable().optional(),
  clientRecordedAt: z.string().datetime().nullable().optional(),
  sankalpaId: z.string().uuid().nullable().optional(),
  mantraId: z.string().uuid().nullable().optional(),
});

export const undoRoundApiInputSchema = z.object({
  recordId: z.string().uuid(),
  reason: z.string().trim().min(1).max(200).optional(),
});

export const chantPreferencesInputSchema = z
  .object({
    tactileFeedbackEnabled: z.boolean().optional(),
    soundFeedbackEnabled: z.boolean().optional(),
    defaultCountingMethod: chantingMethodSchema.optional(),
    preferredMantraId: z.string().uuid().nullable().optional(),
    ambientModeEnabled: z.boolean().optional(),
    ambientSoundEnabled: z.boolean().optional(),
    ambientSoundVolume: z.number().min(0).max(1).optional(),
    paceGuidanceEnabled: z.boolean().optional(),
    paceSecondsPerBead: z.number().min(2).max(30).optional(),
  })
  .refine(
    (v) =>
      v.tactileFeedbackEnabled !== undefined ||
      v.soundFeedbackEnabled !== undefined ||
      v.defaultCountingMethod !== undefined ||
      v.preferredMantraId !== undefined ||
      v.ambientModeEnabled !== undefined ||
      v.ambientSoundEnabled !== undefined ||
      v.ambientSoundVolume !== undefined ||
      v.paceGuidanceEnabled !== undefined ||
      v.paceSecondsPerBead !== undefined,
    { message: "At least one preference field is required." }
  );
