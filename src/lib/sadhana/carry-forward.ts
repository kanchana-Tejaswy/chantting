import { z } from "zod";
import { carryForwardPolicySchema } from "@/lib/domain/sadhana";

export interface CarryForwardLedgerEntry {
  id: number;
  from_date: string;
  to_date: string;
  policy_applied: "automatic" | "optional" | "fresh_daily" | "custom";
  source_remaining_balance: number;
  carried_amount: number;
  notes: string | null;
  created_at: string;
}

export interface PendingOptionalCarryOffer {
  sadhanaDate: string;
  fromDate: string;
  pendingRounds: number;
}

export interface UnappliedPendingNotice {
  fromDate: string;
  sourceRemaining: number;
  carriedAmount: number;
  unappliedRounds: number;
  policyApplied: CarryForwardLedgerEntry["policy_applied"];
}

export const resolveOptionalCarryForwardSchema = z.object({
  sadhanaDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  accept: z.boolean(),
});

export const updateCarryForwardPolicyInputSchema = z.object({
  policy: carryForwardPolicySchema,
  maxCarryCap: z
    .union([z.null(), z.number().int().min(0).max(500)])
    .optional(),
  applyToToday: z.boolean().default(false),
  todayDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

/**
 * Derives an awaiting optional carry-forward decision offer when today's
 * Daily Sadhana row uses 'optional' policy and carry_forward_accepted is NULL.
 */
export function getPendingOptionalCarryOffer(params: {
  todayDate: string;
  policyApplied: string;
  carryForwardAccepted: boolean | null;
  ledger: CarryForwardLedgerEntry[];
}): PendingOptionalCarryOffer | null {
  if (
    params.policyApplied !== "optional" ||
    params.carryForwardAccepted !== null
  ) {
    return null;
  }

  const todayEntry = params.ledger.find(
    (entry) => entry.to_date === params.todayDate
  );

  if (!todayEntry || todayEntry.source_remaining_balance <= 0) {
    return null;
  }

  return {
    sadhanaDate: params.todayDate,
    fromDate: todayEntry.from_date,
    pendingRounds: todayEntry.source_remaining_balance,
  };
}

/**
 * Computes any pending rounds from the prior day that were not added to today's
 * target (e.g., due to custom cap, fresh_daily, or declined optional carry-forward),
 * so unfinished rounds remain visibly accounted for.
 */
export function getUnappliedPendingNotice(params: {
  todayDate: string;
  ledger: CarryForwardLedgerEntry[];
}): UnappliedPendingNotice | null {
  const todayEntry = params.ledger.find(
    (entry) => entry.to_date === params.todayDate
  );
  if (!todayEntry) return null;

  const diff = todayEntry.source_remaining_balance - todayEntry.carried_amount;
  if (diff <= 0) return null;

  return {
    fromDate: todayEntry.from_date,
    sourceRemaining: todayEntry.source_remaining_balance,
    carriedAmount: todayEntry.carried_amount,
    unappliedRounds: diff,
    policyApplied: todayEntry.policy_applied,
  };
}
