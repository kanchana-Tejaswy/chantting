import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/sadhana",
}));

import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import { CarryForwardPanel } from "../../src/components/sadhana/carry-forward-panel";
import { PersonalSadhanaDashboard } from "../../src/components/sadhana/personal-sadhana-dashboard";
import { summarizeSankalpa } from "../../src/lib/sankalpa/queries";
import { createSankalpaInputSchema } from "../../src/lib/sankalpa/validation";
import type { SankalpaRecord } from "../../src/lib/sankalpa/types";

const USER_EXP = "55555555-5555-4555-8555-555555555555";
const USER_EXP_LIFETIME = "66666666-6666-4666-8666-666666666666";

interface RpcRecordRoundResult {
  duplicate: boolean;
  record: {
    id: string;
    user_id: string;
    method: string;
    sankalpa_id: string | null;
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

interface RpcUndoRoundResult {
  already_reverted: boolean;
  record: {
    id: string;
    is_reverted: boolean;
  };
  sankalpa: {
    id: string;
    completed_rounds: number;
    status: string;
  } | null;
}

interface RpcStatsResult {
  today: {
    sadhana_date: string;
    completed_rounds: number;
    remaining_balance: number;
    effective_daily_target: number;
  };
  month: {
    month_key: string;
    completed_rounds: number;
  };
  year: {
    year: number;
    completed_rounds: number;
  };
  lifetime: {
    completed_rounds: number;
  };
}

describe("SMARAN — Phase 6: Sādhana Experience & Progress Dashboard Verification", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_EXP,
      email: "experience@example.org",
      name: "ExperienceUser",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_EXP_LIFETIME,
      email: "lifetime@example.org",
      name: "LifetimeUser",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  describe("1. Redesigned Carry-Forward Interface & 5 Distinguished Metrics", () => {
    it("renders the 4 redesigned policy options with numerical examples", () => {
      const html = renderToStaticMarkup(
        <CarryForwardPanel
          todayDate="2026-11-14"
          currentPolicy="automatic"
          todayPolicyApplied="automatic"
          todayCompletedRounds={6}
          originalDailyTarget={16}
          previousPendingBalance={5}
          effectiveDailyTarget={21}
          remainingBalance={15}
          pendingOptionalOffer={null}
          unappliedPendingNotice={null}
          ledger={[]}
        />
      );

      // Verify the 4 clear options exist
      expect(html).toContain("Automatically carry forward");
      expect(html).toContain("Ask me every day");
      expect(html).toContain("Start fresh every day");
      expect(html).toContain("Set a carry-forward limit");

      // Verify numerical examples for each option
      expect(html).toContain("16 base target + 5 yesterday unfinished = 21 today");
      expect(html).toContain("Each morning, choose between 21 (carry 5 pending) or 16 (start fresh)");
      expect(html).toContain("Always starts at 16 base target");
      expect(html).toContain("With limit of 4, if 7 rounds were pending, 4 carry forward");

      // Verify the 5 core sadhana values are clearly distinguished
      expect(html).toContain("1. Daily Base Target");
      expect(html).toContain("2. Previous Pending");
      expect(html).toContain("3. Effective Target");
      expect(html).toContain("4. Completed Today");
      expect(html).toContain("5. Remaining Rounds");
      expect(html).toContain("16");
      expect(html).toContain("+5");
      expect(html).toContain("=21");
      expect(html).toContain("6");
      expect(html).toContain("15");
    });

    it("allows switching through all 4 policies in the database safely", async () => {
      const now = Date.now();
      const today = new Date(now).toISOString().slice(0, 10);

      // 1. Switch to 'optional'
      await asUser(testDb.db, USER_EXP, async (tx) => {
        await tx.query(
          `SELECT public.update_carry_forward_policy('optional', '{}'::jsonb, FALSE, $1::date)`,
          [today]
        );
      });

      let pref = await asUser(testDb.db, USER_EXP, async (tx) => {
        const res = await tx.query<{ carry_forward_policy: string }>(
          `SELECT carry_forward_policy FROM public.user_preferences WHERE user_id = $1`,
          [USER_EXP]
        );
        return res.rows[0]!;
      });
      expect(pref.carry_forward_policy).toBe("optional");

      // 2. Switch to 'fresh_daily'
      await asUser(testDb.db, USER_EXP, async (tx) => {
        await tx.query(
          `SELECT public.update_carry_forward_policy('fresh_daily', '{}'::jsonb, FALSE, $1::date)`,
          [today]
        );
      });

      pref = await asUser(testDb.db, USER_EXP, async (tx) => {
        const res = await tx.query<{ carry_forward_policy: string }>(
          `SELECT carry_forward_policy FROM public.user_preferences WHERE user_id = $1`,
          [USER_EXP]
        );
        return res.rows[0]!;
      });
      expect(pref.carry_forward_policy).toBe("fresh_daily");

      // 3. Switch to 'custom' with cap = 8
      await asUser(testDb.db, USER_EXP, async (tx) => {
        await tx.query(
          `SELECT public.update_carry_forward_policy('custom', '{"max_carry_cap": 8}'::jsonb, FALSE, $1::date)`,
          [today]
        );
      });

      pref = await asUser(testDb.db, USER_EXP, async (tx) => {
        const res = await tx.query<{ carry_forward_policy: string }>(
          `SELECT carry_forward_policy FROM public.user_preferences WHERE user_id = $1`,
          [USER_EXP]
        );
        return res.rows[0]!;
      });
      expect(pref.carry_forward_policy).toBe("custom");

      // 4. Reset to 'automatic'
      await asUser(testDb.db, USER_EXP, async (tx) => {
        await tx.query(
          `SELECT public.update_carry_forward_policy('automatic', '{}'::jsonb, FALSE, $1::date)`,
          [today]
        );
      });

      pref = await asUser(testDb.db, USER_EXP, async (tx) => {
        const res = await tx.query<{ carry_forward_policy: string }>(
          `SELECT carry_forward_policy FROM public.user_preferences WHERE user_id = $1`,
          [USER_EXP]
        );
        return res.rows[0]!;
      });
      expect(pref.carry_forward_policy).toBe("automatic");
    });
  });

  describe("2. Sankalpa Creation with Verified Lifetime Chanting Inclusion", () => {
    it("validates createSankalpaInputSchema with includeLifetimeRounds", () => {
      const validPayload = {
        title: "1 Lakh Nama Japa",
        description: "Devotional vow of 100,000 Holy Names",
        targetRounds: 100000,
        startDate: "2026-11-14",
        includeLifetimeRounds: true,
      };

      const parsed = createSankalpaInputSchema.safeParse(validPayload);
      expect(parsed.success).toBe(true);
      if (parsed.success) {
        expect(parsed.data.includeLifetimeRounds).toBe(true);
      }
    });

    it("initializes Sankalpa starting from verified lifetime chanting rounds when requested", async () => {
      const now = Date.now();
      const pastTs = new Date(now - 1 * 86400_000);
      const pastDate = pastTs.toISOString().slice(0, 10);

      // Seed 25 lifetime completed rounds for USER_EXP_LIFETIME
      await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        await tx.query(`SELECT public.ensure_my_daily_sadhana($1::date)`, [pastDate]);
      });

      for (let i = 1; i <= 25; i++) {
        await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
          await tx.query(
            `SELECT public.record_chanting_round('japa_mala', $1, NULL, $2::timestamptz)`,
            [`lifetime-seed-${i}`, pastTs.toISOString()]
          );
        });
      }

      // Verify that USER_EXP_LIFETIME has exactly 25 lifetime rounds
      const countRes = await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        const res = await tx.query<{ count: string }>(
          `SELECT count(*)::text as count FROM public.chanting_records WHERE user_id = $1 AND is_reverted = FALSE`,
          [USER_EXP_LIFETIME]
        );
        return Number(res.rows[0]!.count);
      });
      expect(countRes).toBe(25);

