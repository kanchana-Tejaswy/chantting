import { z } from "zod";
import { carryForwardPolicySchema } from "@/lib/domain/sadhana";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email("Please enter a valid email address."));

export const signInSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password cannot exceed 128 characters."),
});

export const signUpSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Display name is required.")
    .max(80, "Display name must be 80 characters or fewer."),
  email: emailSchema,
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password cannot exceed 128 characters."),
});

export const emailOnlySchema = z.object({
  email: emailSchema,
});

export const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, "New password must be at least 8 characters.")
      .max(128, "New password cannot exceed 128 characters."),
    confirmPassword: z.string().min(1, "Please confirm your new password."),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

/**
 * Validates an IANA timezone string using the host ICU database.
 */
export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || timezone.trim().length === 0) return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch {
    return false;
  }
}

export const onboardingSchema = z
  .object({
    displayName: z
      .string()
      .trim()
      .min(1, "Display name is required.")
      .max(80, "Display name must be 80 characters or fewer."),
    timezone: z
      .string()
      .trim()
      .refine(isValidIanaTimezone, "Please choose a valid IANA timezone."),
    dailyRoundTarget: z.coerce
      .number()
      .int("Target rounds must be a whole number.")
      .min(1, "Daily target must be at least 1 round.")
      .max(192, "Daily target cannot exceed 192 rounds."),
    carryForwardPolicy: carryForwardPolicySchema,
    maxCarryCap: z
      .union([z.literal(""), z.coerce.number().int().min(0).max(500)])
      .optional(),
  })
  .transform((val) => ({
    ...val,
    customCarryRule:
      val.carryForwardPolicy === "custom" && typeof val.maxCarryCap === "number"
        ? { max_carry_cap: val.maxCarryCap }
        : {},
  }));

/**
 * Prevents open-redirect vulnerabilities on auth callbacks and login redirects.
 */
export function sanitizeRedirectPath(
  candidate: string | null | undefined,
  fallback = "/sadhana"
): string {
  if (!candidate) return fallback;
  const trimmed = candidate.trim();
  if (!trimmed.startsWith("/")) return fallback;
  if (trimmed.startsWith("//") || trimmed.startsWith("/\\")) return fallback;
  return trimmed;
}
