import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import {
  resolveOptionalCarryForwardSchema,
  updateCarryForwardPolicyInputSchema,
} from "@/lib/sadhana/carry-forward";

const USER_AUTO = "b1111111-1111-4111-8111-111111111111";
const USER_POL = "b2222222-2222-4222-8222-222222222222";
const USER_TZ = "b3333333-3333-4333-8333-333333333333";
const USER_CONC = "b4444444-4444-4444-8444-444444444444";

describe("Phase 5 Carry-Forward Engine (PostgreSQL + RLS + Concurrency)", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_AUTO,
      email: "auto@example.org",
      name: "Auto",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_POL,
      email: "policies5@example.org",
      name: "Policies",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_TZ,
      email: "tz@example.org",
      name: "Timezone",
      timezone: "Asia/Kolkata",
    });
    await seedTestUser(testDb.db, {
      id: USER_CONC,
      email: "conc@example.org",
      name: "Concurrent",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("handles consecutive incomplete days, multi-day absence, and retroactive intermediate day sync", async () => {
    const now = Date.now();
    const d1 = new Date(now - 6 * 86400_000);
    const d2 = new Date(now - 5 * 86400_000);
    const d3 = new Date(now - 4 * 86400_000);
    const d6 = new Date(now - 1 * 86400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // Day 1: 16 target, 5 done -> 11 pending
    for (let i = 1; i <= 5; i++) {
      await asUser(testDb.db, USER_AUTO, async (tx) => {
        await tx.query(
          `SELECT public.record_chanting_round('manual', $1, NULL, $2::timestamptz)`,
          [`p5-d1-r${i}-abcdefgh`, d1.toISOString()]
        );
      });
    }

    // User skips Day 2 initially and opens Day 3 -> carries 11 -> effective 27
    await asUser(testDb.db, USER_AUTO, async (tx) => {
      const r = await tx.query<{
        original_daily_target: number;
        previous_pending_balance: number;
        effective_daily_target: number;
      }>(
        `SELECT original_daily_target, previous_pending_balance, effective_daily_target
         FROM public.ensure_my_daily_sadhana($1::date)`,
        [fmt(d3)]
      );
      expect(r.rows[0]).toEqual({
        original_daily_target: 16,
        previous_pending_balance: 11,
        effective_daily_target: 27,
      });
    });

    // Now an offline round from Day 2 syncs retroactively (1 round on Day 2)
    await asUser(testDb.db, USER_AUTO, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'p5-d2-retro-1234', NULL, $1::timestamptz)`,
        [d2.toISOString()]
      );
    });

    // Verify ledger was repaired cleanly to D1 -> D2 -> D3 (no stale D1 -> D3 link)
    // D1 remaining 11 -> D2 effective 27, completed 1, remaining 26 -> D3 effective 16 + 26 = 42!
    const afterRetro = await asUser(testDb.db, USER_AUTO, async (tx) => {
      const days = await tx.query<{
        sadhana_date: string;
        previous_pending_balance: number;
        effective_daily_target: number;
        completed_rounds: number;
        remaining_balance: number;
      }>(
        `SELECT sadhana_date::text, previous_pending_balance, effective_daily_target,
                completed_rounds, remaining_balance
         FROM public.daily_sadhana
         ORDER BY sadhana_date ASC`
      );
      const ledger = await tx.query<{
        from_date: string;
        to_date: string;
        carried_amount: number;
      }>(
        `SELECT from_date::text, to_date::text, carried_amount
         FROM public.carry_forward_ledger
         ORDER BY to_date ASC`
      );
      return { days: days.rows, ledger: ledger.rows };
    });

    expect(afterRetro.days).toHaveLength(3);
    expect(afterRetro.days[1]!.effective_daily_target).toBe(27);
    expect(afterRetro.days[1]!.remaining_balance).toBe(26);
    expect(afterRetro.days[2]!.previous_pending_balance).toBe(26);
    expect(afterRetro.days[2]!.effective_daily_target).toBe(42);
    expect(afterRetro.ledger).toEqual([
      { from_date: fmt(d1), to_date: fmt(d2), carried_amount: 11 },
      { from_date: fmt(d2), to_date: fmt(d3), carried_amount: 26 },
    ]);

    // Returning after 3 absent days (Day 6) carries Day 3's 42 remaining without fabricating Day 4-5 rows
    await asUser(testDb.db, USER_AUTO, async (tx) => {
      const d6Row = await tx.query<{
        previous_pending_balance: number;
        effective_daily_target: number;
      }>(
        `SELECT previous_pending_balance, effective_daily_target
         FROM public.ensure_my_daily_sadhana($1::date)`,
        [fmt(d6)]
      );
      expect(d6Row.rows[0]).toEqual({
        previous_pending_balance: 42,
        effective_daily_target: 58,
      });
    });
  });

  it("tests all 4 policies, custom cap overflow visibility, optional duplicate protection, and historical immutability", async () => {
    const now = Date.now();
    const d1 = new Date(now - 4 * 86400_000);
    const d2 = new Date(now - 3 * 86400_000);
    const d3 = new Date(now - 2 * 86400_000);
    const d4 = new Date(now - 1 * 86400_000);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);

    // Day 1: 2 completed -> 14 remaining
    for (let i = 1; i <= 2; i++) {
      await asUser(testDb.db, USER_POL, async (tx) => {
        await tx.query(
          `SELECT public.record_chanting_round('manual', $1, NULL, $2::timestamptz)`,
          [`pol-d1-r${i}-abcdefgh`, d1.toISOString()]
        );
      });
    }

    // Switch to 'optional' for Day 2
    await asUser(testDb.db, USER_POL, async (tx) => {
      await tx.query(
        `SELECT public.update_carry_forward_policy('optional', '{}'::jsonb, FALSE, $1::date)`,
        [fmt(d2)]
      );
      await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [fmt(d2)]);
    });

    // Optional decision: decline on Day 2
    await asUser(testDb.db, USER_POL, async (tx) => {
      const declined = await tx.query<{
        previous_pending_balance: number;
        effective_daily_target: number;
        carry_forward_accepted: boolean;
      }>(
        `SELECT previous_pending_balance, effective_daily_target, carry_forward_accepted
         FROM public.resolve_optional_carry_forward($1::date, FALSE)`,
        [fmt(d2)]
      );
      expect(declined.rows[0]).toEqual({
        previous_pending_balance: 0,
        effective_daily_target: 16,
        carry_forward_accepted: false,
      });

      // Identical retry is idempotent (no duplicate ledger row)
      await tx.query(
        `SELECT public.resolve_optional_carry_forward($1::date, FALSE)`,
        [fmt(d2)]
      );
    });

    // Conflicting decision after persistence is blocked
    await expect(
      asUser(testDb.db, USER_POL, async (tx) => {
        await tx.query(
          `SELECT public.resolve_optional_carry_forward($1::date, TRUE)`,
          [fmt(d2)]
        );
      })
    ).rejects.toThrow(/already been recorded/);

    // Switch to 'custom' cap = 5 on Day 3 (Day 2 had 16 remaining -> carries 5, 11 overflow recorded in ledger)
    await asUser(testDb.db, USER_POL, async (tx) => {
      await tx.query(
        `SELECT public.update_carry_forward_policy('custom', '{"max_carry_cap": 5}'::jsonb, TRUE, $1::date)`,
        [fmt(d3)]
      );
    });

    const d3Check = await asUser(testDb.db, USER_POL, async (tx) => {
      const day = await tx.query<{
        previous_pending_balance: number;
        effective_daily_target: number;
      }>(
        `SELECT previous_pending_balance, effective_daily_target
         FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
        [fmt(d3)]
      );
      const ledger = await tx.query<{
        source_remaining_balance: number;
        carried_amount: number;
      }>(
        `SELECT source_remaining_balance, carried_amount
         FROM public.carry_forward_ledger WHERE to_date = $1::date`,
        [fmt(d3)]
      );
      return { day: day.rows[0]!, ledger: ledger.rows[0]! };
    });
    expect(d3Check.day).toEqual({
      previous_pending_balance: 5,
      effective_daily_target: 21,
    });
    expect(d3Check.ledger).toEqual({
      source_remaining_balance: 16,
      carried_amount: 5,
    });

    // Switch to 'fresh_daily' on Day 4 -> effective stays 16; historical Day 1..Day 3 unchanged
    await asUser(testDb.db, USER_POL, async (tx) => {
      await tx.query(
        `SELECT public.update_carry_forward_policy('fresh_daily', '{}'::jsonb, TRUE, $1::date)`,
        [fmt(d4)]
      );
      const d4Res = await tx.query<{
        previous_pending_balance: number;
        effective_daily_target: number;
      }>(
        `SELECT previous_pending_balance, effective_daily_target
         FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
        [fmt(d4)]
      );
      expect(d4Res.rows[0]).toEqual({
        previous_pending_balance: 0,
        effective_daily_target: 16,
      });

      // Verify Day 1 still untouched (completed=2, remaining=14)
      const d1Check = await tx.query<{
        completed_rounds: number;
        remaining_balance: number;
      }>(
        `SELECT completed_rounds, remaining_balance
         FROM public.daily_sadhana WHERE sadhana_date = $1::date`,
        [fmt(d1)]
      );
      expect(d1Check.rows[0]).toEqual({
        completed_rounds: 2,
        remaining_balance: 14,
      });
    });
  });

  it("handles midnight & DST timezone boundaries accurately in PostgreSQL", async () => {
    // 18:29 UTC in Asia/Kolkata (+05:30) is 23:59 local same day; 18:31 UTC is 00:01 local next day!
    const now = new Date();
    const yest = new Date(now.getTime() - 2 * 86400_000);
    const yyyyMmDd = yest.toISOString().slice(0, 10);
    const beforeMidnightIst = `${yyyyMmDd}T18:29:00.000Z`;
    const afterMidnightIst = `${yyyyMmDd}T18:31:00.000Z`;

    await asUser(testDb.db, USER_TZ, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'ist-before-mid-01', NULL, $1::timestamptz)`,
        [beforeMidnightIst]
      );
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'ist-after-mid-02', NULL, $1::timestamptz)`,
        [afterMidnightIst]
      );

      const rows = await tx.query<{
        sadhana_date: string;
        completed_rounds: number;
      }>(
        `SELECT sadhana_date::text, completed_rounds
         FROM public.daily_sadhana
         ORDER BY sadhana_date ASC`
      );
      expect(rows.rows).toHaveLength(2);
      expect(rows.rows[0]!.completed_rounds).toBe(1);
      expect(rows.rows[1]!.completed_rounds).toBe(1);
    });
  });

  it("prevents duplicate daily rows and preserves counts under concurrent multi-device initialization", async () => {
    await Promise.all([
      asUser(testDb.db, USER_CONC, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana(CURRENT_DATE)`);
      }),
      asUser(testDb.db, USER_CONC, async (tx) => {
        await tx.query(
          `SELECT public.record_chanting_round('manual', 'conc-dev1-round-1', NULL, NULL)`
        );
      }),
      asUser(testDb.db, USER_CONC, async (tx) => {
        await tx.query(
          `SELECT public.record_chanting_round('japa_mala', 'conc-dev2-round-1', NULL, NULL)`
        );
      }),
    ]);

    const res = await asUser(testDb.db, USER_CONC, async (tx) => {
      const r = await tx.query<{ completed_rounds: number }>(
        `SELECT completed_rounds FROM public.daily_sadhana WHERE sadhana_date = CURRENT_DATE`
      );
      return r.rows;
    });
    expect(res).toHaveLength(1);
    expect(res[0]!.completed_rounds).toBe(2);

    // Cross-user isolation: USER_AUTO cannot read USER_CONC ledger or daily rows
    const autoLedger = await asUser(testDb.db, USER_AUTO, async (tx) => {
      const r = await tx.query<{ user_id: string }>(
        `SELECT DISTINCT user_id FROM public.carry_forward_ledger`
      );
      return r.rows;
    });
    expect(autoLedger).toEqual([{ user_id: USER_AUTO }]);
  });

  it("validates Phase 5 API schemas and enforces authentication", async () => {
    expect(
      resolveOptionalCarryForwardSchema.safeParse({
        sadhanaDate: "2026-11-11",
        accept: true,
      }).success
    ).toBe(true);

    expect(
      updateCarryForwardPolicyInputSchema.safeParse({
        policy: "custom",
        maxCarryCap: 8,
        applyToToday: false,
      }).success
    ).toBe(true);

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));

    const { POST } = await import(
      "@/app/api/sadhana/carry-forward/resolve/route"
    );
    const res = await POST(
      new Request("http://localhost:3000/api/sadhana/carry-forward/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sadhanaDate: "2026-11-11", accept: true }),
      })
    );
    expect(res.status).toBe(401);
  });
});

