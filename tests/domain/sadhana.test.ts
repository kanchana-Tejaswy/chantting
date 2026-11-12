import { describe, expect, it } from "vitest";
import {
  BEADS_PER_ROUND,
  computeCarryForwardPreview,
  computeRoundBalances,
  recordChantingRoundInputSchema,
  updatePreferencesInputSchema,
} from "@/lib/domain/sadhana";

describe("Sadhana domain math & validation", () => {
  it("defines 108 beads per Japa Mala round", () => {
    expect(BEADS_PER_ROUND).toBe(108);
  });

  it("matches Module C automatic carry-forward formula (16 target, 5 done => 27 next day)", () => {
    const day1 = computeRoundBalances(16, 5);
    expect(day1).toEqual({ remainingBalance: 11, extraRounds: 0 });

    const day2Target = computeCarryForwardPreview({
      originalDailyTarget: 16,
      priorRemainingBalance: day1.remainingBalance,
      policy: "automatic",
    });

    expect(day2Target).toEqual({
      originalDailyTarget: 16,
      previousPendingBalance: 11,
      effectiveDailyTarget: 27,
    });
  });

  it("records extra rounds without reducing future daily targets", () => {
    const day = computeRoundBalances(16, 20);
    expect(day).toEqual({ remainingBalance: 0, extraRounds: 4 });

    const nextDay = computeCarryForwardPreview({
      originalDailyTarget: 16,
      priorRemainingBalance: day.remainingBalance,
      policy: "automatic",
    });
    expect(nextDay.effectiveDailyTarget).toBe(16);
  });

  it("supports optional, fresh_daily, and custom cap policies", () => {
    expect(
      computeCarryForwardPreview({
        originalDailyTarget: 16,
        priorRemainingBalance: 10,
        policy: "fresh_daily",
      }).effectiveDailyTarget
    ).toBe(16);

    expect(
      computeCarryForwardPreview({
        originalDailyTarget: 16,
        priorRemainingBalance: 10,
        policy: "optional",
        optionalAccepted: false,
      }).effectiveDailyTarget
    ).toBe(16);

    expect(
      computeCarryForwardPreview({
        originalDailyTarget: 16,
        priorRemainingBalance: 10,
        policy: "optional",
        optionalAccepted: true,
      }).effectiveDailyTarget
    ).toBe(26);

    expect(
      computeCarryForwardPreview({
        originalDailyTarget: 16,
        priorRemainingBalance: 10,
        policy: "custom",
        maxCarryCap: 4,
      })
    ).toEqual({
      originalDailyTarget: 16,
      previousPendingBalance: 4,
      effectiveDailyTarget: 20,
    });
  });

  it("validates round submission and preference schemas", () => {
    expect(
      recordChantingRoundInputSchema.safeParse({
        method: "japa_mala",
        idempotencyKey: "round-key-12345678",
      }).success
    ).toBe(true);

    expect(
      recordChantingRoundInputSchema.safeParse({
        method: "japa_mala",
        idempotencyKey: "short",
      }).success
    ).toBe(false);

    expect(
      updatePreferencesInputSchema.safeParse({
        daily_round_target: 0,
      }).success
    ).toBe(false);
  });
});

