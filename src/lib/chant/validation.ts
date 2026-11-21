import { z } from "zod";
import { chantingMethodSchema } from "@/lib/domain/sadhana";

export const uuidSchema = z
  .string()
  .trim()
  .regex(
    /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
    "Invalid UUID format"
  );

export const optionalUuidSchema = z
  .union([
    uuidSchema,
    z.literal("").transform(() => null),
  ])
  .nullable()
  .optional();

export const createSessionInputSchema = z.object({
  method: chantingMethodSchema,
  clientSessionKey: z.string().trim().min(8).max(128),
  sadhanaDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  mantraId: optionalUuidSchema,
});

export const updateSessionInputSchema = z.object({
  sessionId: uuidSchema,
  status: z.enum(["active", "paused", "completed", "abandoned"]).optional(),
  currentBeadCount: z.number().int().min(0).max(107).optional(),
  mantraId: optionalUuidSchema,
});

export const recordRoundApiInputSchema = z.object({
  method: chantingMethodSchema,
  idempotencyKey: z.string().trim().min(8).max(128),
  sessionId: optionalUuidSchema,
  clientRecordedAt: z.string().datetime().nullable().optional(),
  sankalpaId: optionalUuidSchema,
  mantraId: optionalUuidSchema,
});

export const undoRoundApiInputSchema = z.object({
  recordId: uuidSchema,
  reason: z.string().trim().min(1).max(200).optional(),
});

export const recordManualNamesApiInputSchema = z.object({
  namesCount: z.number().int().positive().max(10_000_000),
  idempotencyKey: z.string().trim().min(8).max(128),
  sessionId: optionalUuidSchema,
  startNewSession: z.boolean().optional().default(false),
  clientRecordedAt: z.string().datetime().nullable().optional(),
  sankalpaId: optionalUuidSchema,
  mantraId: optionalUuidSchema,
});

export const undoManualNameEntryApiInputSchema = z.object({
  entryId: uuidSchema,
  reason: z.string().trim().min(1).max(200).optional(),
});

export const chantPreferencesInputSchema = z
  .object({
    tactileFeedbackEnabled: z.boolean().optional(),
    soundFeedbackEnabled: z.boolean().optional(),
    defaultCountingMethod: chantingMethodSchema.optional(),
    preferredMantraId: optionalUuidSchema,
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
