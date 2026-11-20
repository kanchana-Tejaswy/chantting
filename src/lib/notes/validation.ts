import { z } from "zod";

export const saveSessionNoteSchema = z.object({
  sessionId: z.string().uuid("Invalid session ID"),
  content: z.string().trim().min(1, "Reflection note cannot be empty").max(5000),
  isPrivate: z.boolean().optional().default(true),
});

export type SaveSessionNoteInput = z.infer<typeof saveSessionNoteSchema>;

