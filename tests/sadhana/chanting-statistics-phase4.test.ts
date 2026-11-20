import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import type { DailySadhana } from "@/lib/domain/sadhana";
import {
  computePersonalDashboardMetrics,
} from "@/lib/sadhana/stats";
import {
  buildSadhanaAnalytics,
} from "@/lib/sadhana/analytics";

const USER_STAT_A = "aaaaaaaa-4444-4aaa-8aaa-aaaaaaaaaaaa";
const USER_STAT_B = "bbbbbbbb-4444-4bbb-8bbb-bbbbbbbbbbbb";

interface RecordRoundRpcResult {
  duplicate: boolean;
  record: {
    id: string;
    user_id: string;
    sadhana_date: string;
    method: string;
    sankalpa_id: string | null;
    is_reverted: boolean;
  };
  daily_sadhana: {
    sadhana_date: string;
    completed_rounds: number;
    remaining_balance: number;
    effective_daily_target: number;
  };
  sankalpa: {
    id: string;
    completed_rounds: number;
    target_rounds: number;
    status: string;
  } | null;
}

interface UndoRoundRpcResult {
  already_reverted: boolean;
  record: {
    id: string;
    is_reverted: boolean;
  };
  daily_sadhana: {
    completed_rounds: number;
    remaining_balance: number;
  };
  sankalpa: {
    completed_rounds: number;
    status: string;
  } | null;
}

interface ChantingStatsRpcResult {
  today: {
    date: string;
    completed_rounds: number;
    remaining_rounds: number;
    original_target: number;
    carried_balance: number;
    effective_target: number;
    extra_rounds: number;
  };
  month: {
    year: number;
    month: number;
    completed_rounds: number;
  };
  year: {
    year: number;
    completed_rounds: number;
  };
  lifetime: {
    completed_rounds: number;
  };
  active_sankalpa: {
    id: string;
    title: string;
    target_rounds: number;
    completed_rounds: number;
    remaining_rounds: number;
    status: string;
  } | null;
}

function makeDailyRow(
  userId: string,
  date: string,
  completedRounds: number,
  effectiveTarget = 16,
  originalTarget = 16
): DailySadhana {
  return {
    id: `00000000-0000-4000-8000-${date.replaceAll("-", "").padStart(12, "0")}`,
    user_id: userId,
    sadhana_date: date,
    timezone_snapshot: "Asia/Kolkata",
    original_daily_target: originalTarget,
    previous_pending_balance: Math.max(effectiveTarget - originalTarget, 0),
    effective_daily_target: effectiveTarget,
    completed_rounds: completedRounds,
    remaining_balance: Math.max(effectiveTarget - completedRounds, 0),
    extra_rounds: Math.max(completedRounds - effectiveTarget, 0),
    policy_applied: "automatic",
    carry_forward_accepted: true,
    has_activity: completedRounds > 0,
  };
}

