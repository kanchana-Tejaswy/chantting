import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSadhanaAnalytics } from "@/lib/sadhana/analytics";
import type { DailySadhana } from "@/lib/domain/sadhana";
import { AnalyticsView } from "@/components/sadhana/analytics-view";

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

describe("Phase 6 AnalyticsView & ConsistencyHeatmap rendering", () => {
  it("renders thoughtful empty state when user has zero completed rounds", () => {
    const analytics = buildSadhanaAnalytics({
      rows: [],
      todayDate: "2026-11-11",
      selectedYear: 2026,
    });

    const html = renderToStaticMarkup(
      <AnalyticsView
        displayName="Govinda"
        timezone="Asia/Kolkata"
        analytics={analytics}
        initialDayDetail={{
          date: "2026-11-11",
          hasRecord: false,
          dailySadhana: null,
          sessions: [],
          records: [],
          ledgerEntry: null,
        }}
      />
    );

    expect(html).toContain("Analytics grow naturally with your practice");
    expect(html).toContain("No record (missing / pre-join)");
    expect(html).toContain("0 rounds recorded");
    expect(html).toContain("Personal Consistency Milestones");
  });

  it("renders populated annual heatmap, year navigation, monthly comparison, and daily detail", () => {
    const todayRow = makeDaily("2026-11-11", 18, 16);
    const analytics = buildSadhanaAnalytics({
      rows: [
        makeDaily("2026-11-09", 0, 16),
        makeDaily("2026-11-10", 16, 16),
        todayRow,
      ],
      todayDate: "2026-11-11",
      selectedYear: 2026,
    });

    const html = renderToStaticMarkup(
      <AnalyticsView
        displayName="Govinda"
        timezone="Asia/Kolkata"
        analytics={analytics}
        initialDayDetail={{
          date: "2026-11-11",
          hasRecord: true,
          dailySadhana: todayRow,
          sessions: [],
          records: [],
          ledgerEntry: null,
        }}
      />
    );

    expect(html).toContain("Annual Consistency Calendar (2026)");
    expect(html).toContain("Monthly Progress Comparison (2026)");
    expect(html).toContain("Daily Detail · 2026-11-11");
    expect(html).toContain("href=\"/sadhana/analytics?year=2025\"");
    expect(html).toContain("34"); // 16 + 18 lifetime rounds
    expect(html).toContain("First Day Offered");
  });
});

