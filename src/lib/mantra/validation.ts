import { z } from "zod";

export const createMantraSchema = z.object({
  name: z.string().trim().min(2, "Mantra name must be at least 2 characters").max(120),
  sanskrit: z.string().trim().min(1, "Sanskrit text is required").max(1000),
  transliteration: z.string().trim().min(1, "Transliteration is required").max(1000),
  meaning: z.string().trim().max(600).optional().nullable(),
});

export const updateMantraSchema = createMantraSchema.extend({
  id: z
    .string()
    .trim()
    .regex(
      /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/,
      "Invalid mantra ID"
    ),
});

export type CreateMantraInput = z.infer<typeof createMantraSchema>;
export type UpdateMantraInput = z.infer<typeof updateMantraSchema>;

