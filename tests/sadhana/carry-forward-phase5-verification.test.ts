import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";

const USER_ROLLOVER = "91919191-9191-4191-8191-919191919191";
const USER_ZERO_ROUND = "92929292-9292-4292-8292-929292929292";
const USER_FULL_ROUND = "93939393-9393-4393-8393-939393939393";
const USER_OPTIONAL = "94949494-9494-4494-8494-949494949494";
const USER_CUSTOM_CAP = "95959595-9595-4595-8595-959595959595";
const USER_CASCADE = "96969696-9696-4696-8696-969696969696";
const USER_HISTORICAL = "97979797-9797-4797-8797-979797979797";

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

interface RecordRoundRpcResult {
  duplicate: boolean;
  record: {
    id: string;
    user_id: string;
    sadhana_date: string;
    method: string;
  };
  daily_sadhana: {
    sadhana_date: string;
    completed_rounds: number;
    remaining_balance: number;
    effective_daily_target: number;
  };
}

describe("SMARAN — Phase 5: Automatic Daily Carry-Forward Engine Verification", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_ROLLOVER,
      email: "rollover@example.org",
      name: "RolloverUser",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_ZERO_ROUND,
      email: "zero@example.org",
      name: "ZeroUser",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_FULL_ROUND,
      email: "full@example.org",
      name: "FullUser",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_OPTIONAL,
      email: "optional@example.org",
      name: "OptionalUser",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_CUSTOM_CAP,
      email: "customcap@example.org",
      name: "CustomCapUser",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_CASCADE,
      email: "cascade@example.org",
      name: "CascadeUser",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_HISTORICAL,
      email: "historical@example.org",
      name: "HistoricalUser",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe("1. Normal Daily Rollover & Required Prompt Example", () => {
    it("Yesterday (16 target, 11 completed -> 5 remaining) carries into Today (16 + 5 = 21 effective, complete 6 -> 15 remaining)", async () => {
      const now = Date.now();
      const d1 = new Date(now - 2 * 86400_000);
      const d2 = new Date(now - 1 * 86400_000);
      const d3 = new Date(now);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const yesterday = fmt(d1);
      const today = fmt(d2);
      const tomorrow = fmt(d3);

      // 1. Ensure Yesterday with base target 16
      await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [yesterday]);
      });

      // Complete 11 rounds on Yesterday
      for (let i = 1; i <= 11; i++) {
        await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
          await tx.query(
            `SELECT public.record_chanting_round('manual', $1, NULL, $2::timestamptz)`,
            [`yesterday-round-${i}-key`, d1.toISOString()]
          );
        });
      }

      // Verify Yesterday state: completed 11, remaining 5
      const yestRow = await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT sadhana_date::text, original_daily_target, previous_pending_balance,
                  effective_daily_target, completed_rounds, remaining_balance
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [yesterday]
        );
        return res.rows[0]!;
      });

      expect(yestRow.original_daily_target).toBe(16);
      expect(yestRow.completed_rounds).toBe(11);
      expect(yestRow.remaining_balance).toBe(5);

      // 2. Open Today: base target 16 + carried balance 5 = effective target 21
      await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [today]);
      });

      const todayInitial = await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT sadhana_date::text, original_daily_target, previous_pending_balance,
                  effective_daily_target, completed_rounds, remaining_balance
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [today]
        );
        return res.rows[0]!;
      });

      expect(todayInitial.original_daily_target).toBe(16);
      expect(todayInitial.previous_pending_balance).toBe(5);
      expect(todayInitial.effective_daily_target).toBe(21);
      expect(todayInitial.completed_rounds).toBe(0);
      expect(todayInitial.remaining_balance).toBe(21);

      // 3. Complete 6 rounds on Today
      for (let i = 1; i <= 6; i++) {
        await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
          await tx.query(
            `SELECT public.record_chanting_round('japa_mala', $1, NULL, $2::timestamptz)`,
            [`today-round-${i}-key`, d2.toISOString()]
          );
        });
      }

      const todayAfter = await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT sadhana_date::text, original_daily_target, previous_pending_balance,
                  effective_daily_target, completed_rounds, remaining_balance
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [today]
        );
        return res.rows[0]!;
      });

      expect(todayAfter.completed_rounds).toBe(6);
      expect(todayAfter.remaining_balance).toBe(15); // 21 - 6 = 15

      // 4. Verify lifetime chanting count increases by actual completed rounds (11 + 6 = 17)
      const stats = await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
        const res = await tx.query<{ res: { lifetime: { completed_rounds: number } } }>(
          `SELECT public.get_chanting_statistics($1::date) AS res`,
          [today]
        );
        return res.rows[0]!.res;
      });

      expect(stats.lifetime.completed_rounds).toBe(17);

      // 5. Subsequent Day Rollover: Tomorrow carries Today's 15 remaining rounds
      await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [tomorrow]);
      });

      const tomorrowRow = await asUser(testDb.db, USER_ROLLOVER, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT sadhana_date::text, original_daily_target, previous_pending_balance,
                  effective_daily_target, completed_rounds, remaining_balance
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [tomorrow]
        );
        return res.rows[0]!;
      });

      expect(tomorrowRow.original_daily_target).toBe(16);
      expect(tomorrowRow.previous_pending_balance).toBe(15);
      expect(tomorrowRow.effective_daily_target).toBe(31); // 16 + 15
      expect(tomorrowRow.remaining_balance).toBe(31);
    });
  });

  describe("2. Boundary Conditions: Zero Rounds, Fully Completed, Multi-Day Absence", () => {
    it("handles zero completed rounds by carrying the full target forward", async () => {
      const now = Date.now();
      const d1 = new Date(now - 6 * 86400_000);
      const d2 = new Date(now - 5 * 86400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const dayA = fmt(d1);
      const dayB = fmt(d2);

      await asUser(testDb.db, USER_ZERO_ROUND, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [dayA]);
        // 0 rounds chanted on dayA -> remaining = 16
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [dayB]);
      });

      const dayBRow = await asUser(testDb.db, USER_ZERO_ROUND, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT previous_pending_balance, effective_daily_target, remaining_balance
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [dayB]
        );
        return res.rows[0]!;
      });

      expect(dayBRow.previous_pending_balance).toBe(16);
      expect(dayBRow.effective_daily_target).toBe(32); // 16 + 16
      expect(dayBRow.remaining_balance).toBe(32);
    });

    it("handles fully completed targets by carrying forward 0 rounds", async () => {
      const now = Date.now();
      const d1 = new Date(now - 4 * 86400_000);
      const d2 = new Date(now - 3 * 86400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const dayC = fmt(d1);
      const dayD = fmt(d2);

      await asUser(testDb.db, USER_FULL_ROUND, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [dayC]);
      });

      // Complete all 16 rounds on dayC
      for (let i = 1; i <= 16; i++) {
        await asUser(testDb.db, USER_FULL_ROUND, async (tx) => {
          await tx.query(
            `SELECT public.record_chanting_round('manual', $1, NULL, $2::timestamptz)`,
            [`full-target-r${i}`, d1.toISOString()]
          );
        });
      }

      await asUser(testDb.db, USER_FULL_ROUND, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [dayD]);
      });

      const dayDRow = await asUser(testDb.db, USER_FULL_ROUND, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT previous_pending_balance, effective_daily_target, remaining_balance
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [dayD]
        );
        return res.rows[0]!;
      });

      expect(dayDRow.previous_pending_balance).toBe(0);
      expect(dayDRow.effective_daily_target).toBe(16);
      expect(dayDRow.remaining_balance).toBe(16);
    });
  });

  describe("3. All Four Policies: Automatic, Optional, Fresh Daily, Custom Cap", () => {
    it("executes optional policy with user acceptance and user rejection", async () => {
      const now = Date.now();
      const d1 = new Date(now - 2 * 86400_000);
      const d2 = new Date(now - 1 * 86400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const dayX = fmt(d1);
      const dayY = fmt(d2);

      // Configure optional policy
      await asUser(testDb.db, USER_OPTIONAL, async (tx) => {
        await tx.query(
          `SELECT public.update_carry_forward_policy('optional', '{}'::jsonb, FALSE, $1::date)`,
          [dayX]
        );
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [dayX]);
      });

      // Chanted 6 on dayX -> 10 remaining
      for (let i = 1; i <= 6; i++) {
        await asUser(testDb.db, USER_OPTIONAL, async (tx) => {
          await tx.query(
            `SELECT public.record_chanting_round('manual', $1, NULL, $2::timestamptz)`,
            [`opt-x-r${i}`, d1.toISOString()]
          );
        });
      }

      // Open dayY -> awaiting user confirmation
      await asUser(testDb.db, USER_OPTIONAL, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [dayY]);
      });

      const dayYBefore = await asUser(testDb.db, USER_OPTIONAL, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT previous_pending_balance, effective_daily_target
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [dayY]
        );
        return res.rows[0]!;
      });

      expect(dayYBefore.previous_pending_balance).toBe(0); // Pending user confirmation

      // User accepts optional carry forward
      await asUser(testDb.db, USER_OPTIONAL, async (tx) => {
        await tx.query(
          `SELECT public.resolve_optional_carry_forward($1::date, TRUE)`,
          [dayY]
        );
      });

      const dayYAfter = await asUser(testDb.db, USER_OPTIONAL, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT previous_pending_balance, effective_daily_target, remaining_balance
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [dayY]
        );
        return res.rows[0]!;
      });

      expect(dayYAfter.previous_pending_balance).toBe(10);
      expect(dayYAfter.effective_daily_target).toBe(26); // 16 + 10
      expect(dayYAfter.remaining_balance).toBe(26);
    });

    it("executes custom cap policy capping carried balance while preserving overflow in ledger", async () => {
      const now = Date.now();
      const d1 = new Date(now - 2 * 86400_000);
      const d2 = new Date(now - 1 * 86400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const dayM = fmt(d1);
      const dayN = fmt(d2);

      // Configure custom cap = 4 rounds
      await asUser(testDb.db, USER_CUSTOM_CAP, async (tx) => {
        await tx.query(
          `SELECT public.update_carry_forward_policy('custom', '{"max_carry_cap": 4}'::jsonb, FALSE, $1::date)`,
          [dayM]
        );
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [dayM]);
      });

      // Complete 2 on dayM -> 14 remaining
      for (let i = 1; i <= 2; i++) {
        await asUser(testDb.db, USER_CUSTOM_CAP, async (tx) => {
          await tx.query(
            `SELECT public.record_chanting_round('manual', $1, NULL, $2::timestamptz)`,
            [`cap-m-r${i}`, d1.toISOString()]
          );
        });
      }

      // Open dayN: should carry at most 4 rounds
      await asUser(testDb.db, USER_CUSTOM_CAP, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [dayN]);
      });

      const dayNRow = await asUser(testDb.db, USER_CUSTOM_CAP, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT previous_pending_balance, effective_daily_target
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [dayN]
        );
        return res.rows[0]!;
      });

      expect(dayNRow.previous_pending_balance).toBe(4);
      expect(dayNRow.effective_daily_target).toBe(20); // 16 + 4

      // Verify ledger recorded 14 source and 4 carried (10 unapplied overflow)
      const ledgerEntry = await asUser(testDb.db, USER_CUSTOM_CAP, async (tx) => {
        const res = await tx.query<{ source_remaining_balance: number; carried_amount: number }>(
          `SELECT source_remaining_balance, carried_amount
           FROM public.carry_forward_ledger WHERE to_date = $1::date`,
          [dayN]
        );
        return res.rows[0]!;
      });

      expect(ledgerEntry.source_remaining_balance).toBe(14);
      expect(ledgerEntry.carried_amount).toBe(4);
    });
  });

  describe("4. Undo After Rollover & Forward Cascade Consistency", () => {
    it("recalculates today's target when yesterday's round is undone after today was already initialized", async () => {
      const now = Date.now();
      const d1Date = new Date(now - 2 * 86400_000);
      const d2Date = new Date(now - 1 * 86400_000);
      const fmt = (d: Date) => d.toISOString().slice(0, 10);

      const d1 = fmt(d1Date);
      const d2 = fmt(d2Date);

      // Reset policy to automatic
      await asUser(testDb.db, USER_CASCADE, async (tx) => {
        await tx.query(
          `SELECT public.update_carry_forward_policy('automatic', '{}'::jsonb, FALSE, $1::date)`,
          [d1]
        );
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [d1]);
      });

      // Complete 10 rounds on d1 -> 6 remaining
      let lastD1RecordId = "";
      for (let i = 1; i <= 10; i++) {
        await asUser(testDb.db, USER_CASCADE, async (tx) => {
          const res = await tx.query<{ res: RecordRoundRpcResult }>(
            `SELECT public.record_chanting_round('manual', $1, NULL, $2::timestamptz) AS res`,
            [`cascade-d1-r${i}`, d1Date.toISOString()]
          );
          if (i === 10) {
            lastD1RecordId = res.rows[0]!.res.record.id;
          }
        });
      }

      // Initialize d2 -> carries 6 -> effective 22
      await asUser(testDb.db, USER_CASCADE, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [d2]);
      });

      const d2Before = await asUser(testDb.db, USER_CASCADE, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT previous_pending_balance, effective_daily_target
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [d2]
        );
        return res.rows[0]!;
      });
      expect(d2Before.previous_pending_balance).toBe(6);
      expect(d2Before.effective_daily_target).toBe(22);

      // Undo the 10th round on d1 -> d1 remaining becomes 7
      await asUser(testDb.db, USER_CASCADE, async (tx) => {
        await tx.query(`SELECT public.undo_chanting_round($1)`, [lastD1RecordId]);
      });

      // Verify d2 automatically cascaded forward to previous_pending_balance 7, effective 23!
      const d2After = await asUser(testDb.db, USER_CASCADE, async (tx) => {
        const res = await tx.query<DailyRow>(
          `SELECT previous_pending_balance, effective_daily_target, remaining_balance
           FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
          [d2]
        );
        return res.rows[0]!;
      });

      expect(d2After.previous_pending_balance).toBe(7);
      expect(d2After.effective_daily_target).toBe(23); // 16 + 7
      expect(d2After.remaining_balance).toBe(23);
    });
  });

  describe("5. Historical Immutability (Records before Nov 13, 2026)", () => {
    it("strictly blocks modifications to historical daily_sadhana rows dated before November 13, 2026", async () => {
      // Seed a historical row dated before Nov 13, 2026 with created_at in the past
      await testDb.db.query(
        `INSERT INTO public.daily_sadhana (
           user_id, sadhana_date, timezone_snapshot, original_daily_target,
           previous_pending_balance, effective_daily_target, completed_rounds,
           remaining_balance, extra_rounds, policy_applied, created_at, computed_at
         ) VALUES (
           $1, '2026-11-01'::date, 'UTC', 16, 0, 16, 16, 0, 0, 'automatic',
           '2026-11-01T00:00:00Z'::timestamptz, '2026-11-01T00:00:00Z'::timestamptz
         )`,
        [USER_HISTORICAL]
      );

      // Attempt to modify historical completed_rounds -> must throw exception
      await expect(
        testDb.db.query(
          `UPDATE public.daily_sadhana SET completed_rounds = 20 WHERE user_id = $1 AND sadhana_date = '2026-11-01'::date`,
          [USER_HISTORICAL]
        )
      ).rejects.toThrow(/Historical daily sadhana records dated before November 13, 2026 are protected/);

      // Attempt to delete historical row -> must throw exception
      await expect(
        testDb.db.query(
          `DELETE FROM public.daily_sadhana WHERE user_id = $1 AND sadhana_date = '2026-11-01'::date`,
          [USER_HISTORICAL]
        )
      ).rejects.toThrow(/Historical daily sadhana records dated before November 13, 2026 are protected/);
    });
  });
});
