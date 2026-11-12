import { z } from "zod";
import { roomShareModeSchema } from "@/lib/domain/sadhana";

export function slugifyRoomName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 46);
  return base.length >= 4 ? base : `room-${base || "sangha"}`;
}

export const createRoomSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Room name must be at least 2 characters.")
    .max(80, "Room name must be 80 characters or fewer."),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(
      /^[a-z0-9][a-z0-9-]{2,48}[a-z0-9]$/,
      "Slug must be 4–50 lowercase letters, numbers, or hyphens."
    ),
  description: z
    .string()
    .trim()
    .max(600, "Description must be 600 characters or fewer.")
    .optional(),
  visibility: z.enum(["public", "private"]),
  defaultDailyGoal: z
    .union([z.null(), z.coerce.number().int().min(1).max(192)])
    .optional(),
});

export const updateRoomSchema = z.object({
  roomId: z.uuid(),
  name: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().max(600).nullable().optional(),
  visibility: z.enum(["public", "private"]).optional(),
  defaultDailyGoal: z
    .union([z.null(), z.number().int().min(1).max(192)])
    .optional(),
  isArchived: z.boolean().optional(),
});

export const joinLeaveRoomSchema = z.object({
  roomId: z.uuid(),
  targetUserId: z.uuid().optional(),
});

export const createInvitationSchema = z.object({
  roomId: z.uuid(),
  maxUses: z.union([z.null(), z.number().int().min(1).max(500)]).optional(),
  expiresInHours: z
    .union([z.null(), z.number().int().min(1).max(720)])
    .optional(),
});

export const revokeInvitationSchema = z.object({
  invitationId: z.uuid(),
  roomId: z.uuid(),
});

export const redeemInvitationSchema = z.object({
  rawToken: z
    .string()
    .trim()
    .min(16, "Please enter a valid invitation token.")
    .max(256),
  shareMode: roomShareModeSchema.optional(),
});

export const updateMembershipPrivacySchema = z.object({
  roomId: z.uuid(),
  shareProgressMode: roomShareModeSchema,
  shareStreak: z.boolean(),
});

export const updateMemberRoleInputSchema = z.object({
  roomId: z.uuid(),
  targetUserId: z.uuid(),
  newRole: z.enum(["admin", "member"]),
});

export const createGoalSchema = z
  .object({
    roomId: z.uuid(),
    title: z.string().trim().min(2).max(120),
    description: z.string().trim().max(600).optional(),
    targetRounds: z.coerce.number().int().min(1).max(10000),
    periodType: z.enum(["daily", "weekly", "challenge"]),
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    endDate: z
      .union([z.null(), z.literal(""), z.string().regex(/^\d{4}-\d{2}-\d{2}$/)])
      .optional(),
    isVoluntary: z.boolean().default(true),
  })
  .refine(
    (v) => !v.endDate || v.endDate === "" || v.endDate >= v.startDate,
    { path: ["endDate"], message: "End date must be on or after start date." }
  );

export const deleteGoalSchema = z.object({
  roomId: z.uuid(),
  goalId: z.uuid(),
});

export const createAnnouncementSchema = z.object({
  roomId: z.uuid(),
  title: z.string().trim().min(1).max(120),
  body: z.string().trim().min(1).max(2000),
  isPinned: z.boolean().default(false),
});

export const updateAnnouncementSchema = z.object({
  roomId: z.uuid(),
  announcementId: z.uuid(),
  isPinned: z.boolean(),
});

export const deleteAnnouncementSchema = z.object({
  roomId: z.uuid(),
  announcementId: z.uuid(),
});

export const shareRoomActivitySchema = z.object({
  roomId: z.uuid(),
  activityType: z.enum([
    "daily_target_met",
    "rounds_shared",
    "challenge_joined",
  ]),
  goalId: z.uuid().optional(),
});

