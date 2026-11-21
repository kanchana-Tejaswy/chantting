import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";

const DEVOTEE_ID = "34343434-3434-4434-8434-343434343434";
const DEVOTEE_CONCURRENT_ID = "45454545-4545-4545-8545-454545454545";
const DEVOTEE_MODES_ID = "56565656-5656-5656-9656-565656565656";

interface ManualRecordRpcResult {
  duplicate: boolean;
  entry: {
    id: string;
    user_id: string;
    session_id: string | null;
    names_count: number;
    previous_remainder: number;
    rounds_earned: number;
    new_remainder: number;
    is_reverted: boolean;
    idempotency_key: string;
    sadhana_date: string;
    recorded_at: string;
  };
  counter_state: {
    cumulative_names: number;
    cumulative_rounds: number;
    current_remainder: number;
  };
  rounds_earned: number;
  current_remainder: number;
  daily_sadhana: {
    sadhana_date: string;
    completed_rounds: number;
    remaining_balance: number;
    effective_daily_target: number;
  };
  session: {
    id: string;
    method: string;
    status: string;
    rounds_completed: number;
  } | null;
}

interface ManualUndoRpcResult {
  already_reverted: boolean;
  entry: {
    id: string;
    is_reverted: boolean;
    revert_reason: string;
  };
  counter_state: {
    cumulative_names: number;
    cumulative_rounds: number;
    current_remainder: number;
  };
  daily_sadhana: {
    completed_rounds: number;
    remaining_balance: number;
  };
}

