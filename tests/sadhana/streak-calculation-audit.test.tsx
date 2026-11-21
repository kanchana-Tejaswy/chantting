import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import type { DailySadhana } from "@/lib/domain/sadhana";
import {
  computeCurrentStreak,
  computeLongestStreak,
  computePersonalDashboardMetrics,
} from "@/lib/sadhana/stats";
import { buildSadhanaAnalytics } from "@/lib/sadhana/analytics";
import { InWorkspaceAnalytics } from "@/components/chant/in-workspace-analytics";

function makeDaily(
  date: string,
  completedRounds: number,
  effectiveTarget = 16
): DailySadhana {
  return {
    id: `00000000-0000-4000-8000-${date.replaceAll("-", "").padStart(12, "0")}`,
    user_id: "11111111-1111-4111-8111-111111111111",
    sadhana_date: date,
    timezone_snapshot: "Asia/Kolkata",
    original_daily_target: 16,
    previous_pending_balance: Math.max(effectiveTarget - 16, 0),
    effective_daily_target: effectiveTarget,
    completed_rounds: completedRounds,
    remaining_balance: Math.max(effectiveTarget - completedRounds, 0),
    extra_rounds: Math.max(completedRounds - effectiveTarget, 0),
    policy_applied: "automatic",
    carry_forward_accepted: true,
    has_activity: completedRounds > 0,
  };
}

describe("Authoritative Sādhana Streak Engine & Regression Audits", () => {
  it("1. handles users with zero completed days (both streaks are strictly 0)", () => {
    const today = makeDaily("2026-11-21", 0, 16);
    const history: DailySadhana[] = [];

    const current = computeCurrentStreak([today], "2026-11-21");
    const longest = computeLongestStreak([today]);
    const metrics = computePersonalDashboardMetrics({
      today,
      history,
      todayDate: "2026-11-21",
    });
    const analytics = buildSadhanaAnalytics({
      rows: [today],
      todayDate: "2026-11-21",
    });

    expect(current).toBe(0);
    expect(longest).toBe(0);
    expect(metrics.currentStreak).toBe(0);
    expect(metrics.longestStreak).toBe(0);
    expect(analytics.currentStreak).toBe(0);
    expect(analytics.longestStreak).toBe(0);
  });

  it("2. handles users who have chanted but have not met their daily target (streaks remain 0)", () => {
    // Exactly matches the user's audited state: 1 round chanted on Nov 12 (target 16), 0 rounds today
    const nov12 = makeDaily("2026-11-12", 1, 16);
    const today = makeDaily("2026-11-21", 0, 111);
    const rows = [nov12, today];

    const current = computeCurrentStreak(rows, "2026-11-21");
    const longest = computeLongestStreak(rows);
    const metrics = computePersonalDashboardMetrics({
      today,
      history: [nov12],
      todayDate: "2026-11-21",
    });
    const analytics = buildSadhanaAnalytics({
      rows,
      todayDate: "2026-11-21",
    });

    expect(current).toBe(0);
    expect(longest).toBe(0);
    expect(metrics.currentStreak).toBe(0);
    expect(metrics.longestStreak).toBe(0);
    expect(analytics.currentStreak).toBe(0);
    expect(analytics.longestStreak).toBe(0);
  });

  it("3. handles one target-met day accurately (both current and longest streak are 1)", () => {
    // 3a. Target met today
    const todayMet = makeDaily("2026-11-21", 16, 16);
    expect(computeCurrentStreak([todayMet], "2026-11-21")).toBe(1);
    expect(computeLongestStreak([todayMet])).toBe(1);

    // 3b. Target met yesterday, today still in progress (does not penalize in-progress day)
    const yesterdayMet = makeDaily("2026-11-20", 16, 16);
    const todayInProgress = makeDaily("2026-11-21", 4, 16);
    const rows = [yesterdayMet, todayInProgress];

    expect(computeCurrentStreak(rows, "2026-11-21")).toBe(1);
    expect(computeLongestStreak(rows)).toBe(1);
  });

  it("4. handles multiple consecutive target-met days across calendar boundaries", () => {
    const rows = [
      makeDaily("2026-11-18", 16, 16),
      makeDaily("2026-11-19", 16, 16),
      makeDaily("2026-11-20", 20, 16),
      makeDaily("2026-11-21", 16, 16), // today fulfilled
    ];

    expect(computeCurrentStreak(rows, "2026-11-21")).toBe(4);
    expect(computeLongestStreak(rows)).toBe(4);

    // Leap year boundary test (Feb 28 -> Feb 29 -> Mar 01)
    const leapRows = [
      makeDaily("2024-02-28", 16, 16),
      makeDaily("2024-02-29", 16, 16),
      makeDaily("2024-03-01", 16, 16),
    ];
    expect(computeCurrentStreak(leapRows, "2024-03-01")).toBe(3);
    expect(computeLongestStreak(leapRows)).toBe(3);
  });

  it("5. handles a broken streak (resets current streak to 0, preserves longest streak)", () => {
    const rows = [
      makeDaily("2026-11-17", 16, 16),
      makeDaily("2026-11-18", 16, 16),
      makeDaily("2026-11-19", 16, 16), // 3-day streak
      makeDaily("2026-11-20", 0, 16),  // Missed yesterday!
      makeDaily("2026-11-21", 2, 16),  // Today in progress
    ];

    expect(computeCurrentStreak(rows, "2026-11-21")).toBe(0);
    expect(computeLongestStreak(rows)).toBe(3);
  });

  it("6. handles a current streak that is shorter than the longest streak", () => {
    const rows = [
      // Historical 5-day streak
      makeDaily("2026-11-01", 16, 16),
      makeDaily("2026-11-02", 16, 16),
      makeDaily("2026-11-03", 16, 16),
      makeDaily("2026-11-04", 16, 16),
      makeDaily("2026-11-05", 16, 16),
      // Gap
      makeDaily("2026-11-06", 0, 16),
      // Current fresh 2-day streak
      makeDaily("2026-11-20", 16, 16),
      makeDaily("2026-11-21", 16, 16),
    ];

    const current = computeCurrentStreak(rows, "2026-11-21");
    const longest = computeLongestStreak(rows);

    expect(current).toBe(2);
    expect(longest).toBe(5);
    expect(current).toBeLessThan(longest);
  });

  it("7. verifies InWorkspaceAnalytics renders 0 days instead of the previous hardcoded 1 day", () => {
    const today = makeDaily("2026-11-21", 0, 16);

    // Render with no streak passed (must default to 0, not 1)
    const htmlDefault = renderToStaticMarkup(
      <InWorkspaceAnalytics
        isOpen={true}
        onClose={() => {}}
        dailySadhana={today}
        todaySessions={[]}
        todayRecords={[]}
        mantraStats={[]}
      />
    );

    expect(htmlDefault).toContain("0 days");
    expect(htmlDefault).not.toContain("1 day");

    // Render with explicit 0
    const htmlExplicitZero = renderToStaticMarkup(
      <InWorkspaceAnalytics
        isOpen={true}
        onClose={() => {}}
        dailySadhana={today}
        todaySessions={[]}
        todayRecords={[]}
        mantraStats={[]}
        currentStreak={0}
        longestStreak={0}
      />
    );

    expect(htmlExplicitZero).toContain("0 days");
  });
});
