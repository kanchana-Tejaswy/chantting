import { z } from "zod";

export const createSankalpaInputSchema = z
  .object({
    title: z.string().trim().min(2, "Title must be at least 2 characters.").max(120),
    description: z.string().trim().max(500, "Description cannot exceed 500 characters.").optional().nullable(),
    targetRounds: z
      .number()
      .int("Target rounds must be a whole number.")
      .min(1, "Target rounds must be at least 1.")
      .max(1_000_000, "Target rounds cannot exceed 1,000,000."),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD.")
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD.")
      .optional()
      .nullable(),
    includeLifetimeRounds: z.boolean().optional(),
    initialCompletedRounds: z.number().int().min(0).max(1_000_000).optional(),
    autoPauseExisting: z.boolean().optional(),
    status: z.enum(["active", "paused"]).optional(),
  })
  .refine(
    (data) => {
      if (data.startDate && data.endDate) {
        return data.endDate >= data.startDate;
      }
      return true;
    },
    {
      message: "Target completion date cannot precede the start date.",
      path: ["endDate"],
    }
  );

export const updateSankalpaInputSchema = z
  .object({
    id: z.string().uuid("Invalid Sankalpa ID."),
    title: z.string().trim().min(2, "Title must be at least 2 characters.").max(120).optional(),
    description: z.string().trim().max(500, "Description cannot exceed 500 characters.").optional().nullable(),
    targetRounds: z
      .number()
      .int("Target rounds must be a whole number.")
      .min(1, "Target rounds must be at least 1.")
      .max(1_000_000, "Target rounds cannot exceed 1,000,000.")
      .optional(),
    addRounds: z
      .number()
      .int("Additional rounds must be a whole number.")
      .min(1, "Additional rounds must be at least 1.")
      .max(1_000_000, "Additional rounds cannot exceed 1,000,000.")
      .optional(),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start date must be YYYY-MM-DD.")
      .optional(),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End date must be YYYY-MM-DD.")
      .optional()
      .nullable(),
    status: z.enum(["active", "paused", "cancelled", "completed"]).optional(),
    autoPauseExisting: z.boolean().optional(),
  });

export const updateSankalpaStatusSchema = z.object({
  sankalpaId: z.string().uuid("Invalid Sankalpa ID."),
  status: z.enum(["active", "paused", "cancelled", "completed"]),
});

