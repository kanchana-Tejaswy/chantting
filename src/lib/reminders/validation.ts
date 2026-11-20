import { z } from "zod";

export const createReminderSchema = z.object({
  title: z.string().trim().min(2, "Reminder title must be at least 2 characters").max(100),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/, "Time must be in HH:MM format"),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1, "Select at least one day"),
  isEnabled: z.boolean().optional().default(true),
  reminderType: z.enum(["browser", "in_app"]).optional().default("browser"),
});

export const updateReminderSchema = z.object({
  id: z.string().uuid("Invalid reminder ID"),
  title: z.string().trim().min(2).max(100).optional(),
  timeOfDay: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/).optional(),
  daysOfWeek: z.array(z.number().int().min(0).max(6)).min(1).optional(),
  isEnabled: z.boolean().optional(),
  reminderType: z.enum(["browser", "in_app"]).optional(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
export type UpdateReminderInput = z.infer<typeof updateReminderSchema>;

