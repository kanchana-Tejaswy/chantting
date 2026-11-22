import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import {
  getYesterdayDateString,
  formatShortDate,
  getClientRecordedAtForDate,
} from "@/lib/chant/date-utils";
import { ChantingWorkspace } from "@/components/chant/chanting-workspace";
import type { ChantWorkspacePayload } from "@/lib/chant/types";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

describe("SMARAN — Save & Edit Yesterday Sādhana History", () => {
  it("calculates yesterday's date string correctly across month boundaries", () => {
    expect(getYesterdayDateString("2026-11-22")).toBe("2026-11-21");
    expect(getYesterdayDateString("2026-11-01")).toBe("2026-10-31");
    expect(getYesterdayDateString("2026-01-01")).toBe("2025-12-31");
  });

  it("formats short date labels accurately", () => {
    expect(formatShortDate("2026-11-21")).toBe("Nov 21");
    expect(formatShortDate("2026-11-22")).toBe("Nov 22");
  });

  it("anchors clientRecordedAt timestamp for yesterday to evening without exceeding now()", () => {
    const ts = getClientRecordedAtForDate("2026-11-21");
    expect(ts).toBeDefined();
    expect(new Date(ts).getTime()).toBeLessThanOrEqual(Date.now());
  });

  it("renders ChantingWorkspace with Sādhana Date Attribution selector and Yesterday options", () => {
    const payload: ChantWorkspacePayload = {
      userId: "11111111-1111-4111-8111-111111111111",
      userEmail: "devotee@example.org",
      displayName: "Radhika",
      timezone: "Asia/Kolkata",
      preferences: {
        dailyRoundTarget: 16,
        defaultCountingMethod: "manual",
        tactileFeedbackEnabled: true,
        soundFeedbackEnabled: false,
        carryForwardPolicy: "automatic",
      },
      dailySadhana: {
        id: "22222222-2222-4222-8222-222222222222",
        user_id: "11111111-1111-4111-8111-111111111111",
        sadhana_date: "2026-11-22",
        timezone_snapshot: "Asia/Kolkata",
        original_daily_target: 16,
        previous_pending_balance: 0,
        effective_daily_target: 16,
        completed_rounds: 8,
        remaining_balance: 8,
        extra_rounds: 0,
        policy_applied: "automatic",
        carry_forward_accepted: true,
        has_activity: true,
      },
      pendingOptionalOffer: null,
      recoverableSession: null,
      todaySessions: [],
      todayRecords: [],
      manualCounterState: {
        cumulative_names: 864,
        cumulative_rounds: 8,
        current_remainder: 0,
        last_entry: null,
        active_session: null,
      },
      manualEntries: [],
    };

    const html = renderToStaticMarkup(<ChantingWorkspace initialData={payload} />);

    // Must show Sādhana Date Attribution selector
    expect(html).toContain("Sādhana Date:");
    expect(html).toContain("Today (Nov 22)");
    expect(html).toContain("🌙 Yesterday");
    expect(html).toContain("(Nov 21)");
    expect(html).toContain("View &amp; Edit Yesterday&#x27;s History");
  });
});
