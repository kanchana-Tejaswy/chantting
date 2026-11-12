import { z } from "zod";
import { isValidIanaTimezone } from "@/lib/auth/validation";
import {
  carryForwardPolicySchema,
  chantingMethodSchema,
  roomShareModeSchema,
} from "@/lib/domain/sadhana";

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "hi", label: "हिन्दी (Hindi)" },
  { code: "sa", label: "संस्कृतम् (Sanskrit)" },
] as const;

const timeHHMMSSSchema = z
  .string()
  .trim()
  .regex(/^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/, "Enter a valid 24-hour time (HH:MM).")
  .transform((v) => (v.length === 5 ? `${v}:00` : v));

export const accountProfileUpdateSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(80, "Display name must be 80 characters or fewer."),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null))
    .refine(
      (v) => v === null || /^[a-z0-9][a-z0-9_-]{2,30}[a-z0-9]$/.test(v),
      "Username must be 4–32 lowercase letters, numbers, hyphens, or underscores."
    ),
  bio: z
    .string()
    .trim()
    .max(400, "Bio must be 400 characters or fewer.")
    .optional()
    .nullable()
    .transform((v) => (v && v.length > 0 ? v : null)),
  timezone: z
    .string()
    .trim()
    .refine(isValidIanaTimezone, "Please choose a valid IANA timezone."),
  preferredLanguage: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z]{2,8}(-[a-z]{2,8})?$/, "Invalid language code.")
    .default("en"),
});

export const accountPreferencesUpdateSchema = z.object({
  dailyRoundTarget: z.coerce
    .number()
    .int("Daily target must be a whole number.")
    .min(1, "Daily target must be at least 1 round.")
    .max(192, "Daily target cannot exceed 192 rounds."),
  carryForwardPolicy: carryForwardPolicySchema,
  maxCarryCap: z
    .union([z.literal(""), z.null(), z.coerce.number().int().min(0).max(500)])
    .optional()
    .transform((v) =>
      v === "" || v === undefined || v === null ? null : v
    ),
  defaultCountingMethod: chantingMethodSchema,
  tactileFeedbackEnabled: z.boolean(),
  soundFeedbackEnabled: z.boolean(),
  reducedMotionPreference: z.boolean(),
  publicProfileEnabled: z.boolean(),
  defaultRoomShareMode: roomShareModeSchema,
  shareStreakInRooms: z.boolean(),
  dailyReminderEnabled: z.boolean(),
  dailyReminderTime: z
    .union([z.literal(""), z.null(), timeHHMMSSSchema])
    .optional()
    .transform((v) =>
      v === "" || v === undefined || v === null ? null : v
    ),
  quietHoursEnabled: z.boolean(),
  quietHoursStart: timeHHMMSSSchema.default("22:00:00"),
  quietHoursEnd: timeHHMMSSSchema.default("05:00:00"),
  roomNotificationsEnabled: z.boolean(),
  roomGoalNotificationsEnabled: z.boolean(),
  wisdomNotificationsEnabled: z.boolean(),
  platformUpdatesEnabled: z.boolean(),
});

export const notificationActionSchema = z
  .object({
    action: z.enum(["mark_read", "mark_all_read", "dismiss"]),
    notificationId: z.uuid().optional(),
  })
  .refine(
    (v) => v.action === "mark_all_read" || Boolean(v.notificationId),
    "Notification ID is required for single-item actions."
  );

export const accountDeleteConfirmSchema = z.object({
  confirmPhrase: z.literal("DELETE MY ACCOUNT", {
    error: 'Please type exact phrase "DELETE MY ACCOUNT" to confirm.',
  }),
  confirmEmail: z
    .string()
    .trim()
    .toLowerCase()
    .optional()
    .default(""),
});

