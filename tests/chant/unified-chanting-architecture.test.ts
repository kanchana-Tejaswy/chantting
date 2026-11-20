import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";

const USER_UNIFIED = "12121212-1212-4212-8212-121212121212";
const USER_CONCURRENT = "23232323-2323-4323-8323-232323232323";

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

describe("SMARAN Phase 2: Unified Chanting Data Architecture & Counting Engine", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_UNIFIED,
      email: "unified_devotee@example.org",
      name: "Gauranga",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_CONCURRENT,
      email: "concurrent_devotee@example.org",
      name: "Haridas",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("1. records one round through Manual Counter and updates today, remaining, monthly, yearly, and lifetime stats", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Initial ensure
    await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      await tx.query(
        `SELECT public.ensure_my_daily_sadhana($1::date)`,
        [today]
      );
    });

    // Record round 1 via Manual Counter
    const r1 = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: RecordRoundRpcResult }>(
        `SELECT public.record_chanting_round('manual', 'manual-key-round-001', NULL, NULL, NULL) AS res`
      );
      return res.rows[0]!.res;
    });

    expect(r1.duplicate).toBe(false);
    expect(r1.record.method).toBe("manual");
    expect(r1.daily_sadhana.completed_rounds).toBe(1);
    expect(r1.daily_sadhana.remaining_balance).toBe(15); // Base target is 16

    // Verify unified statistics
    const stats = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: ChantingStatsRpcResult }>(
        `SELECT public.get_chanting_statistics($1::date) AS res`,
        [today]
      );
      return res.rows[0]!.res;
    });

    expect(stats.today.completed_rounds).toBe(1);
    expect(stats.today.remaining_rounds).toBe(15);
    expect(stats.month.completed_rounds).toBe(1);
    expect(stats.year.completed_rounds).toBe(1);
    expect(stats.lifetime.completed_rounds).toBe(1);
  });

  it("2. records one round through Japa Mala and uses the same authoritative counting system", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Create active Japa Mala session
    const sessionId = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ id: string }>(
        `INSERT INTO public.chanting_sessions (user_id, sadhana_date, method, client_session_key, current_bead_count)
         VALUES ($1, $2::date, 'japa_mala', 'mala-sess-client-key-01', 107)
         RETURNING id`,
        [USER_UNIFIED, today]
      );
      return res.rows[0]!.id;
    });

    // Complete the 108th bead
    const r2 = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: RecordRoundRpcResult }>(
        `SELECT public.record_chanting_round('japa_mala', 'japa-mala-round-002', $1, NULL, NULL) AS res`,
        [sessionId]
      );
      return res.rows[0]!.res;
    });

    expect(r2.duplicate).toBe(false);
    expect(r2.record.method).toBe("japa_mala");
    expect(r2.daily_sadhana.completed_rounds).toBe(2);
    expect(r2.daily_sadhana.remaining_balance).toBe(14);

    // Verify session bead count reset to 0 and rounds_completed incremented
    const sessionRow = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ current_bead_count: number; rounds_completed: number }>(
        `SELECT current_bead_count, rounds_completed FROM public.chanting_sessions WHERE id = $1`,
        [sessionId]
      );
      return res.rows[0]!;
    });
    expect(sessionRow.current_bead_count).toBe(0);
    expect(sessionRow.rounds_completed).toBe(1);

    // Verify stats
    const stats = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: ChantingStatsRpcResult }>(
        `SELECT public.get_chanting_statistics($1::date) AS res`,
        [today]
      );
      return res.rows[0]!.res;
    });

    expect(stats.today.completed_rounds).toBe(2);
    expect(stats.today.remaining_rounds).toBe(14);
    expect(stats.month.completed_rounds).toBe(2);
    expect(stats.year.completed_rounds).toBe(2);
    expect(stats.lifetime.completed_rounds).toBe(2);
  });

  it("3. records one Sankalpa round and updates Sankalpa progress while counting toward daily, monthly, yearly, and lifetime totals", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Create an active Sankalpa (e.g. 100 rounds vow)
    const sankalpaId = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ id: string }>(
        `INSERT INTO public.sankalpas (user_id, title, target_rounds, start_date)
         VALUES ($1, 'Kartik Deep Vow', 100, $2::date)
         RETURNING id`,
        [USER_UNIFIED, today]
      );
      return res.rows[0]!.id;
    });

    // Record round with sankalpaId
    const r3 = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: RecordRoundRpcResult }>(
        `SELECT public.record_chanting_round('manual', 'sankalpa-round-key-003', NULL, NULL, $1) AS res`,
        [sankalpaId]
      );
      return res.rows[0]!.res;
    });

    expect(r3.duplicate).toBe(false);
    expect(r3.record.sankalpa_id).toBe(sankalpaId);
    expect(r3.sankalpa).not.toBeNull();
    expect(r3.sankalpa!.completed_rounds).toBe(1);
    expect(r3.sankalpa!.status).toBe("active");
    expect(r3.daily_sadhana.completed_rounds).toBe(3);
    expect(r3.daily_sadhana.remaining_balance).toBe(13);

    // Verify stats include active Sankalpa AND regular statistics
    const stats = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: ChantingStatsRpcResult }>(
        `SELECT public.get_chanting_statistics($1::date) AS res`,
        [today]
      );
      return res.rows[0]!.res;
    });

    expect(stats.today.completed_rounds).toBe(3);
    expect(stats.today.remaining_rounds).toBe(13);
    expect(stats.month.completed_rounds).toBe(3);
    expect(stats.year.completed_rounds).toBe(3);
    expect(stats.lifetime.completed_rounds).toBe(3);
    expect(stats.active_sankalpa).not.toBeNull();
    expect(stats.active_sankalpa!.id).toBe(sankalpaId);
    expect(stats.active_sankalpa!.completed_rounds).toBe(1);
    expect(stats.active_sankalpa!.remaining_rounds).toBe(99);
  });

  it("4. rejects duplicate submissions and never counts the same round twice", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Attempt to resubmit with the same idempotency key as round 3
    const duplicateRes = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: RecordRoundRpcResult }>(
        `SELECT public.record_chanting_round('manual', 'sankalpa-round-key-003', NULL, NULL, NULL) AS res`
      );
      return res.rows[0]!.res;
    });

    expect(duplicateRes.duplicate).toBe(true);
    expect(duplicateRes.daily_sadhana.completed_rounds).toBe(3); // Unchanged

    // Verify statistics did NOT increment
    const stats = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: ChantingStatsRpcResult }>(
        `SELECT public.get_chanting_statistics($1::date) AS res`,
        [today]
      );
      return res.rows[0]!.res;
    });

    expect(stats.today.completed_rounds).toBe(3);
    expect(stats.month.completed_rounds).toBe(3);
    expect(stats.year.completed_rounds).toBe(3);
    expect(stats.lifetime.completed_rounds).toBe(3);
    expect(stats.active_sankalpa).not.toBeNull();
    expect(stats.active_sankalpa!.completed_rounds).toBe(1);
  });

  it("5. undoes a completed round safely and removes it from daily, monthly, yearly, lifetime, and Sankalpa stats", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Fetch the ID of the Sankalpa round (round 3)
    const roundId = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ id: string }>(
        `SELECT id FROM public.chanting_records WHERE idempotency_key = 'sankalpa-round-key-003'`
      );
      return res.rows[0]!.id;
    });

    // Undo round 3
    const undoRes = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: UndoRoundRpcResult }>(
        `SELECT public.undo_chanting_round($1, 'accidental tap') AS res`,
        [roundId]
      );
      return res.rows[0]!.res;
    });

    expect(undoRes.already_reverted).toBe(false);
    expect(undoRes.record.is_reverted).toBe(true);
    expect(undoRes.daily_sadhana.completed_rounds).toBe(2);
    expect(undoRes.daily_sadhana.remaining_balance).toBe(14);
    expect(undoRes.sankalpa).not.toBeNull();
    expect(undoRes.sankalpa!.completed_rounds).toBe(0);

    // Verify statistics after undo
    const stats = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: ChantingStatsRpcResult }>(
        `SELECT public.get_chanting_statistics($1::date) AS res`,
        [today]
      );
      return res.rows[0]!.res;
    });

    expect(stats.today.completed_rounds).toBe(2);
    expect(stats.today.remaining_rounds).toBe(14);
    expect(stats.month.completed_rounds).toBe(2);
    expect(stats.year.completed_rounds).toBe(2);
    expect(stats.lifetime.completed_rounds).toBe(2);
    expect(stats.active_sankalpa).not.toBeNull();
    expect(stats.active_sankalpa!.completed_rounds).toBe(0);

    // Second undo attempt returns already_reverted: true without error
    const repeatUndo = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: UndoRoundRpcResult }>(
        `SELECT public.undo_chanting_round($1, 'retry undo') AS res`,
        [roundId]
      );
      return res.rows[0]!.res;
    });
    expect(repeatUndo.already_reverted).toBe(true);
  });

  it("6. supports offline queue retries and prevents replayed submissions from double-counting", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const clientTimestamp = new Date().toISOString();

    // 1st submission of offline round
    const res1 = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: RecordRoundRpcResult }>(
        `SELECT public.record_chanting_round('manual', 'offline-retry-key-01', NULL, $1::timestamptz, NULL) AS res`,
        [clientTimestamp]
      );
      return res.rows[0]!.res;
    });
    expect(res1.duplicate).toBe(false);
    expect(res1.record.sadhana_date).toBe(today);
    expect(res1.daily_sadhana.completed_rounds).toBe(3);

    // 2nd retry of the same offline round (e.g. queue was not cleared before reconnect)
    const res2 = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ res: RecordRoundRpcResult }>(
        `SELECT public.record_chanting_round('manual', 'offline-retry-key-01', NULL, $1::timestamptz, NULL) AS res`,
        [clientTimestamp]
      );
      return res.rows[0]!.res;
    });
    expect(res2.duplicate).toBe(true);
    expect(res2.daily_sadhana.completed_rounds).toBe(3); // Total remains 3
  });

  it("7. handles concurrent round completions safely without race conditions or lost counts", async () => {
    const today = new Date().toISOString().slice(0, 10);

    await asUser(testDb.db, USER_CONCURRENT, async (tx) => {
      await tx.query(
        `SELECT public.ensure_my_daily_sadhana($1::date)`,
        [today]
      );
    });

    // Fire 5 concurrent round submissions
    const results = await Promise.all(
      Array.from({ length: 5 }, (_, i) =>
        asUser(testDb.db, USER_CONCURRENT, async (tx) => {
          const res = await tx.query<{ res: RecordRoundRpcResult }>(
            `SELECT public.record_chanting_round('manual', $1, NULL, NULL, NULL) AS res`,
            [`concurrent-round-${i}-${Date.now()}`]
          );
          return res.rows[0]!.res;
        })
      )
    );

    // All 5 must succeed non-duplicate
    for (const r of results) {
      expect(r.duplicate).toBe(false);
    }

    // Verify exactly 5 completed rounds in daily_sadhana and stats
    const stats = await asUser(testDb.db, USER_CONCURRENT, async (tx) => {
      const res = await tx.query<{ res: ChantingStatsRpcResult }>(
        `SELECT public.get_chanting_statistics($1::date) AS res`,
        [today]
      );
      return res.rows[0]!.res;
    });

    expect(stats.today.completed_rounds).toBe(5);
    expect(stats.today.remaining_rounds).toBe(11);
    expect(stats.month.completed_rounds).toBe(5);
    expect(stats.year.completed_rounds).toBe(5);
    expect(stats.lifetime.completed_rounds).toBe(5);
  });

  it("8. strictly protects historical records dated before November 13, 2026 from modification or deletion", async () => {
    // Seed an actual pre-existing historical record dated Nov 10, 2026 created before Nov 13
    const seedRes = await testDb.db.query<{ id: string }>(
      `INSERT INTO public.chanting_records (
         user_id, sadhana_date, method, idempotency_key, recorded_at, timezone_snapshot, created_at
       ) VALUES (
         $1, '2026-11-10'::date, 'manual', 'hist-record-key-pre-nov13', '2026-11-10T12:00:00Z', 'UTC', '2026-11-10T12:00:00Z'
       ) RETURNING id`,
      [USER_UNIFIED]
    );
    const histRecordId = seedRes.rows[0]!.id;

    // Attempt to undo this historical record: MUST FAIL
    await expect(
      asUser(testDb.db, USER_UNIFIED, async (tx) => {
        await tx.query(
          `SELECT public.undo_chanting_round($1, 'trying to alter history')`,
          [histRecordId]
        );
      })
    ).rejects.toThrow(/Historical records dated before November 13, 2026 are protected/i);

    // Attempt to directly UPDATE this historical record: MUST FAIL by trigger
    await expect(
      testDb.db.query(
        `UPDATE public.chanting_records SET revert_reason = 'tampered' WHERE id = $1`,
        [histRecordId]
      )
    ).rejects.toThrow(/Historical chanting records dated before November 13, 2026 are protected/i);

    // Attempt to directly DELETE this historical record: MUST FAIL by trigger
    await expect(
      testDb.db.query(
        `DELETE FROM public.chanting_records WHERE id = $1`,
        [histRecordId]
      )
    ).rejects.toThrow(/Historical chanting records dated before November 13, 2026 are protected/i);

    // Verify record remains untouched
    const recordCheck = await asUser(testDb.db, USER_UNIFIED, async (tx) => {
      const res = await tx.query<{ id: string; is_reverted: boolean }>(
        `SELECT id, is_reverted FROM public.chanting_records WHERE id = $1`,
        [histRecordId]
      );
      return res.rows[0]!;
    });

    expect(recordCheck.id).toBe(histRecordId);
    expect(recordCheck.is_reverted).toBe(false);
  });
});