describe("SMARAN — Phase 4: Chanting Statistics & Analytics System", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_STAT_A,
      email: "statistics-a@example.org",
      name: "Arjuna",
      timezone: "Asia/Kolkata",
    });
    await seedTestUser(testDb.db, {
      id: USER_STAT_B,
      email: "statistics-b@example.org",
      name: "Bhima",
      timezone: "Asia/Kolkata",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe("1. Main Sadhana Dashboard Metrics Calculation", () => {
    it("computes today, month, year, lifetime, chanting days, average per chanting day, and best day accurately", () => {
      const todayDate = "2026-11-15";
      const rows: DailySadhana[] = [
        // Previous year: 2025-12-31
        makeDailyRow(USER_STAT_A, "2025-12-31", 16, 16),
        // Previous month: 2026-10-25
        makeDailyRow(USER_STAT_A, "2026-10-25", 20, 16),
        // Current month: 2026-11-01 (0 rounds recorded)
        makeDailyRow(USER_STAT_A, "2026-11-01", 0, 16),
        // Current month: 2026-11-10
        makeDailyRow(USER_STAT_A, "2026-11-10", 25, 16), // All-time and month best
        // Current month: 2026-11-14
        makeDailyRow(USER_STAT_A, "2026-11-14", 16, 16),
        // Today: 2026-11-15 (in progress: 8 rounds)
        makeDailyRow(USER_STAT_A, "2026-11-15", 8, 16),
      ];

      const todayRow = rows[rows.length - 1]!;
      const metrics = computePersonalDashboardMetrics({
        today: todayRow,
        history: rows.slice(0, -1),
        todayDate,
      });

      // 4 Primary Statistics
      expect(metrics.completedRounds).toBe(8); // Today
      expect(metrics.monthCompletedRounds).toBe(0 + 25 + 16 + 8); // 49 rounds in Nov 2026
      expect(metrics.yearCompletedRounds).toBe(20 + 0 + 25 + 16 + 8); // 69 rounds in 2026
      expect(metrics.lifetimeRounds).toBe(16 + 20 + 0 + 25 + 16 + 8); // 85 rounds lifetime

      // Secondary Statistics
      // Total recorded days: 6. Total active chanting days (rounds > 0): 5 (excludes zero-round 2026-11-01)
      expect(metrics.recordedDays).toBe(6);
      expect(metrics.totalChantingDays).toBe(5);
      // Average rounds per active chanting day: 85 / 5 = 17.0
      expect(metrics.averageRoundsPerChantingDay).toBe(17.0);
      // Best chanting day: 25 rounds on 2026-11-10
      expect(metrics.bestDay).toEqual({
        date: "2026-11-10",
        rounds: 25,
      });
      // Target met days: 16 (met), 20 (met), 0 (missed), 25 (met), 16 (met), 8 (in progress) -> 4 met
      expect(metrics.targetMetDays).toBe(4);
    });
  });

  describe("2. Detailed Analytics, Period Selection & Trend Calculations", () => {
    it("computes Month-over-Month (MoM) and Year-over-Year (YoY) comparisons accurately", () => {
      const todayDate = "2026-11-15";
      const rows: DailySadhana[] = [
        // 2025
        makeDailyRow(USER_STAT_A, "2025-11-15", 50, 16),
        // 2026 Oct (prior month)
        makeDailyRow(USER_STAT_A, "2026-10-10", 30, 16),
        makeDailyRow(USER_STAT_A, "2026-10-20", 30, 16), // Oct total = 60
        // 2026 Nov (selected month)
        makeDailyRow(USER_STAT_A, "2026-11-05", 40, 16),
        makeDailyRow(USER_STAT_A, "2026-11-10", 50, 16), // Nov total = 90
      ];

      const analytics = buildSadhanaAnalytics({
        rows,
        todayDate,
        selectedYear: 2026,
        selectedMonth: 10, // November (0-based)
      });

      // 4 Primary Statistics
      expect(analytics.selectedMonthCompletedRounds).toBe(90);
      expect(analytics.selectedYearCompletedRounds).toBe(150); // 60 + 90
      expect(analytics.lifetimeRounds).toBe(200); // 50 + 60 + 90

      // Month-over-Month (November vs October)
      expect(analytics.momComparison.currentTotal).toBe(90);
      expect(analytics.momComparison.previousTotal).toBe(60);
      expect(analytics.momComparison.absoluteChange).toBe(30);
      expect(analytics.momComparison.percentageChange).toBe(50); // +50%
      expect(analytics.momComparison.trend).toBe("up");

      // Year-over-Year (2026 vs 2025)
      expect(analytics.yoyComparison.currentTotal).toBe(150);
      expect(analytics.yoyComparison.previousTotal).toBe(50);
      expect(analytics.yoyComparison.absoluteChange).toBe(100);
      expect(analytics.yoyComparison.percentageChange).toBe(200); // +200%
      expect(analytics.yoyComparison.trend).toBe("up");

      // Best day distinctions (both 2025-11-15 and 2026-11-10 have 50 rounds; recent chosen)
      expect(analytics.bestPersonalDay?.completedRounds).toBe(50);
      expect(analytics.bestDayInYear?.completedRounds).toBe(50);
      expect(analytics.bestDayInMonth?.completedRounds).toBe(50);
    });

    it("handles year transition for MoM when January is selected (compares to prior December)", () => {
      const rows: DailySadhana[] = [
        makeDailyRow(USER_STAT_A, "2025-12-15", 40, 16),
        makeDailyRow(USER_STAT_A, "2026-01-10", 60, 16),
      ];

      const analytics = buildSadhanaAnalytics({
        rows,
        todayDate: "2026-01-20",
        selectedYear: 2026,
        selectedMonth: 0, // January
      });

      expect(analytics.momComparison.currentTotal).toBe(60);
      expect(analytics.momComparison.previousTotal).toBe(40);
      expect(analytics.momComparison.absoluteChange).toBe(20);
      expect(analytics.momComparison.percentageChange).toBe(50);
      expect(analytics.momComparison.label).toContain("January vs December (2025)");
    });

    it("generates daily trend points for every calendar day in the selected month", () => {
      const rows: DailySadhana[] = [
        makeDailyRow(USER_STAT_A, "2026-02-05", 16, 16),
        makeDailyRow(USER_STAT_A, "2026-02-14", 8, 16),
      ];

      const analytics = buildSadhanaAnalytics({
        rows,
        todayDate: "2026-02-28",
        selectedYear: 2026,
        selectedMonth: 1, // February 2026 (non-leap year = 28 days)
      });

      expect(analytics.selectedMonthDailyTrends).toHaveLength(28);
      const day5 = analytics.selectedMonthDailyTrends[4]!;
      expect(day5.date).toBe("2026-02-05");
      expect(day5.rounds).toBe(16);
      expect(day5.targetMet).toBe(true);

      const day14 = analytics.selectedMonthDailyTrends[13]!;
      expect(day14.date).toBe("2026-02-14");
      expect(day14.rounds).toBe(8);
      expect(day14.targetMet).toBe(false);

      const day1 = analytics.selectedMonthDailyTrends[0]!;
      expect(day1.rounds).toBe(0);
      expect(day1.status).toBe("missing_data");
    });
  });

  describe("3. Authoritative DB Aggregation, Sankalpa Inclusion & Undo Exclusion", () => {
    it("updates daily, monthly, yearly, lifetime, and Sankalpa stats transactionally, and excludes undone rounds", async () => {
      const targetDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Kolkata" }).format(new Date());

      // Initialize daily sadhana for targetDate
      await asUser(testDb.db, USER_STAT_A, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [targetDate]);
      });

      // Create an active Sankalpa
      const sankalpaId = await asUser(testDb.db, USER_STAT_A, async (tx) => {
        const res = await tx.query<{ id: string }>(
          `INSERT INTO public.sankalpas (user_id, title, target_rounds, start_date)
           VALUES ($1, 'Kartika 108 Rounds', 108, $2::date)
           RETURNING id`,
          [USER_STAT_A, targetDate]
        );
        return res.rows[0]!.id;
      });

      // 1. Record round 1 via Manual Counter with Sankalpa
      const r1 = await asUser(testDb.db, USER_STAT_A, async (tx) => {
        const res = await tx.query<{ res: RecordRoundRpcResult }>(
          `SELECT public.record_chanting_round('manual', 'test-stat-round-1', NULL, NULL, $1) AS res`,
          [sankalpaId]
        );
        return res.rows[0]!.res;
      });

      expect(r1.duplicate).toBe(false);
      expect(r1.daily_sadhana.completed_rounds).toBe(1);
      expect(r1.sankalpa?.completed_rounds).toBe(1);

      // Verify statistics via RPC
      const statsAfterR1 = await asUser(testDb.db, USER_STAT_A, async (tx) => {
        const res = await tx.query<{ res: ChantingStatsRpcResult }>(
          `SELECT public.get_chanting_statistics($1::date) AS res`,
          [targetDate]
        );
        return res.rows[0]!.res;
      });

      expect(statsAfterR1.today.completed_rounds).toBe(1);
      expect(statsAfterR1.month.completed_rounds).toBe(1);
      expect(statsAfterR1.year.completed_rounds).toBe(1);
      expect(statsAfterR1.lifetime.completed_rounds).toBe(1);
      expect(statsAfterR1.active_sankalpa?.completed_rounds).toBe(1);

      // 2. Record round 2 via Digital Japa Mala with Sankalpa
      const r2 = await asUser(testDb.db, USER_STAT_A, async (tx) => {
        const res = await tx.query<{ res: RecordRoundRpcResult }>(
          `SELECT public.record_chanting_round('japa_mala', 'test-stat-round-2', NULL, NULL, $1) AS res`,
          [sankalpaId]
        );
        return res.rows[0]!.res;
      });

      expect(r2.daily_sadhana.completed_rounds).toBe(2);
      expect(r2.sankalpa?.completed_rounds).toBe(2);

      // 3. Undo round 2
      const undoResult = await asUser(testDb.db, USER_STAT_A, async (tx) => {
        const res = await tx.query<{ res: UndoRoundRpcResult }>(
          `SELECT public.undo_chanting_round($1) AS res`,
          [r2.record.id]
        );
        return res.rows[0]!.res;
      });

      expect(undoResult.already_reverted).toBe(false);
      expect(undoResult.record.is_reverted).toBe(true);
      expect(undoResult.daily_sadhana.completed_rounds).toBe(1);
      expect(undoResult.sankalpa?.completed_rounds).toBe(1);

      // Verify stats after undo
      const statsAfterUndo = await asUser(testDb.db, USER_STAT_A, async (tx) => {
        const res = await tx.query<{ res: ChantingStatsRpcResult }>(
          `SELECT public.get_chanting_statistics($1::date) AS res`,
          [targetDate]
        );
        return res.rows[0]!.res;
      });

      expect(statsAfterUndo.today.completed_rounds).toBe(1);
      expect(statsAfterUndo.month.completed_rounds).toBe(1);
      expect(statsAfterUndo.year.completed_rounds).toBe(1);
      expect(statsAfterUndo.lifetime.completed_rounds).toBe(1);
      expect(statsAfterUndo.active_sankalpa?.completed_rounds).toBe(1);

      // 4. User data isolation: User B's statistics remain untouched
      await asUser(testDb.db, USER_STAT_B, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [targetDate]);
      });

      const statsB = await asUser(testDb.db, USER_STAT_B, async (tx) => {
        const res = await tx.query<{ res: ChantingStatsRpcResult }>(
          `SELECT public.get_chanting_statistics($1::date) AS res`,
          [targetDate]
        );
        return res.rows[0]!.res;
      });

      expect(statsB.today.completed_rounds).toBe(0);
      expect(statsB.lifetime.completed_rounds).toBe(0);
    });
  });
});
