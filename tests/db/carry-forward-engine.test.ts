import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "./helpers/pglite-bootstrap";

const USER_SADHAKA = "44444444-4444-4444-8444-444444444444";
const USER_POLICIES = "55555555-5555-4555-8555-555555555555";

interface DailyRow {
  sadhana_date: string;
  original_daily_target: number;
  previous_pending_balance: number;
  effective_daily_target: number;
  completed_rounds: number;
  remaining_balance: number;
  extra_rounds: number;
  policy_applied: string;
  day_status: string;
  has_activity: boolean;
}

describe("Automatic Carry-Forward Engine & Transactional Chanting RPCs", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_SADHAKA,
      email: "sadhaka@example.org",
      name: "Sadhaka",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_POLICIES,
      email: "policies@example.org",
      name: "PolicyTester",
      timezone: "Asia/Kolkata",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("carries pending balance into next day target and prevents silent erasure (Module C example)", async () => {
    // Initialize Day 1 relative to today-3 days so client_recorded_at stays within 30d window
    const now = new Date();
    const day1Date = new Date(now.getTime() - 3 * 86400_000);
    const day2Date = new Date(now.getTime() - 2 * 86400_000);
    const day3Date = new Date(now.getTime() - 1 * 86400_000);

    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // Day 1: target 16, complete 5 rounds -> remaining 11
    for (let i = 1; i <= 5; i++) {
      await asUser(testDb.db, USER_SADHAKA, async (tx) => {
        await tx.query(
          `SELECT public.record_chanting_round('manual', $1, NULL, $2::timestamptz)`,
          [`day1-round-${i}-abcdefgh`, day1Date.toISOString()]
        );
      });
    }

    const day1 = await asUser(testDb.db, USER_SADHAKA, async (tx) => {
      const r = await tx.query<DailyRow>(
        `SELECT sadhana_date::text, original_daily_target, previous_pending_balance,
                effective_daily_target, completed_rounds, remaining_balance, extra_rounds,
                policy_applied, day_status, has_activity
         FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
        [fmt(day1Date)]
      );
      return r.rows[0]!;
    });

    expect(day1.original_daily_target).toBe(16);
    expect(day1.previous_pending_balance).toBe(0);
    expect(day1.effective_daily_target).toBe(16);
    expect(day1.completed_rounds).toBe(5);
    expect(day1.remaining_balance).toBe(11);
    expect(day1.day_status).toBe("in_progress");

    // Day 2: original 16 + previous pending 11 = effective 27
    await asUser(testDb.db, USER_SADHAKA, async (tx) => {
      await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [fmt(day2Date)]);
    });

    const day2Initial = await asUser(testDb.db, USER_SADHAKA, async (tx) => {
      const r = await tx.query<DailyRow>(
        `SELECT sadhana_date::text, original_daily_target, previous_pending_balance,
                effective_daily_target, completed_rounds, remaining_balance, extra_rounds,
                policy_applied, day_status, has_activity
         FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
        [fmt(day2Date)]
      );
      return r.rows[0]!;
    });

    expect(day2Initial.original_daily_target).toBe(16);
    expect(day2Initial.previous_pending_balance).toBe(11);
    expect(day2Initial.effective_daily_target).toBe(27);
    expect(day2Initial.completed_rounds).toBe(0);
    expect(day2Initial.remaining_balance).toBe(27);
    expect(day2Initial.day_status).toBe("carried_forward");
    expect(day2Initial.has_activity).toBe(false);

    // Complete 30 rounds on Day 2 (3 extra rounds beyond 27)
    for (let i = 1; i <= 30; i++) {
      await asUser(testDb.db, USER_SADHAKA, async (tx) => {
        await tx.query(
          `SELECT public.record_chanting_round('japa_mala', $1, NULL, $2::timestamptz)`,
          [`day2-round-${i}-abcdefgh`, day2Date.toISOString()]
        );
      });
    }

    const day2After = await asUser(testDb.db, USER_SADHAKA, async (tx) => {
      const r = await tx.query<DailyRow>(
        `SELECT sadhana_date::text, original_daily_target, previous_pending_balance,
                effective_daily_target, completed_rounds, remaining_balance, extra_rounds,
                policy_applied, day_status, has_activity
         FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
        [fmt(day2Date)]
      );
      return r.rows[0]!;
    });

    expect(day2After.completed_rounds).toBe(30);
    expect(day2After.remaining_balance).toBe(0);
    expect(day2After.extra_rounds).toBe(3);
    expect(day2After.day_status).toBe("target_met");

    // Day 3: extra rounds do NOT reduce next day's target below original_daily_target (16)
    await asUser(testDb.db, USER_SADHAKA, async (tx) => {
      await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [fmt(day3Date)]);
    });

    const day3 = await asUser(testDb.db, USER_SADHAKA, async (tx) => {
      const r = await tx.query<DailyRow>(
        `SELECT sadhana_date::text, original_daily_target, previous_pending_balance,
                effective_daily_target, completed_rounds, remaining_balance, extra_rounds
         FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
        [fmt(day3Date)]
      );
      return r.rows[0]!;
    });

    expect(day3.original_daily_target).toBe(16);
    expect(day3.previous_pending_balance).toBe(0);
    expect(day3.effective_daily_target).toBe(16);
  });

  it("enforces idempotency, Japa Mala session reset, and forward-consistent undo", async () => {
    const sessRes = await asUser(testDb.db, USER_POLICIES, async (tx) => {
      return tx.query<{ id: string }>(
        `INSERT INTO public.chanting_sessions
         (user_id, sadhana_date, method, current_bead_count, client_session_key)
         VALUES ($1, CURRENT_DATE, 'japa_mala', 107, 'japa-session-key-108')
         RETURNING id`,
        [USER_POLICIES]
      );
    });
    const sessionId = sessRes.rows[0]!.id;

    // Submit 108th bead round completion
    const firstCall = await asUser(testDb.db, USER_POLICIES, async (tx) => {
      const r = await tx.query<{
        res: {
          duplicate: boolean;
          record: { id: string };
          daily_sadhana: { completed_rounds: number };
        };
      }>(
        `SELECT public.record_chanting_round('japa_mala', 'japa-idem-key-001', $1, NULL) AS res`,
        [sessionId]
      );
      return r.rows[0]!.res;
    });

    expect(firstCall.duplicate).toBe(false);
    expect(firstCall.daily_sadhana.completed_rounds).toBe(1);

    // Verify session reset beads to 0 and incremented rounds_completed to 1
    const sessAfter = await asUser(testDb.db, USER_POLICIES, async (tx) => {
      const r = await tx.query<{ current_bead_count: number; rounds_completed: number }>(
        `SELECT current_bead_count, rounds_completed FROM public.chanting_sessions WHERE id = $1`,
        [sessionId]
      );
      return r.rows[0]!;
    });
    expect(sessAfter).toEqual({ current_bead_count: 0, rounds_completed: 1 });

    // Replay same idempotency_key -> duplicate: true, count stays 1
    const replayCall = await asUser(testDb.db, USER_POLICIES, async (tx) => {
      const r = await tx.query<{
        res: { duplicate: boolean; daily_sadhana: { completed_rounds: number } };
      }>(
        `SELECT public.record_chanting_round('japa_mala', 'japa-idem-key-001', $1, NULL) AS res`,
        [sessionId]
      );
      return r.rows[0]!.res;
    });
    expect(replayCall.duplicate).toBe(true);
    expect(replayCall.daily_sadhana.completed_rounds).toBe(1);

    // Undo round once -> completed_rounds returns to 0; second undo is idempotent
    const undo1 = await asUser(testDb.db, USER_POLICIES, async (tx) => {
      const r = await tx.query<{
        res: { already_reverted: boolean; daily_sadhana: { completed_rounds: number } };
      }>(`SELECT public.undo_chanting_round($1, 'accidental tap') AS res`, [
        firstCall.record.id,
      ]);
      return r.rows[0]!.res;
    });
    expect(undo1.already_reverted).toBe(false);
    expect(undo1.daily_sadhana.completed_rounds).toBe(0);

    const undo2 = await asUser(testDb.db, USER_POLICIES, async (tx) => {
      const r = await tx.query<{
        res: { already_reverted: boolean; daily_sadhana: { completed_rounds: number } };
      }>(`SELECT public.undo_chanting_round($1, 'accidental tap') AS res`, [
        firstCall.record.id,
      ]);
      return r.rows[0]!.res;
    });
    expect(undo2.already_reverted).toBe(true);
    expect(undo2.daily_sadhana.completed_rounds).toBe(0);
  });

  it("supports optional carry-forward resolution and rejects invalid timezones", async () => {
    await expect(
      asUser(testDb.db, USER_POLICIES, async (tx) => {
        await tx.query(`UPDATE public.profiles SET timezone = 'Mars/Olympus' WHERE id = $1`, [
          USER_POLICIES,
        ]);
      })
    ).rejects.toThrow();

    // Switch USER_POLICIES to optional policy and create tomorrow's row
    const tomorrow = new Date(Date.now() + 86400_000).toISOString().slice(0, 10);

    await asUser(testDb.db, USER_POLICIES, async (tx) => {
      await tx.query(
        `UPDATE public.user_preferences
         SET carry_forward_policy = 'optional'
         WHERE user_id = $1`,
        [USER_POLICIES]
      );
    });

    // Prior day had 16 remaining (since 0 completed above)
    const beforeAccept = await asUser(testDb.db, USER_POLICIES, async (tx) => {
      const r = await tx.query<{ effective_daily_target: number; carry_forward_accepted: boolean | null }>(
        `SELECT (public.ensure_my_daily_sadhana($1::date)).effective_daily_target,
                (public.ensure_my_daily_sadhana($1::date)).carry_forward_accepted`,
        [tomorrow]
      );
      return r.rows[0]!;
    });
    expect(beforeAccept.effective_daily_target).toBe(16);
    expect(beforeAccept.carry_forward_accepted).toBeNull();

    // User accepts optional carry-forward -> target increases from 16 to 32
    const afterAccept = await asUser(testDb.db, USER_POLICIES, async (tx) => {
      const r = await tx.query<{
        effective_daily_target: number;
        previous_pending_balance: number;
        carry_forward_accepted: boolean;
      }>(
        `SELECT effective_daily_target, previous_pending_balance, carry_forward_accepted
         FROM public.resolve_optional_carry_forward($1::date, TRUE)`,
        [tomorrow]
      );
      return r.rows[0]!;
    });
    expect(afterAccept).toEqual({
      effective_daily_target: 32,
      previous_pending_balance: 16,
      carry_forward_accepted: true,
    });
  });

  it("propagates Day 1 undo forward to already-initialized Day 2 and enforces custom cap policy", async () => {
    const userMulti = "66666666-6666-4666-8666-666666666666";
    await seedTestUser(testDb.db, {
      id: userMulti,
      email: "multi@example.org",
      name: "Multi",
      timezone: "UTC",
    });

    const now = new Date();
    const d1 = new Date(now.getTime() - 2 * 86400_000);
    const d2 = new Date(now.getTime() - 1 * 86400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // Record 2 rounds on Day 1 (target 16 -> completed 2, remaining 14)
    const r1 = await asUser(testDb.db, userMulti, async (tx) => {
      const res = await tx.query<{ res: { record: { id: string } } }>(
        `SELECT public.record_chanting_round('manual', 'multi-d1-r1-abcdefgh', NULL, $1::timestamptz) AS res`,
        [d1.toISOString()]
      );
      return res.rows[0]!.res.record.id;
    });
    await asUser(testDb.db, userMulti, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'multi-d1-r2-abcdefgh', NULL, $1::timestamptz)`,
        [d1.toISOString()]
      );
    });

    // Initialize Day 2 (should carry 14 -> effective 30)
    await asUser(testDb.db, userMulti, async (tx) => {
      const res = await tx.query<{ effective_daily_target: number }>(
        `SELECT effective_daily_target FROM public.ensure_my_daily_sadhana($1::date)`,
        [fmt(d2)]
      );
      expect(res.rows[0]!.effective_daily_target).toBe(30);
    });

    // Undo one Day 1 round retroactively -> Day 1 remaining becomes 15, Day 2 effective becomes 31
    await asUser(testDb.db, userMulti, async (tx) => {
      await tx.query(`SELECT public.undo_chanting_round($1, 'retroactive correction')`, [r1]);
    });

    const d2AfterUndo = await asUser(testDb.db, userMulti, async (tx) => {
      const res = await tx.query<{
        previous_pending_balance: number;
        effective_daily_target: number;
      }>(
        `SELECT previous_pending_balance, effective_daily_target
         FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
        [fmt(d2)]
      );
      return res.rows[0]!;
    });
    expect(d2AfterUndo).toEqual({
      previous_pending_balance: 15,
      effective_daily_target: 31,
    });

    // Verify custom cap policy on Day 3
    const d3 = now;
    await asUser(testDb.db, userMulti, async (tx) => {
      await tx.query(
        `UPDATE public.user_preferences
         SET carry_forward_policy = 'custom',
             custom_carry_rule = '{"max_carry_cap": 5}'::jsonb
         WHERE user_id = $1`,
        [userMulti]
      );
      const res = await tx.query<{
        original_daily_target: number;
        previous_pending_balance: number;
        effective_daily_target: number;
      }>(
        `SELECT original_daily_target, previous_pending_balance, effective_daily_target
         FROM public.ensure_my_daily_sadhana($1::date)`,
        [fmt(d3)]
      );
      expect(res.rows[0]).toEqual({
        original_daily_target: 16,
        previous_pending_balance: 5,
        effective_daily_target: 21,
      });
    });
  });
});