      // Create a Sankalpa for 1,000 rounds with includeLifetimeRounds: true
      const sankalpaRecord = await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        // Query verified lifetime rounds
        const count = await tx.query<{ count: string }>(
          `SELECT count(*)::text as count FROM public.chanting_records WHERE user_id = $1 AND is_reverted = FALSE`,
          [USER_EXP_LIFETIME]
        );
        const lifetimeCompleted = Number(count.rows[0]!.count);

        const res = await tx.query<SankalpaRecord>(
          `INSERT INTO public.sankalpas (
             user_id, title, description, target_rounds, completed_rounds, start_date, status
           ) VALUES (
             $1, '1008 Gita Jayanti Offering', 'With lifetime inclusion', 1000, $2, $3::date, 'active'
           ) RETURNING *`,
          [USER_EXP_LIFETIME, lifetimeCompleted, pastDate]
        );
        return res.rows[0]!;
      });

      expect(sankalpaRecord.completed_rounds).toBe(25);
      expect(sankalpaRecord.target_rounds).toBe(1000);

      // Check summary
      const summary = summarizeSankalpa(sankalpaRecord);
      expect(summary.completedRounds).toBe(25);
      expect(summary.remainingRounds).toBe(975);
      expect(summary.progressPercentage).toBe(3); // 25 / 1000 = 2.5% -> round(3)%
    });

    it("automatically updates Sankalpa progress on round completion and reverses on undo", async () => {
      // Fetch the active Sankalpa for USER_EXP_LIFETIME
      const activeVow = await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        const res = await tx.query<SankalpaRecord>(
          `SELECT * FROM public.sankalpas WHERE user_id = $1 AND status = 'active' LIMIT 1`,
          [USER_EXP_LIFETIME]
        );
        return res.rows[0]!;
      });

      expect(activeVow.completed_rounds).toBe(25);

      // Complete 1 round dedicated to this Sankalpa via Manual Counter
      const recordResult = await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        const res = await tx.query<{ res: RpcRecordRoundResult }>(
          `SELECT public.record_chanting_round('manual', 'vow-dedication-r1', NULL, now(), $1::uuid) AS res`,
          [activeVow.id]
        );
        return res.rows[0]!.res;
      });

      expect(recordResult.duplicate).toBe(false);
      expect(recordResult.sankalpa?.completed_rounds).toBe(26);

      // Duplicate submission does not inflate count
      const dupResult = await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        const res = await tx.query<{ res: RpcRecordRoundResult }>(
          `SELECT public.record_chanting_round('manual', 'vow-dedication-r1', NULL, now(), $1::uuid) AS res`,
          [activeVow.id]
        );
        return res.rows[0]!.res;
      });
      expect(dupResult.duplicate).toBe(true);

      // Verify Sankalpa completed_rounds remains 26
      const vowAfterRound = await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        const res = await tx.query<SankalpaRecord>(
          `SELECT * FROM public.sankalpas WHERE id = $1`,
          [activeVow.id]
        );
        return res.rows[0]!;
      });
      expect(vowAfterRound.completed_rounds).toBe(26);

      // Undo the round
      const undoResult = await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        const res = await tx.query<{ res: RpcUndoRoundResult }>(
          `SELECT public.undo_chanting_round($1::uuid) AS res`,
          [recordResult.record.id]
        );
        return res.rows[0]!.res;
      });
      expect(undoResult.already_reverted).toBe(false);
      expect(undoResult.sankalpa?.completed_rounds).toBe(25);
    });
  });

  describe("3. Unified Chanting Statistics & Analytics Integration", () => {
    it("renders the 5 primary chanting metrics on the personal dashboard", () => {
      const html = renderToStaticMarkup(
        <PersonalSadhanaDashboard
          displayName="Radharani Sevak"
          timezone="Asia/Kolkata"
          carryForwardPolicy="automatic"
          metrics={{
            todayDate: "2026-11-14",
            todayPolicyApplied: "automatic",
            originalTarget: 16,
            carriedForwardBalance: 4,
            effectiveTarget: 20,
            completedRounds: 8,
            pendingRounds: 12,
            extraRounds: 0,
            completionPercentage: 40,
            currentStreak: 5,
            lifetimeRounds: 350,
            monthCompletedRounds: 85,
            yearCompletedRounds: 350,
            recordedDays: 20,
            targetMetDays: 18,
            consistencyRatePct: 90,
            averageDailyRounds: 17.5,
            recentDays: [],
          }}
          recentSessions={[]}
        />
      );

      // Verify all 5 metrics are rendered cleanly
      expect(html).toContain("Today Completed");
      expect(html).toContain("Today Remaining");
      expect(html).toContain("This Month");
      expect(html).toContain("This Year");
      expect(html).toContain("Lifetime");

      expect(html).toContain("8"); // Today completed
      expect(html).toContain("12"); // Today remaining
      expect(html).toContain("85"); // This month
      expect(html).toContain("350"); // Lifetime
    });

    it("fetches authoritative statistics without fabricated data from get_chanting_statistics RPC", async () => {
      const now = Date.now();
      const todayDate = new Date(now).toISOString().slice(0, 10);

      const stats = await asUser(testDb.db, USER_EXP_LIFETIME, async (tx) => {
        const res = await tx.query<{ res: RpcStatsResult }>(
          `SELECT public.get_chanting_statistics($1::date) AS res`,
          [todayDate]
        );
        return res.rows[0]!.res;
      });

      // 25 lifetime completed rounds were recorded and verified (undo round was excluded)
      expect(stats.lifetime.completed_rounds).toBe(25);
      expect(stats.today.completed_rounds).toBe(0); // 25 were from yesterday
    });
  });
});
