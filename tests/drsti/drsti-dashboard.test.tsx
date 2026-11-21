import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { buildSadhanaAnalytics } from "@/lib/sadhana/analytics";
import type { DailySadhana } from "@/lib/domain/sadhana";
import type { SankalpaRecord } from "@/lib/sankalpa/types";
import { computePersonalDashboardMetrics } from "@/lib/sadhana/stats";
import { DrstiDashboard } from "@/components/drsti/drsti-dashboard";

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

const mockActiveSankalpa: SankalpaRecord = {
  id: "sankalpa-1",
  user_id: "11111111-1111-4111-8111-111111111111",
  title: "Kartika Vrata 108 Vow",
  description: "Devotional commitment of 108 rounds during holy Kartika month",
  target_rounds: 108,
  completed_rounds: 84,
  start_date: "2026-11-01",
  end_date: "2026-11-30",
  status: "active",
  completed_at: null,
  created_at: "2026-11-01T00:00:00.000Z",
  updated_at: "2026-11-15T00:00:00.000Z",
};

describe("DṚṢṬI Personal Spiritual Progress Dashboard", () => {
  it("renders the complete spiritual dashboard with all 6 required sections for an active practitioner", () => {
    const todayRow = makeDaily("2026-11-21", 12, 16);
    const history = [
      makeDaily("2026-11-18", 16, 16),
      makeDaily("2026-11-19", 16, 16),
      makeDaily("2026-11-20", 20, 16),
      todayRow,
    ];

    const analytics = buildSadhanaAnalytics({
      rows: history,
      todayDate: "2026-11-21",
      selectedYear: 2026,
      selectedMonth: 10, // November (0-based: 10)
    });

    const metrics = computePersonalDashboardMetrics({
      today: todayRow,
      history,
      todayDate: "2026-11-21",
    });

    const html = renderToStaticMarkup(
      <DrstiDashboard
        displayName="Radha Damodara Dasa"
        timezone="Asia/Kolkata"
        todayDate="2026-11-21"
        todaySadhana={todayRow}
        metrics={metrics}
        analytics={analytics}
        activeSankalpa={mockActiveSankalpa}
        sankalpas={[mockActiveSankalpa]}
        initialDayDetail={{
          date: "2026-11-21",
          hasRecord: true,
          dailySadhana: todayRow,
          sessions: [],
          records: [],
          ledgerEntry: null,
        }}
      />
    );

    // Section A: Welcome and overview
    expect(html).toContain("Hare Krishna, Radha Damodara Dasa");
    expect(html).toContain("DṚṢṬI · Spiritual Vision");
    expect(html).toContain("(Asia/Kolkata)");
    expect(html).toContain("Continue Chanting");
    expect(html).toContain("12 of 16 Rounds");
    expect(html).toContain("4"); // remaining rounds
    expect(html).toContain("Day Streak");
    expect(html).toContain("Lifetime Rounds");

    // Section B: Sankalpa spotlight
    expect(html).toContain("Active Sankalpa");
    expect(html).toContain("Kartika Vrata 108 Vow");
    expect(html).toContain("108"); // Pledged rounds
    expect(html).toContain("84"); // Completed rounds
    expect(html).toContain("24"); // Remaining commitment
    expect(html).toContain("78%"); // Progress percentage (84/108 = 78%)

    // Section C: Chanting trends
    expect(html).toContain("Chanting Trends &amp; Rhythm");
    expect(html).toContain("Month-over-Month Comparison:");

    // Section D: Consistency calendar
    expect(html).toContain("Annual Consistency Calendar (2026)");
    expect(html).toContain("href=\"/drsti?year=2025\"");

    // Section E: Personal insights
    expect(html).toContain("Personal Devotional Insights");
    expect(html).toContain("Average Rhythm");
    expect(html).toContain("Chanting Days");
    expect(html).toContain("Personal Best");
    expect(html).toContain("Longest Streak");
    expect(html).toContain("Target Success");

    // Section F: Lifetime spiritual journey
    expect(html).toContain("Lifetime Spiritual Journey");
    expect(html).toContain("Annual Progress Summary");
    expect(html).toContain("Devotional Milestones");
  });

  it("handles practitioners with no active Sankalpa gracefully with an inviting empty state", () => {
    const todayRow = makeDaily("2026-11-21", 0, 16);
    const analytics = buildSadhanaAnalytics({
      rows: [todayRow],
      todayDate: "2026-11-21",
      selectedYear: 2026,
    });

    const metrics = computePersonalDashboardMetrics({
      today: todayRow,
      history: [todayRow],
      todayDate: "2026-11-21",
    });

    const html = renderToStaticMarkup(
      <DrstiDashboard
        displayName="Govinda"
        timezone="America/New_York"
        todayDate="2026-11-21"
        todaySadhana={todayRow}
        metrics={metrics}
        analytics={analytics}
        activeSankalpa={null}
        sankalpas={[]}
        initialDayDetail={{
          date: "2026-11-21",
          hasRecord: true,
          dailySadhana: todayRow,
          sessions: [],
          records: [],
          ledgerEntry: null,
        }}
      />
    );

    expect(html).toContain("Begin a Sacred Sankalpa Vow");
    expect(html).toContain("Establish Sankalpa");
    expect(html).toContain("href=\"/sadhana#sankalpa\"");
  });

  it("displays fulfilled celebration state when today's target is accomplished or exceeded", () => {
    const todayRow = makeDaily("2026-11-21", 18, 16);
    const analytics = buildSadhanaAnalytics({
      rows: [todayRow],
      todayDate: "2026-11-21",
      selectedYear: 2026,
    });

    const metrics = computePersonalDashboardMetrics({
      today: todayRow,
      history: [todayRow],
      todayDate: "2026-11-21",
    });

    const html = renderToStaticMarkup(
      <DrstiDashboard
        displayName="Chaitanya"
        timezone="Asia/Kolkata"
        todayDate="2026-11-21"
        todaySadhana={todayRow}
        metrics={metrics}
        analytics={analytics}
        activeSankalpa={null}
        sankalpas={[]}
        initialDayDetail={{
          date: "2026-11-21",
          hasRecord: true,
          dailySadhana: todayRow,
          sessions: [],
          records: [],
          ledgerEntry: null,
        }}
      />
    );

    expect(html).toContain("Daily Target Fulfilled");
    expect(html).toContain("+2 bonus rounds offered");
  });
});
