import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import NotFound from "@/app/not-found";
import ErrorBoundary from "@/app/error";

const LAUNCH_USER_A = "e1111111-1111-4111-8111-111111111111";
const LAUNCH_USER_B = "e2222222-2222-4222-8222-222222222222";

describe("SMARAN — Phase 10: Launch Readiness & Data Integrity Verification", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: LAUNCH_USER_A,
      email: "launch-devotee-a@example.org",
      name: "Radha Dasi",
      timezone: "Asia/Kolkata",
    });
    await seedTestUser(testDb.db, {
      id: LAUNCH_USER_B,
      email: "launch-devotee-b@example.org",
      name: "Krishna Dasa",
      timezone: "Asia/Kolkata",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("1. Reconciles all chanting rounds, daily sadhana, statistics, and Sankalpas with exact database counts", async () => {
    // 1. Create a Sankalpa for User A
    const sankalpaId = await asUser(testDb.db, LAUNCH_USER_A, async (tx) => {
      const s = await tx.query<{ id: string }>(
        `INSERT INTO public.sankalpas (user_id, title, target_rounds, start_date)
         VALUES ($1, 'Launch 64 Rounds Vow', 64, CURRENT_DATE)
         RETURNING id`,
        [LAUNCH_USER_A]
      );
      return s.rows[0]!.id;
    });

    // 2. Record 3 rounds: 2 associated with Sankalpa, 1 independent
    await asUser(testDb.db, LAUNCH_USER_A, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'launch-rec-1', NULL, NULL, $1)`,
        [sankalpaId]
      );
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'launch-rec-2', NULL, NULL, $1)`,
        [sankalpaId]
      );
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'launch-rec-3', NULL, NULL, NULL)`
      );
    });

    // 3. Reconcile raw records vs daily_sadhana vs get_chanting_statistics
    await asUser(testDb.db, LAUNCH_USER_A, async (tx) => {
      // Raw records count
      const rawCountRes = await tx.query<{ count: string }>(
        `SELECT count(*) as count FROM public.chanting_records
         WHERE user_id = $1 AND NOT is_reverted`,
        [LAUNCH_USER_A]
      );
      const rawTotal = Number(rawCountRes.rows[0]!.count);
      expect(rawTotal).toBe(3);

      // daily_sadhana completed_rounds
      const dailyRes = await tx.query<{ completed_rounds: number }>(
        `SELECT completed_rounds FROM public.daily_sadhana
         WHERE user_id = $1
         ORDER BY sadhana_date DESC LIMIT 1`,
        [LAUNCH_USER_A]
      );
      expect(dailyRes.rows[0]!.completed_rounds).toBe(rawTotal);

      // get_chanting_statistics RPC reconciliation
      interface ChantingStatsResult {
        today: { completed_rounds: number };
        month: { completed_rounds: number };
        year: { completed_rounds: number };
        lifetime: { completed_rounds: number };
        active_sankalpa: { completed_rounds: number; remaining_rounds: number };
      }
      const statsRes = await tx.query<{ stats: ChantingStatsResult }>(
        `SELECT public.get_chanting_statistics() as stats`
      );
      const stats = statsRes.rows[0]!.stats;
      expect(stats.today.completed_rounds).toBe(rawTotal);
      expect(stats.month.completed_rounds).toBe(rawTotal);
      expect(stats.year.completed_rounds).toBe(rawTotal);
      expect(stats.lifetime.completed_rounds).toBe(rawTotal);

      // Sankalpa progress reconciliation
      expect(stats.active_sankalpa.completed_rounds).toBe(2);
      expect(stats.active_sankalpa.remaining_rounds).toBe(62);
    });

    // 4. Test Undo operation reverses all reconciled metrics
    await asUser(testDb.db, LAUNCH_USER_A, async (tx) => {
      const rec2 = await tx.query<{ id: string }>(
        `SELECT id FROM public.chanting_records WHERE idempotency_key = 'launch-rec-2'`
      );
      await tx.query(
        `SELECT public.undo_chanting_round($1, 'Mistaken count')`,
        [rec2.rows[0]!.id]
      );

      // Re-verify after undo: raw non-reverted count should now be 2
      const rawAfterUndo = await tx.query<{ count: string }>(
        `SELECT count(*) as count FROM public.chanting_records
         WHERE user_id = $1 AND NOT is_reverted`,
        [LAUNCH_USER_A]
      );
      expect(Number(rawAfterUndo.rows[0]!.count)).toBe(2);

      // daily_sadhana must equal 2
      const dailyAfterUndo = await tx.query<{ completed_rounds: number }>(
        `SELECT completed_rounds FROM public.daily_sadhana
         WHERE user_id = $1
         ORDER BY sadhana_date DESC LIMIT 1`,
        [LAUNCH_USER_A]
      );
      expect(dailyAfterUndo.rows[0]!.completed_rounds).toBe(2);

      // Sankalpa progress should decrement from 2 to 1
      const sankalpaAfterUndo = await tx.query<{ completed_rounds: number }>(
        `SELECT completed_rounds FROM public.sankalpas WHERE id = $1`,
        [sankalpaId]
      );
      expect(sankalpaAfterUndo.rows[0]!.completed_rounds).toBe(1);
    });
  });

  it("2. Enforces immutability of historical records dated prior to November 13, 2026", async () => {
    // Insert a historical record with pre-Nov-13 date directly as postgres superuser/service_role
    const histId = await testDb.db.query<{ id: string }>(
      `INSERT INTO public.chanting_records (
        user_id, method, idempotency_key, sadhana_date, timezone_snapshot, created_at, client_recorded_at
      ) VALUES (
        $1, 'manual', 'hist-pre-nov13-record', '2026-11-10', 'Asia/Kolkata', '2026-11-10T08:00:00Z', '2026-11-10T08:00:00Z'
      ) RETURNING id`,
      [LAUNCH_USER_A]
    );

    // Attempting to UPDATE the historical record must be rejected by the trigger
    await expect(
      testDb.db.query(
        `UPDATE public.chanting_records SET is_reverted = TRUE WHERE id = $1`,
        [histId.rows[0]!.id]
      )
    ).rejects.toThrow(/Historical chanting records dated before November 13, 2026 are protected/);

    // Attempting to DELETE the historical record must also be rejected
    await expect(
      testDb.db.query(
        `DELETE FROM public.chanting_records WHERE id = $1`,
        [histId.rows[0]!.id]
      )
    ).rejects.toThrow(/Historical chanting records dated before November 13, 2026 are protected/);
  });

  it("3. Strict RLS isolation guarantees User B cannot access User A's private data", async () => {
    // User B attempts to select User A's chanting records
    const bRecords = await asUser(testDb.db, LAUNCH_USER_B, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.chanting_records WHERE user_id = $1`,
        [LAUNCH_USER_A]
      );
      return r.rows;
    });
    expect(bRecords).toHaveLength(0);

    // User B attempts to select User A's Sankalpas
    const bSankalpas = await asUser(testDb.db, LAUNCH_USER_B, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.sankalpas WHERE user_id = $1`,
        [LAUNCH_USER_A]
      );
      return r.rows;
    });
    expect(bSankalpas).toHaveLength(0);

    // User B attempts to select User A's notifications
    const bNotifs = await asUser(testDb.db, LAUNCH_USER_B, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.notifications WHERE user_id = $1`,
        [LAUNCH_USER_A]
      );
      return r.rows;
    });
    expect(bNotifs).toHaveLength(0);
  });

  it("4. Not-found and Error Boundary screens render peaceful devotional recovery UI", () => {
    const notFoundHtml = renderToStaticMarkup(<NotFound />);
    expect(notFoundHtml).toContain("Route Unfound");
    expect(notFoundHtml).toContain("Peace in the Sacred Path");
    expect(notFoundHtml).toContain("/sadhana");
    expect(notFoundHtml).toContain("Personal Sādhana");

    const errorHtml = renderToStaticMarkup(
      <ErrorBoundary
        error={new Error("Network glitch occurred")}
        reset={() => {}}
      />
    );
    expect(errorHtml).toContain("Peaceful Recovery");
    expect(errorHtml).toContain("Something Interrupted Your Flow");
    expect(errorHtml).toContain("Try Again");
    expect(errorHtml).toContain("Return to Sādhana");
  });
});