describe("SMARAN — Manual Name Counter with Persistent Remainder", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: DEVOTEE_ID,
      email: "namajapa_devotee@example.org",
      name: "Rupa Goswami",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: DEVOTEE_CONCURRENT_ID,
      email: "concurrent_namajapa@example.org",
      name: "Sanatana Goswami",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: DEVOTEE_MODES_ID,
      email: "modes_devotee@example.org",
      name: "Jiva Goswami",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("1. Morning session: 250 names -> credits 2 rounds with 34 unconverted remainder", async () => {
    const today = new Date().toISOString().slice(0, 10);

    const result = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualRecordRpcResult }>(
        `SELECT public.record_manual_names(
          $1::integer,
          $2::text,
          $3::uuid,
          $4::boolean,
          $5::timestamptz,
          $6::uuid,
          $7::uuid
        ) AS res`,
        [250, "manual-morning-250", null, true, null, null, null]
      );
      return res.rows[0]!.res;
    });

    expect(result.duplicate).toBe(false);
    expect(result.rounds_earned).toBe(2); // 250 / 108 = 2
    expect(result.current_remainder).toBe(34); // 250 % 108 = 34
    expect(result.counter_state.cumulative_names).toBe(250);
    expect(result.counter_state.cumulative_rounds).toBe(2);
    expect(result.counter_state.current_remainder).toBe(34);

    // Invariant: cumulative_names = cumulative_rounds * 108 + current_remainder
    expect(result.counter_state.cumulative_names).toBe(
      result.counter_state.cumulative_rounds * 108 + result.counter_state.current_remainder
    );

    // Invariant: entry.previous_remainder + names_count = rounds_earned * 108 + new_remainder
    expect(result.entry.previous_remainder + result.entry.names_count).toBe(
      result.entry.rounds_earned * 108 + result.entry.new_remainder
    );

    // 2 rounds credited to daily sadhana (base target is 16, so remaining = 14)
    expect(result.daily_sadhana.completed_rounds).toBe(2);
    expect(result.daily_sadhana.remaining_balance).toBe(14);

    // 2 chanting_records created for this entry
    const roundRecords = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query(
        `SELECT * FROM public.chanting_records WHERE manual_entry_id = $1 ORDER BY recorded_at ASC`,
        [result.entry.id]
      );
      return res.rows;
    });
    expect(roundRecords.length).toBe(2);
  });

  it("2. Evening session: 250 names -> credits 2 additional rounds, carries 68 remainder, combined 500 names = 4 rounds", async () => {
    const result = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualRecordRpcResult }>(
        `SELECT public.record_manual_names(
          $1::integer,
          $2::text,
          $3::uuid,
          $4::boolean,
          $5::timestamptz,
          $6::uuid,
          $7::uuid
        ) AS res`,
        [250, "manual-evening-250", null, true, null, null, null]
      );
      return res.rows[0]!.res;
    });

    expect(result.duplicate).toBe(false);
    expect(result.entry.previous_remainder).toBe(34);
    // (34 + 250) = 284. 284 / 108 = 2 rounds. 284 % 108 = 68 remainder.
    expect(result.rounds_earned).toBe(2);
    expect(result.current_remainder).toBe(68);
    expect(result.counter_state.cumulative_names).toBe(500); // 250 + 250
    expect(result.counter_state.cumulative_rounds).toBe(4); // 2 + 2
    expect(result.counter_state.current_remainder).toBe(68);

    // Verify mathematical invariant
    expect(500).toBe(4 * 108 + 68);

    // Daily sadhana now has 4 completed rounds
    expect(result.daily_sadhana.completed_rounds).toBe(4);
    expect(result.daily_sadhana.remaining_balance).toBe(12);
  });

  it("3. Next session: 40 names -> 68 + 40 = 108 names -> credits 1 round with 0 remainder, combined 540 names = 5 rounds", async () => {
    const result = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualRecordRpcResult }>(
        `SELECT public.record_manual_names(
          $1::integer,
          $2::text,
          $3::uuid,
          $4::boolean,
          $5::timestamptz,
          $6::uuid,
          $7::uuid
        ) AS res`,
        [40, "manual-next-40", null, false, null, null, null]
      );
      return res.rows[0]!.res;
    });

    expect(result.duplicate).toBe(false);
    expect(result.entry.previous_remainder).toBe(68);
    // (68 + 40) = 108. 108 / 108 = 1 round. 108 % 108 = 0 remainder.
    expect(result.rounds_earned).toBe(1);
    expect(result.current_remainder).toBe(0);
    expect(result.counter_state.cumulative_names).toBe(540); // 500 + 40
    expect(result.counter_state.cumulative_rounds).toBe(5); // 4 + 1
    expect(result.counter_state.current_remainder).toBe(0);

    // Verify mathematical invariant
    expect(540).toBe(5 * 108 + 0);

    // Daily sadhana now has 5 completed rounds
    expect(result.daily_sadhana.completed_rounds).toBe(5);
    expect(result.daily_sadhana.remaining_balance).toBe(11);
  });

  it("4. Partial entry under 108: 50 names -> credits 0 rounds and sets remainder to 50", async () => {
    const result = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualRecordRpcResult }>(
        `SELECT public.record_manual_names(
          $1::integer,
          $2::text,
          $3::uuid,
          $4::boolean,
          $5::timestamptz,
          $6::uuid,
          $7::uuid
        ) AS res`,
        [50, "manual-partial-50", null, false, null, null, null]
      );
      return res.rows[0]!.res;
    });

    expect(result.rounds_earned).toBe(0);
    expect(result.current_remainder).toBe(50);
    expect(result.counter_state.cumulative_names).toBe(590); // 540 + 50
    expect(result.counter_state.cumulative_rounds).toBe(5);
    expect(result.counter_state.current_remainder).toBe(50);

    // Daily sadhana stays at 5 completed rounds
    expect(result.daily_sadhana.completed_rounds).toBe(5);

    // Zero chanting_records created for a 0-round entry
    const roundRecords = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query(
        `SELECT * FROM public.chanting_records WHERE manual_entry_id = $1`,
        [result.entry.id]
      );
      return res.rows;
    });
    expect(roundRecords.length).toBe(0);
  });

  it("5. Start New Session preserves cumulative remainder without reset", async () => {
    // Current remainder is 50. Devotee starts a new session with 60 names.
    // 50 + 60 = 110 -> 1 round + 2 remainder.
    const result = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualRecordRpcResult }>(
        `SELECT public.record_manual_names(
          $1::integer,
          $2::text,
          $3::uuid,
          $4::boolean,
          $5::timestamptz,
          $6::uuid,
          $7::uuid
        ) AS res`,
        [60, "manual-new-session-60", null, true, null, null, null]
      );
      return res.rows[0]!.res;
    });

    expect(result.entry.previous_remainder).toBe(50);
    expect(result.rounds_earned).toBe(1);
    expect(result.current_remainder).toBe(2);
    expect(result.session).not.toBeNull();
    expect(result.counter_state.cumulative_names).toBe(650); // 590 + 60
    expect(result.counter_state.cumulative_rounds).toBe(6); // 5 + 1
  });

  it("6. Continue Previous Session attaches entry to the specified session", async () => {
    // Fetch active session id
    const activeSession = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ id: string }>(
        `SELECT id FROM public.chanting_sessions WHERE user_id = $1 AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
        [DEVOTEE_ID]
      );
      return res.rows[0];
    });

    expect(activeSession).toBeDefined();

    const result = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualRecordRpcResult }>(
        `SELECT public.record_manual_names(
          $1::integer,
          $2::text,
          $3::uuid,
          $4::boolean,
          $5::timestamptz,
          $6::uuid,
          $7::uuid
        ) AS res`,
        [106, "manual-continue-sess-106", activeSession!.id, false, null, null, null]
      );
      return res.rows[0]!.res;
    });

    // 2 (prev remainder) + 106 = 108 -> exactly 1 round + 0 remainder
    expect(result.rounds_earned).toBe(1);
    expect(result.current_remainder).toBe(0);
    expect(result.entry.session_id).toBe(activeSession!.id);
    expect(result.session?.id).toBe(activeSession!.id);
    expect(result.counter_state.cumulative_names).toBe(756);
    expect(result.counter_state.cumulative_rounds).toBe(7);
  });

  it("7. Idempotency: duplicate submission returns existing entry without double-counting", async () => {
    const duplicateRes = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualRecordRpcResult }>(
        `SELECT public.record_manual_names(
          $1::integer,
          $2::text,
          $3::uuid,
          $4::boolean,
          $5::timestamptz,
          $6::uuid,
          $7::uuid
        ) AS res`,
        [106, "manual-continue-sess-106", null, false, null, null, null]
      );
      return res.rows[0]!.res;
    });

    expect(duplicateRes.duplicate).toBe(true);
    // Cumulative totals remain unchanged
    expect(duplicateRes.counter_state.cumulative_names).toBe(756);
    expect(duplicateRes.counter_state.cumulative_rounds).toBe(7);
    expect(duplicateRes.counter_state.current_remainder).toBe(0);
  });

  it("8. Undo reverts credited rounds, restores previous remainder, and maintains contiguous chain", async () => {
    // Current state: 756 names, 7 rounds, 0 remainder.
    // The last non-reverted entry was: 106 names (prev 2, earned 1, new 0).
    const latestEntry = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ id: string; names_count: number; rounds_earned: number }>(
        `SELECT id, names_count, rounds_earned FROM public.manual_name_entries WHERE user_id = $1 AND is_reverted = false ORDER BY created_at DESC LIMIT 1`,
        [DEVOTEE_ID]
      );
      return res.rows[0]!;
    });

    expect(latestEntry.names_count).toBe(106);
    expect(latestEntry.rounds_earned).toBe(1);

    const undoRes = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualUndoRpcResult }>(
        `SELECT public.undo_manual_name_entry($1::uuid, 'user_undo') AS res`,
        [latestEntry.id]
      );
      return res.rows[0]!.res;
    });

    expect(undoRes.already_reverted).toBe(false);
    expect(undoRes.entry.is_reverted).toBe(true);
    // Restored cumulative state: 756 - 106 = 650 names, 7 - 1 = 6 rounds, remainder = 2
    expect(undoRes.counter_state.cumulative_names).toBe(650);
    expect(undoRes.counter_state.cumulative_rounds).toBe(6);
    expect(undoRes.counter_state.current_remainder).toBe(2);
    expect(undoRes.daily_sadhana.completed_rounds).toBe(6);

    // Chanting records linked to this entry should be marked reverted
    const revertedRecords = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ is_reverted: boolean }>(
        `SELECT is_reverted FROM public.chanting_records WHERE manual_entry_id = $1`,
        [latestEntry.id]
      );
      return res.rows;
    });
    expect(revertedRecords.every((r) => r.is_reverted)).toBe(true);

    // Re-attempting to undo already reverted entry returns already_reverted = true
    const reUndo = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualUndoRpcResult }>(
        `SELECT public.undo_manual_name_entry($1::uuid, 'user_undo') AS res`,
        [latestEntry.id]
      );
      return res.rows[0]!.res;
    });
    expect(reUndo.already_reverted).toBe(true);
  });

  it("9. Multi-day remainder persistence: remainder carries forward to another date", async () => {
    // Current remainder is 2.
    // Record an entry on yesterday's date with 106 names:
    const yesterday = new Date(Date.now() - 86400000).toISOString();

    const yesterdayRes = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ res: ManualRecordRpcResult }>(
        `SELECT public.record_manual_names(
          $1::integer,
          $2::text,
          $3::uuid,
          $4::boolean,
          $5::timestamptz,
          $6::uuid,
          $7::uuid
        ) AS res`,
        [106, "manual-yesterday-106", null, true, yesterday, null, null]
      );
      return res.rows[0]!.res;
    });

    expect(yesterdayRes.entry.previous_remainder).toBe(2);
    expect(yesterdayRes.rounds_earned).toBe(1);
    expect(yesterdayRes.current_remainder).toBe(0);
    // Credited round is attributed to yesterday's date
    expect(yesterdayRes.daily_sadhana.sadhana_date).toBe(yesterday.slice(0, 10));
    expect(yesterdayRes.daily_sadhana.completed_rounds).toBe(1);
  });

  it("10. Digital Japa Mala and Manual entries reconcile harmoniously without double-counting", async () => {
    const today = new Date().toISOString().slice(0, 10);

    // Devotee records 1 round via Digital Japa Mala
    await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'digital-mala-test-01', NULL, NULL, NULL)`
      );
    });

    // Check today's daily_sadhana completed rounds
    const sadhanaToday = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ completed_rounds: number }>(
        `SELECT completed_rounds FROM public.daily_sadhana WHERE user_id = $1 AND sadhana_date = $2`,
        [DEVOTEE_ID, today]
      );
      return res.rows[0]!;
    });

    // Today already had 6 manual rounds + 1 digital round = 7 total rounds
    expect(sadhanaToday.completed_rounds).toBe(7);

    // Records are distinguishable by method
    const records = await asUser(testDb.db, DEVOTEE_ID, async (tx) => {
      const res = await tx.query<{ method: string; count: string }>(
        `SELECT method, count(*)::text AS count FROM public.chanting_records WHERE user_id = $1 AND is_reverted = false GROUP BY method`,
        [DEVOTEE_ID]
      );
      return res.rows;
    });

    const manualCount = Number(records.find((r) => r.method === "manual")?.count ?? 0);
    const digitalCount = Number(records.find((r) => r.method === "japa_mala")?.count ?? 0);
    expect(manualCount).toBeGreaterThan(0);
    expect(digitalCount).toBe(1);
  });

  it("11. Concurrency: serializes concurrent manual name entries safely", async () => {
    // 5 concurrent submissions of 108 names each for DEVOTEE_CONCURRENT_ID
    const promises = Array.from({ length: 5 }, (_, i) =>
      asUser(testDb.db, DEVOTEE_CONCURRENT_ID, async (tx) => {
        const res = await tx.query<{ res: ManualRecordRpcResult }>(
          `SELECT public.record_manual_names(
            $1::integer,
            $2::text,
            $3::uuid,
            $4::boolean,
            $5::timestamptz,
            $6::uuid,
            $7::uuid
          ) AS res`,
          [108, `concurrent-manual-key-${i}`, null, false, null, null, null]
        );
        return res.rows[0]!.res;
      })
    );

    const results = await Promise.all(promises);
    expect(results.length).toBe(5);

    // Check final state for DEVOTEE_CONCURRENT_ID
    const finalState = await asUser(testDb.db, DEVOTEE_CONCURRENT_ID, async (tx) => {
      const res = await tx.query<{ cumulative_names: number; cumulative_rounds: number; current_remainder: number }>(
        `SELECT cumulative_names, cumulative_rounds, current_remainder FROM public.manual_counter_state WHERE user_id = $1`,
        [DEVOTEE_CONCURRENT_ID]
      );
      return res.rows[0]!;
    });

    // 5 * 108 = 540 names = 5 rounds, 0 remainder
    expect(finalState.cumulative_names).toBe(540);
    expect(finalState.cumulative_rounds).toBe(5);
    expect(finalState.current_remainder).toBe(0);
  });

  describe("Dual Modes: Mode A (Japa Mala: +1 Round) and Mode B (Digital Counter: Enter Names)", () => {
    it("12. Mode A (Japa Mala): One tap = 108 names = 1 round", async () => {
      const result = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ res: ManualRecordRpcResult }>(
          `SELECT public.record_manual_names(
            $1::integer,
            $2::text,
            $3::uuid,
            $4::boolean,
            $5::timestamptz,
            $6::uuid,
            $7::uuid
          ) AS res`,
          [108, "japa-mala-tap-01", null, true, null, null, null]
        );
        return res.rows[0]!.res;
      });

      expect(result.rounds_earned).toBe(1);
      expect(result.current_remainder).toBe(0);
      expect(result.counter_state.cumulative_names).toBe(108);
      expect(result.counter_state.cumulative_rounds).toBe(1);
      expect(result.counter_state.current_remainder).toBe(0);
      expect(result.daily_sadhana.completed_rounds).toBe(1);
    });

    it("13. Mode A (Japa Mala): Multiple round entries (e.g. 2 rounds = 216 names)", async () => {
      const result = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ res: ManualRecordRpcResult }>(
          `SELECT public.record_manual_names(
            $1::integer,
            $2::text,
            $3::uuid,
            $4::boolean,
            $5::timestamptz,
            $6::uuid,
            $7::uuid
          ) AS res`,
          [216, "japa-mala-multi-216", null, false, null, null, null]
        );
        return res.rows[0]!.res;
      });

      expect(result.rounds_earned).toBe(2);
      expect(result.current_remainder).toBe(0);
      expect(result.counter_state.cumulative_names).toBe(324); // 108 + 216
      expect(result.counter_state.cumulative_rounds).toBe(3); // 1 + 2
      expect(result.daily_sadhana.completed_rounds).toBe(3);
    });

    it("14. Mode B (Digital Counter): Entry under 108 names preserves remainder (34 names)", async () => {
      const result = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ res: ManualRecordRpcResult }>(
          `SELECT public.record_manual_names(
            $1::integer,
            $2::text,
            $3::uuid,
            $4::boolean,
            $5::timestamptz,
            $6::uuid,
            $7::uuid
          ) AS res`,
          [34, "digital-counter-entry-34", null, false, null, null, null]
        );
        return res.rows[0]!.res;
      });

      expect(result.rounds_earned).toBe(0);
      expect(result.current_remainder).toBe(34);
      expect(result.counter_state.cumulative_names).toBe(358); // 324 + 34
      expect(result.counter_state.cumulative_rounds).toBe(3);
      expect(result.counter_state.current_remainder).toBe(34);
      expect(result.daily_sadhana.completed_rounds).toBe(3);
    });

    it("15. Japa Mala tap with a nonzero remainder (34 + 108 = 142 -> 1 round + 34 remainder preserved)", async () => {
      // Devotee currently has 34 remainder. Devotee taps Japa Mala mode (+108 names).
      const result = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ res: ManualRecordRpcResult }>(
          `SELECT public.record_manual_names(
            $1::integer,
            $2::text,
            $3::uuid,
            $4::boolean,
            $5::timestamptz,
            $6::uuid,
            $7::uuid
          ) AS res`,
          [108, "japa-mala-with-remainder-108", null, false, null, null, null]
        );
        return res.rows[0]!.res;
      });

      expect(result.entry.previous_remainder).toBe(34);
      expect(result.rounds_earned).toBe(1); // (34 + 108) / 108 = 1
      expect(result.current_remainder).toBe(34); // (34 + 108) % 108 = 34 strictly preserved!
      expect(result.counter_state.cumulative_names).toBe(466); // 358 + 108
      expect(result.counter_state.cumulative_rounds).toBe(4); // 3 + 1
      expect(result.counter_state.current_remainder).toBe(34);
      expect(result.daily_sadhana.completed_rounds).toBe(4);
    });

    it("16. Mode switching: Transitioning back to Mode B and entering remaining 74 names completes round with 0 remainder", async () => {
      // Devotee switches back to Digital Counter mode and enters 74 names
      const result = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ res: ManualRecordRpcResult }>(
          `SELECT public.record_manual_names(
            $1::integer,
            $2::text,
            $3::uuid,
            $4::boolean,
            $5::timestamptz,
            $6::uuid,
            $7::uuid
          ) AS res`,
          [74, "digital-counter-finish-74", null, false, null, null, null]
        );
        return res.rows[0]!.res;
      });

      expect(result.entry.previous_remainder).toBe(34);
      expect(result.rounds_earned).toBe(1); // (34 + 74) / 108 = 1 round
      expect(result.current_remainder).toBe(0); // (34 + 74) % 108 = 0 remainder
      expect(result.counter_state.cumulative_names).toBe(540); // 466 + 74
      expect(result.counter_state.cumulative_rounds).toBe(5); // 4 + 1
      expect(result.counter_state.current_remainder).toBe(0);
      expect(result.daily_sadhana.completed_rounds).toBe(5);
    });

    it("17. Undo for both modes: reverting Digital Counter entry and Japa Mala tap restores previous state accurately", async () => {
      // Undo the last Digital Counter entry of 74 names
      const lastEntry = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ id: string; names_count: number }>(
          `SELECT id, names_count FROM public.manual_name_entries WHERE user_id = $1 AND is_reverted = false ORDER BY created_at DESC LIMIT 1`,
          [DEVOTEE_MODES_ID]
        );
        return res.rows[0]!;
      });

      expect(lastEntry.names_count).toBe(74);

      const undoRes = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ res: ManualUndoRpcResult }>(
          `SELECT public.undo_manual_name_entry($1::uuid, 'user_undo') AS res`,
          [lastEntry.id]
        );
        return res.rows[0]!.res;
      });

      // Remainder restored to 34, rounds decremented to 4, cumulative names restored to 466
      expect(undoRes.counter_state.current_remainder).toBe(34);
      expect(undoRes.counter_state.cumulative_rounds).toBe(4);
      expect(undoRes.counter_state.cumulative_names).toBe(466);
      expect(undoRes.daily_sadhana.completed_rounds).toBe(4);

      // Now undo the prior Japa Mala entry of 108 names
      const priorEntry = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ id: string; names_count: number }>(
          `SELECT id, names_count FROM public.manual_name_entries WHERE user_id = $1 AND is_reverted = false ORDER BY created_at DESC LIMIT 1`,
          [DEVOTEE_MODES_ID]
        );
        return res.rows[0]!;
      });

      expect(priorEntry.names_count).toBe(108);

      const undoPriorRes = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ res: ManualUndoRpcResult }>(
          `SELECT public.undo_manual_name_entry($1::uuid, 'user_undo') AS res`,
          [priorEntry.id]
        );
        return res.rows[0]!.res;
      });

      // Remainder stays at 34, rounds decremented to 3, cumulative names restored to 358
      expect(undoPriorRes.counter_state.current_remainder).toBe(34);
      expect(undoPriorRes.counter_state.cumulative_rounds).toBe(3);
      expect(undoPriorRes.counter_state.cumulative_names).toBe(358);
      expect(undoPriorRes.daily_sadhana.completed_rounds).toBe(3);
    });

    it("18. Existing interactive 108-bead Digital Japa Mala functions independently without interference", async () => {
      const today = new Date().toISOString().slice(0, 10);

      // Devotee records 1 round via the 108-bead Digital Japa Mala Wheel
      await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        await tx.query(
          `SELECT public.record_chanting_round('japa_mala', 'digital-wheel-test-01', NULL, NULL, NULL)`
        );
      });

      // Daily sadhana completed rounds: 3 manual rounds + 1 digital round = 4 total rounds
      const sadhana = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ completed_rounds: number }>(
          `SELECT completed_rounds FROM public.daily_sadhana WHERE user_id = $1 AND sadhana_date = $2`,
          [DEVOTEE_MODES_ID, today]
        );
        return res.rows[0]!;
      });
      expect(sadhana.completed_rounds).toBe(4);

      // Manual counter state remains unaffected by digital mala round
      const manualState = await asUser(testDb.db, DEVOTEE_MODES_ID, async (tx) => {
        const res = await tx.query<{ cumulative_names: number; cumulative_rounds: number; current_remainder: number }>(
          `SELECT cumulative_names, cumulative_rounds, current_remainder FROM public.manual_counter_state WHERE user_id = $1`,
          [DEVOTEE_MODES_ID]
        );
        return res.rows[0]!;
      });
      expect(manualState.cumulative_names).toBe(358);
      expect(manualState.cumulative_rounds).toBe(3);
      expect(manualState.current_remainder).toBe(34);
    });
  });
});
