import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import type { DailySadhana } from "@/lib/domain/sadhana";
import { buildSadhanaAnalytics } from "@/lib/sadhana/analytics";

const USER_AN = "c1111111-1111-4111-8111-111111111111";
const USER_OTHER = "c2222222-2222-4222-8222-222222222222";

function makeDailyRow(
  date: string,
  completedRounds: number,
  effectiveTarget = 16,
  originalTarget = 16
): DailySadhana {
  return {
    id: `00000000-0000-4000-8000-${date.replaceAll("-", "").padStart(12, "0")}`,
    user_id: USER_AN,
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

describe("Phase 6 Consistency Heatmap & Personal Analytics", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_AN,
      email: "analytics@example.org",
      name: "Vamsi",
      timezone: "Asia/Kolkata",
    });
    await seedTestUser(testDb.db, {
      id: USER_OTHER,
      email: "other-an@example.org",
      name: "Other",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("handles empty user history cleanly without inventing stats or treating missing dates as zero", () => {
    const summary = buildSadhanaAnalytics({
      rows: [],
      todayDate: "2026-11-11",
      selectedYear: 2026,
    });

    expect(summary.lifetimeRounds).toBe(0);
    expect(summary.totalChantingDays).toBe(0);
    expect(summary.recordedDays).toBe(0);
    expect(summary.targetAchievementRatePct).toBe(0);
    expect(summary.averageRoundsPerActiveDay).toBe(0);
    expect(summary.currentStreak).toBe(0);
    expect(summary.longestStreak).toBe(0);
    expect(summary.bestPersonalDay).toBeNull();

    const allCells = summary.weeks
      .flatMap((w) => w.days)
      .filter((d): d is NonNullable<typeof d> => d !== null);
    expect(allCells).toHaveLength(365);

    const pastCells = allCells.filter((c) => c.date <= "2026-11-11");
    expect(pastCells.every((c) => c.status === "missing_data")).toBe(true);
    expect(allCells.some((c) => c.status === "zero_activity")).toBe(false);
  });

  it("distinguishes missing_data vs zero_activity vs partial vs target_met and computes extra rounds & best day", () => {
    const rows: DailySadhana[] = [
      makeDailyRow("2026-10-30", 0, 16), // recorded zero activity
      makeDailyRow("2026-10-31", 4, 16), // partial_low
      // 2026-11-01 intentionally omitted -> missing_data!
      makeDailyRow("2026-11-02", 16, 16), // target_met
      makeDailyRow("2026-11-03", 22, 16), // target_met + 6 extra rounds
    ];

    const summary = buildSadhanaAnalytics({
      rows,
      todayDate: "2026-11-03",
      selectedYear: 2026,
    });

    const cellByDate = new Map(
      summary.weeks
        .flatMap((w) => w.days)
        .filter((d): d is NonNullable<typeof d> => d !== null)
        .map((c) => [c.date, c])
    );

    expect(cellByDate.get("2026-10-30")?.status).toBe("zero_activity");
    expect(cellByDate.get("2026-10-31")?.status).toBe("partial_low");
    expect(cellByDate.get("2026-11-01")?.status).toBe("missing_data");
    expect(cellByDate.get("2026-11-02")?.status).toBe("target_met");
    expect(cellByDate.get("2026-11-03")?.status).toBe("target_met");
    expect(cellByDate.get("2026-11-04")?.status).toBe("future");

    // 4 + 16 + 22 = 42 lifetime rounds across 3 active chanting days (out of 4 recorded days)
    expect(summary.lifetimeRounds).toBe(42);
    expect(summary.totalChantingDays).toBe(3);
    expect(summary.recordedDays).toBe(4);
    expect(summary.targetMetDays).toBe(2);
    expect(summary.targetAchievementRatePct).toBe(50);
    expect(summary.averageRoundsPerActiveDay).toBe(14); // 42 / 3 active days
    expect(summary.bestPersonalDay).toEqual({
      date: "2026-11-03",
      completedRounds: 22,
      effectiveTarget: 16,
    });
    expect(summary.currentStreak).toBe(2);
    expect(summary.longestStreak).toBe(2);
  });

  it("computes streaks across month/year boundaries and handles leap years accurately", () => {
    const rows: DailySadhana[] = [
      makeDailyRow("2024-02-28", 16, 16),
      makeDailyRow("2024-02-29", 16, 16),
      makeDailyRow("2025-12-30", 16, 16),
      makeDailyRow("2025-12-31", 16, 16),
      makeDailyRow("2026-01-01", 16, 16),
      makeDailyRow("2026-01-02", 18, 16),
    ];

    const leapSummary = buildSadhanaAnalytics({
      rows,
      todayDate: "2026-01-02",
      selectedYear: 2024,
    });
    const leapCells = leapSummary.weeks
      .flatMap((w) => w.days)
      .filter((d): d is NonNullable<typeof d> => d !== null);
    expect(leapCells).toHaveLength(366);
    expect(leapCells.some((c) => c.date === "2024-02-29")).toBe(true);
    expect(leapSummary.currentStreak).toBe(4);
    expect(leapSummary.longestStreak).toBe(4);
    expect(leapSummary.yearlyStats.totalRounds).toBe(32);

    const jan2026 = buildSadhanaAnalytics({
      rows,
      todayDate: "2026-01-02",
      selectedYear: 2026,
    });
    expect(jan2026.yearlyStats.totalRounds).toBe(34);
    expect(jan2026.monthlyStats[0]!.totalRounds).toBe(34);
    expect(jan2026.monthlyStats[0]!.chantingDays).toBe(2);
  });

  it("aggregates multiple sessions & excludes partial beads while enforcing Asia/Kolkata boundaries and RLS in PostgreSQL", async () => {
    const now = Date.now();
    const baseDay = new Date(now - 2 * 86400_000).toISOString().slice(0, 10);
    const beforeIstMidnight = `${baseDay}T18:29:00.000Z`;
    const afterIstMidnight = `${baseDay}T18:31:00.000Z`;

    await asUser(testDb.db, USER_AN, async (tx) => {
      // Session 1 manual (2 rounds before IST midnight)
      const s1 = await tx.query<{ id: string }>(
        `INSERT INTO public.chanting_sessions (user_id, sadhana_date, method, client_session_key)
         VALUES ($1, $2::date, 'manual', 'p6-sess-1-abcdefgh')
         RETURNING id`,
        [USER_AN, baseDay]
      );
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'p6-r1-abcdefgh', $1, $2::timestamptz)`,
        [s1.rows[0]!.id, beforeIstMidnight]
      );
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'p6-r2-abcdefgh', $1, $2::timestamptz)`,
        [s1.rows[0]!.id, beforeIstMidnight]
      );

      // Session 2 japa_mala (1 completed round + 55 partial beads on same IST date)
      const s2 = await tx.query<{ id: string }>(
        `INSERT INTO public.chanting_sessions (user_id, sadhana_date, method, client_session_key)
         VALUES ($1, $2::date, 'japa_mala', 'p6-sess-2-abcdefgh')
         RETURNING id`,
        [USER_AN, baseDay]
      );
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'p6-r3-abcdefgh', $1, $2::timestamptz)`,
        [s2.rows[0]!.id, beforeIstMidnight]
      );
      await tx.query(
        `UPDATE public.chanting_sessions SET current_bead_count = 55 WHERE id = $1`,
        [s2.rows[0]!.id]
      );

      // 1 round after IST midnight (next local day)
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'p6-r4-abcdefgh', NULL, $1::timestamptz)`,
        [afterIstMidnight]
      );
    });

    const userAnRows = await asUser(testDb.db, USER_AN, async (tx) => {
      const r = await tx.query<DailySadhana>(
        `SELECT id, user_id, sadhana_date::text, timezone_snapshot, original_daily_target,
                previous_pending_balance, effective_daily_target, completed_rounds,
                remaining_balance, extra_rounds, policy_applied, carry_forward_accepted, has_activity
         FROM public.daily_sadhana
         ORDER BY sadhana_date ASC`
      );
      return r.rows;
    });

    expect(userAnRows).toHaveLength(2);
    expect(userAnRows[0]!.completed_rounds).toBe(3); // 55 partial beads excluded!
    expect(userAnRows[1]!.completed_rounds).toBe(1);

    const summary = buildSadhanaAnalytics({
      rows: userAnRows,
      todayDate: userAnRows[1]!.sadhana_date,
    });
    expect(summary.lifetimeRounds).toBe(4);
    expect(summary.totalChantingDays).toBe(2);

    // Cross-user isolation: USER_OTHER cannot see USER_AN analytics rows
    const otherRows = await asUser(testDb.db, USER_OTHER, async (tx) => {
      const r = await tx.query(`SELECT id FROM public.daily_sadhana`);
      return r.rows;
    });
    expect(otherRows).toEqual([]);
  });

  it("validates /api/sadhana/day-detail authentication and date parameters", async () => {
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));

    const { GET } = await import("@/app/api/sadhana/day-detail/route");
    const unauthRes = await GET(
      new NextRequest("http://localhost:3000/api/sadhana/day-detail?date=2026-11-11")
    );
    expect(unauthRes.status).toBe(401);

    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: USER_AN } }, error: null }),
        },
      })),
    }));

    const { GET: getAuth } = await import("@/app/api/sadhana/day-detail/route");
    const badDateRes = await getAuth(
      new NextRequest("http://localhost:3000/api/sadhana/day-detail?date=invalid")
    );
    expect(badDateRes.status).toBe(400);
  });
});

