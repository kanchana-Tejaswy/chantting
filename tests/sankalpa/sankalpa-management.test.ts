import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import { summarizeSankalpa, summarizeSankalpaPortfolio } from "../../src/lib/sankalpa/queries";
import {
  createSankalpaInputSchema,
  updateSankalpaInputSchema,
} from "../../src/lib/sankalpa/validation";
import type { SankalpaRecord } from "../../src/lib/sankalpa/types";

const USER_A = "31313131-3131-4131-8131-313131313131";
const USER_B = "42424242-4242-4242-8242-424242424242";

interface RpcRecordRoundResult {
  duplicate: boolean;
  record: {
    id: string;
    user_id: string;
    method: string;
    sankalpa_id: string | null;
    is_reverted: boolean;
  };
  daily_sadhana: {
    completed_rounds: number;
    remaining_balance: number;
    effective_daily_target: number;
  };
  sankalpa: {
    id: string;
    completed_rounds: number;
    target_rounds: number;
    status: string;
    completed_at: string | null;
  } | null;
}

interface RpcUndoRoundResult {
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
    id: string;
    completed_rounds: number;
    status: string;
    completed_at: string | null;
  } | null;
}

interface RpcStatsResult {
  today: {
    completed_rounds: number;
    remaining_rounds: number;
  };
  month: {
    completed_rounds: number;
  };
  year: {
    completed_rounds: number;
  };
  lifetime: {
    completed_rounds: number;
  };
  active_sankalpa: {
    id: string;
    completed_rounds: number;
    remaining_rounds: number;
    status: string;
  } | null;
}

