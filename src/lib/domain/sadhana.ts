import { z } from "zod";

export const CARRY_FORWARD_POLICIES = [
  "automatic",
  "optional",
  "fresh_daily",
  "custom",
] as const;

export const CHANTING_METHODS = ["manual", "japa_mala"] as const;

export const ROOM_SHARE_MODES = ["full", "completion_only", "private"] as const;

export const carryForwardPolicySchema = z.enum(CARRY_FORWARD_POLICIES);
export const chantingMethodSchema = z.enum(CHANTING_METHODS);
export const roomShareModeSchema = z.enum(ROOM_SHARE_MODES);

export const BEADS_PER_ROUND = 108;

export const dailySadhanaSchema = z.object({
  id: z.uuid(),
  user_id: z.uuid(),
  sadhana_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  timezone_snapshot: z.string().min(1),
  original_daily_target: z.number().int().min(1).max(192),
  previous_pending_balance: z.number().int().min(0),
  effective_daily_target: z.number().int().min(1),
  completed_rounds: z.number().int().min(0),
  remaining_balance: z.number().int().min(0),
  extra_rounds: z.number().int().min(0),
  policy_applied: carryForwardPolicySchema,
  carry_forward_accepted: z.boolean().nullable(),
  has_activity: z.boolean(),
});

export type DailySadhana = z.infer<typeof dailySadhanaSchema>;

export const recordChantingRoundInputSchema = z.object({
  method: chantingMethodSchema,
  idempotencyKey: z.string().trim().min(8).max(128),
  sessionId: z.uuid().nullable().optional(),
  clientRecordedAt: z.iso.datetime().nullable().optional(),
});

export type RecordChantingRoundInput = z.infer<
  typeof recordChantingRoundInputSchema
>;

export const customCarryRuleSchema = z
  .object({
    max_carry_cap: z.number().int().min(0).max(500).optional(),
  })
  .passthrough();

export const updatePreferencesInputSchema = z.object({
  daily_round_target: z.number().int().min(1).max(192).optional(),
  carry_forward_policy: carryForwardPolicySchema.optional(),
  custom_carry_rule: customCarryRuleSchema.optional(),
  default_counting_method: chantingMethodSchema.optional(),
  tactile_feedback_enabled: z.boolean().optional(),
  sound_feedback_enabled: z.boolean().optional(),
  reduced_motion_preference: z.boolean().optional(),
  public_profile_enabled: z.boolean().optional(),
  default_room_share_mode: roomShareModeSchema.optional(),
  share_streak_in_rooms: z.boolean().optional(),
});

export interface CarryForwardPreviewInput {
  originalDailyTarget: number;
  priorRemainingBalance: number;
  policy: z.infer<typeof carryForwardPolicySchema>;
  optionalAccepted?: boolean;
  maxCarryCap?: number;
}

export interface CarryForwardPreviewResult {
  originalDailyTarget: number;
  previousPendingBalance: number;
  effectiveDailyTarget: number;
}

/**
 * Pure reference calculation matching PostgreSQL Module C carry-forward rules.
 * Database RPC remains the authoritative source of truth.
 */
export function computeCarryForwardPreview(
  input: CarryForwardPreviewInput
): CarryForwardPreviewResult {
  const original = Math.max(1, Math.trunc(input.originalDailyTarget));
  const prior = Math.max(0, Math.trunc(input.priorRemainingBalance));

  let carried = 0;
  switch (input.policy) {
    case "automatic":
      carried = prior;
      break;
    case "fresh_daily":
      carried = 0;
      break;
    case "optional":
      carried = input.optionalAccepted ? prior : 0;
      break;
    case "custom":
      carried =
        typeof input.maxCarryCap === "number"
          ? Math.min(prior, Math.max(0, Math.trunc(input.maxCarryCap)))
          : prior;
      break;
  }

  return {
    originalDailyTarget: original,
    previousPendingBalance: carried,
    effectiveDailyTarget: original + carried,
  };
}

/**
 * Computes remaining and extra rounds without reducing future targets on extra rounds.
 */
export function computeRoundBalances(
  effectiveDailyTarget: number,
  completedRounds: number
): { remainingBalance: number; extraRounds: number } {
  const effective = Math.max(1, Math.trunc(effectiveDailyTarget));
  const completed = Math.max(0, Math.trunc(completedRounds));

  return {
    remainingBalance: Math.max(effective - completed, 0),
    extraRounds: Math.max(completed - effective, 0),
  };
}