describe("SMARAN Phase 3: Sankalpa Management & Lifecycle Engine", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_A,
      email: "radharani_sevaka@example.org",
      name: "Radharani Sevaka",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_B,
      email: "vrinda_sevaka@example.org",
      name: "Vrinda Sevaka",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("1. validates Sankalpa creation inputs and enforces target > 0 and chronological dates", () => {
    // Valid input
    const valid = createSankalpaInputSchema.safeParse({
      title: "Kartik 1 Lakh Nama Japa",
      description: "Dedicated to Sri Sri Radha Damodara",
      targetRounds: 100_000,
      startDate: "2026-11-13",
      endDate: "2026-12-13",
    });
    expect(valid.success).toBe(true);

    // Invalid target (0 or negative)
    const zeroTarget = createSankalpaInputSchema.safeParse({
      title: "Zero Target Vow",
      targetRounds: 0,
    });
    expect(zeroTarget.success).toBe(false);

    // Invalid completion date (before start date)
    const invalidDate = createSankalpaInputSchema.safeParse({
      title: "Backward Date Vow",
      targetRounds: 100,
      startDate: "2026-11-20",
      endDate: "2026-11-10",
    });
    expect(invalidDate.success).toBe(false);
    if (!invalidDate.success) {
      expect(invalidDate.error.issues[0]?.message).toMatch(
        /cannot precede the start date/i
      );
    }
  });

  it("2. creates an active Sankalpa for User A and prevents duplicate active vows", async () => {
    const today = "2026-11-13";

    // Create first active Sankalpa
    const sankalpa1 = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `INSERT INTO public.sankalpas (user_id, title, description, target_rounds, start_date, end_date, status)
         VALUES ($1, 'Kartik Deep Vow', 'Deep meditation on holy names', 100, $2::date, '2026-12-15'::date, 'active')
         RETURNING *`,
        [USER_A, today]
      );
      return res.rows[0]!;
    });

    expect(sankalpa1.id).toBeDefined();
    expect(sankalpa1.title).toBe("Kartik Deep Vow");
    expect(sankalpa1.target_rounds).toBe(100);
    expect(sankalpa1.completed_rounds).toBe(0);
    expect(sankalpa1.status).toBe("active");

    // Attempting to query active sankalpa returns sankalpa1
    const active = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [USER_A]
      );
      return res.rows[0]!;
    });
    expect(active.id).toBe(sankalpa1.id);

    // Business rule: User A cannot have a 2nd active Sankalpa without pausing the first
    const activeCount = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ count: string }>(
        `SELECT count(*) FROM public.sankalpas WHERE user_id = $1 AND status = 'active'`,
        [USER_A]
      );
      return Number(res.rows[0]!.count);
    });
    expect(activeCount).toBe(1);
  });

  it("3. edits Sankalpa title, description, and target rounds without resetting accumulated progress", async () => {
    // Look up active vow
    const activeVow = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [USER_A]
      );
      return res.rows[0]!;
    });

    // Seed progress of 10 rounds directly to test preservation during edits
    await testDb.db.query(
      `UPDATE public.sankalpas SET completed_rounds = 10 WHERE id = $1`,
      [activeVow.id]
    );

    // User edits target to 150 and updates description
    const updateInput = updateSankalpaInputSchema.safeParse({
      id: activeVow.id,
      title: "Kartik Deep Vow (Extended)",
      description: "Extended vow for Vrindavan pilgrimage",
      targetRounds: 150,
      endDate: "2026-12-25",
    });
    expect(updateInput.success).toBe(true);

    const updated = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `UPDATE public.sankalpas
         SET title = $2, description = $3, target_rounds = $4, end_date = $5::date, updated_at = now()
         WHERE id = $1 AND user_id = $6
         RETURNING *`,
        [
          activeVow.id,
          updateInput.data?.title,
          updateInput.data?.description,
          updateInput.data?.targetRounds,
          updateInput.data?.endDate,
          USER_A,
        ]
      );
      return res.rows[0]!;
    });

    expect(updated.title).toBe("Kartik Deep Vow (Extended)");
    expect(updated.target_rounds).toBe(150);
    // Accumulated progress MUST be preserved:
    expect(updated.completed_rounds).toBe(10);
    expect(updated.status).toBe("active");
  });

  it("4. records a dedicated Manual Counter round to the active Sankalpa", async () => {
    const today = new Date().toISOString().slice(0, 10);

    await asUser(testDb.db, USER_A, async (tx) => {
      await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [today]);
    });

    const activeVow = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [USER_A]
      );
      return res.rows[0]!;
    });

    // Record round with sankalpa_id
    const r1 = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ res: RpcRecordRoundResult }>(
        `SELECT public.record_chanting_round('manual', 'phase3-manual-round-01', NULL, NULL, $1) AS res`,
        [activeVow.id]
      );
      return res.rows[0]!.res;
    });

    expect(r1.duplicate).toBe(false);
    expect(r1.record.sankalpa_id).toBe(activeVow.id);
    expect(r1.sankalpa!.completed_rounds).toBe(11); // Was 10, now 11
    expect(r1.daily_sadhana.completed_rounds).toBe(1);

    // Verify statistics include the Sankalpa progress
    const stats = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ res: RpcStatsResult }>(
        `SELECT public.get_chanting_statistics($1::date) AS res`,
        [today]
      );
      return res.rows[0]!.res;
    });

    expect(stats.today.completed_rounds).toBe(1);
    expect(stats.active_sankalpa!.completed_rounds).toBe(11);
    expect(stats.active_sankalpa!.remaining_rounds).toBe(139); // 150 - 11
  });

  it("5. records a dedicated Japa Mala round (108 beads) and advances Sankalpa progress", async () => {
    const today = new Date().toISOString().slice(0, 10);

    const activeVow = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [USER_A]
      );
      return res.rows[0]!;
    });

    // Create session
    const sessionId = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ id: string }>(
        `INSERT INTO public.chanting_sessions (user_id, sadhana_date, method, client_session_key, current_bead_count)
         VALUES ($1, $2::date, 'japa_mala', 'phase3-japa-sess-01', 107)
         RETURNING id`,
        [USER_A, today]
      );
      return res.rows[0]!.id;
    });

    // Complete the 108th bead
    const r2 = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ res: RpcRecordRoundResult }>(
        `SELECT public.record_chanting_round('japa_mala', 'phase3-japa-round-02', $1, NULL, $2) AS res`,
        [sessionId, activeVow.id]
      );
      return res.rows[0]!.res;
    });

    expect(r2.duplicate).toBe(false);
    expect(r2.sankalpa!.completed_rounds).toBe(12);
    expect(r2.daily_sadhana.completed_rounds).toBe(2);

    // Session bead count reset to 0
    const session = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ current_bead_count: number }>(
        `SELECT current_bead_count FROM public.chanting_sessions WHERE id = $1`,
        [sessionId]
      );
      return res.rows[0]!;
    });
    expect(session.current_bead_count).toBe(0);
  });

  it("6. safely undoes a dedicated round and rolls back both Sankalpa and daily totals", async () => {
    const today = new Date().toISOString().slice(0, 10);

    const round2Id = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ id: string }>(
        `SELECT id FROM public.chanting_records WHERE idempotency_key = 'phase3-japa-round-02'`
      );
      return res.rows[0]!.id;
    });

    const undoRes = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ res: RpcUndoRoundResult }>(
        `SELECT public.undo_chanting_round($1, 'testing undo') AS res`,
        [round2Id]
      );
      return res.rows[0]!.res;
    });

    expect(undoRes.already_reverted).toBe(false);
    expect(undoRes.record.is_reverted).toBe(true);
    expect(undoRes.sankalpa!.completed_rounds).toBe(11); // Was 12, back to 11
    expect(undoRes.daily_sadhana.completed_rounds).toBe(1); // Was 2, back to 1

    const stats = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ res: RpcStatsResult }>(
        `SELECT public.get_chanting_statistics($1::date) AS res`,
        [today]
      );
      return res.rows[0]!.res;
    });
    expect(stats.today.completed_rounds).toBe(1);
    expect(stats.active_sankalpa!.completed_rounds).toBe(11);
  });

  it("7. pauses and resumes a Sankalpa safely", async () => {
    const activeVow = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active' LIMIT 1`,
        [USER_A]
      );
      return res.rows[0]!;
    });

    // Pause vow
    const paused = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `UPDATE public.sankalpas SET status = 'paused', updated_at = now() WHERE id = $1 RETURNING *`,
        [activeVow.id]
      );
      return res.rows[0]!;
    });
    expect(paused.status).toBe("paused");

    // No active Sankalpa now
    const activeCheck = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active'`,
        [USER_A]
      );
      return res.rows[0] ?? null;
    });
    expect(activeCheck).toBeNull();

    // Resume vow
    const resumed = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `UPDATE public.sankalpas SET status = 'active', updated_at = now() WHERE id = $1 RETURNING *`,
        [activeVow.id]
      );
      return res.rows[0]!;
    });
    expect(resumed.status).toBe("active");
  });

  it("8. detects milestones correctly at 25%, 50%, 75%, and 100% and auto-completes when target reached", async () => {
    const testRecord: SankalpaRecord = {
      id: "99999999-9999-4999-8999-999999999999",
      user_id: USER_A,
      title: "Milestone Test",
      description: null,
      target_rounds: 100,
      completed_rounds: 25,
      start_date: "2026-11-13",
      end_date: null,
      status: "active",
      completed_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // 25%
    const m25 = summarizeSankalpa(testRecord);
    expect(m25.progressPercentage).toBe(25);
    expect(m25.isCompleted).toBe(false);

    // 50%
    const m50 = summarizeSankalpa({ ...testRecord, completed_rounds: 50 });
    expect(m50.progressPercentage).toBe(50);
    expect(m50.isCompleted).toBe(false);

    // 75%
    const m75 = summarizeSankalpa({ ...testRecord, completed_rounds: 75 });
    expect(m75.progressPercentage).toBe(75);
    expect(m75.isCompleted).toBe(false);

    // 100%
    const m100 = summarizeSankalpa({ ...testRecord, completed_rounds: 100 });
    expect(m100.progressPercentage).toBe(100);
    expect(m100.isCompleted).toBe(true);
    expect(m100.remainingRounds).toBe(0);

    // In database: when completed_rounds >= target_rounds, record_chanting_round marks status = 'completed'
    const shortVow = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `INSERT INTO public.sankalpas (user_id, title, target_rounds, completed_rounds, start_date, status)
         VALUES ($1, 'Short 2 Round Vow', 2, 1, '2026-11-13'::date, 'active')
         RETURNING *`,
        [USER_A]
      );
      return res.rows[0]!;
    });

    // Complete the 2nd round to reach 100%
    const completeRes = await asUser(testDb.db, USER_A, async (tx) => {
      const res = await tx.query<{ res: RpcRecordRoundResult }>(
        `SELECT public.record_chanting_round('manual', 'phase3-final-round-key', NULL, NULL, $1) AS res`,
        [shortVow.id]
      );
      return res.rows[0]!.res;
    });

    expect(completeRes.sankalpa!.completed_rounds).toBe(2);
    expect(completeRes.sankalpa!.status).toBe("completed");
    expect(completeRes.sankalpa!.completed_at).not.toBeNull();
  });

  it("9. enforces strict user isolation via Row Level Security (User B cannot see or alter User A's vows)", async () => {
    // User B attempts to select User A's sankalpas
    const userBSees = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1`,
        [USER_A]
      );
      return res.rows;
    });
    // RLS filters out User A's rows
    expect(userBSees.length).toBe(0);

    // User B attempts to update User A's sankalpa
    const activeVowA = await testDb.db.query<SankalpaRecord>(
      `SELECT * FROM public.sankalpas WHERE user_id = $1 AND title = 'Kartik Deep Vow (Extended)' LIMIT 1`,
      [USER_A]
    );
    const vowAId = activeVowA.rows[0]!.id;

    const bUpdate = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query(
        `UPDATE public.sankalpas SET title = 'Hacked by B' WHERE id = $1`,
        [vowAId]
      );
      return res.rowCount;
    });
    // 0 rows updated because RLS hides the row
    expect(bUpdate).toBe(0);

    // Verify title remains unchanged
    const verifyA = await testDb.db.query<SankalpaRecord>(
      `SELECT title FROM public.sankalpas WHERE id = $1`,
      [vowAId]
    );
    expect(verifyA.rows[0]!.title).toBe("Kartik Deep Vow (Extended)");
  });

  it("10. protects historical records and preserves chanting history even if a Sankalpa is deleted", async () => {
    // Find record associated with a sankalpa
    const recordWithVow = await testDb.db.query<{ id: string; sankalpa_id: string }>(
      `SELECT id, sankalpa_id FROM public.chanting_records WHERE sankalpa_id IS NOT NULL LIMIT 1`
    );
    expect(recordWithVow.rows.length).toBeGreaterThan(0);
    const vowId = recordWithVow.rows[0]!.sankalpa_id;
    const recordId = recordWithVow.rows[0]!.id;

    // Delete the Sankalpa
    await asUser(testDb.db, USER_A, async (tx) => {
      await tx.query(`DELETE FROM public.sankalpas WHERE id = $1`, [vowId]);
    });

    // Chanting record MUST NOT BE DELETED; its sankalpa_id is SET NULL by foreign key
    const recordCheck = await testDb.db.query<{ id: string; sankalpa_id: string | null }>(
      `SELECT id, sankalpa_id FROM public.chanting_records WHERE id = $1`,
      [recordId]
    );
    expect(recordCheck.rows.length).toBe(1);
    expect(recordCheck.rows[0]!.id).toBe(recordId);
    expect(recordCheck.rows[0]!.sankalpa_id).toBeNull();
  });

  it("11. validates addRounds and extends target rounds (e.g. 1008 + 1000 = 2008) while preserving progress", async () => {
    // Validate schema accepts addRounds
    const parsed = updateSankalpaInputSchema.safeParse({
      id: "11111111-1111-4111-8111-111111111111",
      addRounds: 1000,
    });
    expect(parsed.success).toBe(true);

    // Create a vow for User B with 1008 rounds and 108 completed
    const vowB = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `INSERT INTO public.sankalpas (user_id, title, target_rounds, completed_rounds, start_date, status)
         VALUES ($1, 'emset exam clear', 1008, 108, '2026-11-17'::date, 'active')
         RETURNING *`,
        [USER_B]
      );
      return res.rows[0]!;
    });

    expect(vowB.target_rounds).toBe(1008);
    expect(vowB.completed_rounds).toBe(108);

    // Apply addRounds (+1000)
    const baseTarget = vowB.target_rounds;
    const additional = 1000;
    const updatedTarget = baseTarget + additional;
    expect(updatedTarget).toBe(2008);

    await asUser(testDb.db, USER_B, async (tx) => {
      await tx.query(
        `UPDATE public.sankalpas SET target_rounds = $1 WHERE id = $2`,
        [updatedTarget, vowB.id]
      );
    });

    const refreshed = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE id = $1`,
        [vowB.id]
      );
      return res.rows[0]!;
    });

    expect(refreshed.target_rounds).toBe(2008);
    expect(refreshed.completed_rounds).toBe(108); // preserved!
    const summary = summarizeSankalpa(refreshed);
    expect(summary.remainingRounds).toBe(1900);
  });

  it("12. supports auto-pausing an existing active vow when a new vow is activated", async () => {
    // User B already has active 'emset exam clear'
    const initialActive = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active'`,
        [USER_B]
      );
      return res.rows[0]!;
    });
    expect(initialActive).toBeDefined();

    // Pause old active and create new active vow (autoPauseExisting behavior)
    await asUser(testDb.db, USER_B, async (tx) => {
      await tx.query(`UPDATE public.sankalpas SET status = 'paused' WHERE id = $1`, [initialActive.id]);
      await tx.query(
        `INSERT INTO public.sankalpas (user_id, title, target_rounds, completed_rounds, start_date, status)
         VALUES ($1, 'Kartik Deep Offering', 500, 0, '2026-11-17'::date, 'active')`,
        [USER_B]
      );
    });

    // Check statuses
    const oldVow = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(`SELECT * FROM public.sankalpas WHERE id = $1`, [initialActive.id]);
      return res.rows[0]!;
    });
    expect(oldVow.status).toBe("paused");

    const newActive = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active'`,
        [USER_B]
      );
      return res.rows[0]!;
    });
    expect(newActive.title).toBe("Kartik Deep Offering");
  });

  it("13. supports queueing an upcoming vow with status 'paused' while preserving the current active vow", async () => {
    // Current active vow for User B remains active
    const activeBefore = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active'`,
        [USER_B]
      );
      return res.rows[0]!;
    });
    expect(activeBefore).toBeDefined();

    // Devotee queues a new upcoming vow with a different name to clear after the current one
    const queuedVow = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `INSERT INTO public.sankalpas (user_id, title, target_rounds, completed_rounds, start_date, status)
         VALUES ($1, 'Next Sacred Offering', 1000, 0, '2026-11-18'::date, 'paused')
         RETURNING *`,
        [USER_B]
      );
      return res.rows[0]!;
    });

    expect(queuedVow.status).toBe("paused");
    expect(queuedVow.title).toBe("Next Sacred Offering");
    expect(queuedVow.target_rounds).toBe(1000);

    // Active vow is still active!
    const activeAfter = await asUser(testDb.db, USER_B, async (tx) => {
      const res = await tx.query<SankalpaRecord>(
        `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active'`,
        [USER_B]
      );
      return res.rows[0]!;
    });
    expect(activeAfter.id).toBe(activeBefore.id);
    expect(activeAfter.status).toBe("active");
  });

  it("14. calculates cumulative multi-vow portfolio total and equation (a + b + c = Total)", () => {
    const mockVows: SankalpaRecord[] = [
      {
        id: "vow-1",
        user_id: USER_B,
        title: "emset exam clear",
        description: null,
        target_rounds: 1008,
        completed_rounds: 0,
        start_date: "2023-05-22",
        end_date: null,
        status: "active",
        completed_at: null,
        created_at: "2026-11-17T15:14:55.354Z",
        updated_at: "2026-11-17T15:14:55.354Z",
      },
      {
        id: "vow-2",
        user_id: USER_B,
        title: "got 2b exam cleared exam clear",
        description: null,
        target_rounds: 1000,
        completed_rounds: 0,
        start_date: "2023-06-20",
        end_date: null,
        status: "paused",
        completed_at: null,
        created_at: "2026-11-17T15:43:03.131Z",
        updated_at: "2026-11-17T15:43:03.131Z",
      },
      {
        id: "vow-3",
        user_id: USER_B,
        title: "got pass at emset",
        description: null,
        target_rounds: 1000,
        completed_rounds: 0,
        start_date: "2023-05-21",
        end_date: null,
        status: "paused",
        completed_at: null,
        created_at: "2026-11-17T15:44:01.305Z",
        updated_at: "2026-11-17T15:44:01.305Z",
      },
    ];

    const portfolio = summarizeSankalpaPortfolio(mockVows);

    expect(portfolio.count).toBe(3);
    expect(portfolio.activeCount).toBe(1);
    expect(portfolio.queuedCount).toBe(2);
    expect(portfolio.totalTargetRounds).toBe(3008);
    expect(portfolio.totalCompletedRounds).toBe(0);
    expect(portfolio.totalRemainingRounds).toBe(3008);
    expect(portfolio.overallProgressPercentage).toBe(0);

    // Verify equation formatting
    expect(portfolio.equationShort).toBe("1,008 + 1,000 + 1,000 = 3,008 rounds");
    expect(portfolio.equationText).toBe(
      "1,008 (emset exam clear) + 1,000 (got 2b exam cleared exam clear) + 1,000 (got pass at emset) = 3,008 Total Target Rounds"
    );

    // Verify breakdown letters and step indices
    expect(portfolio.vowsBreakdown[0]?.letter).toBe("a");
    expect(portfolio.vowsBreakdown[0]?.stepIndex).toBe(1);
    expect(portfolio.vowsBreakdown[0]?.title).toBe("emset exam clear");
    expect(portfolio.vowsBreakdown[0]?.targetRounds).toBe(1008);

    expect(portfolio.vowsBreakdown[1]?.letter).toBe("b");
    expect(portfolio.vowsBreakdown[1]?.stepIndex).toBe(2);
    expect(portfolio.vowsBreakdown[1]?.title).toBe("got 2b exam cleared exam clear");
    expect(portfolio.vowsBreakdown[1]?.targetRounds).toBe(1000);

    expect(portfolio.vowsBreakdown[2]?.letter).toBe("c");
    expect(portfolio.vowsBreakdown[2]?.stepIndex).toBe(3);
    expect(portfolio.vowsBreakdown[2]?.title).toBe("got pass at emset");
    expect(portfolio.vowsBreakdown[2]?.targetRounds).toBe(1000);
  });
});

