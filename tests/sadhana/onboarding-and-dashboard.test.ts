import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import type { DailySadhana } from "@/lib/domain/sadhana";
import {
  computeCurrentStreak,
  computePersonalDashboardMetrics,
  getLocalDateString,
} from "@/lib/sadhana/stats";
import { hasCompletedOnboarding } from "@/lib/sadhana/queries";

const USER_A = "77777777-7777-4777-8777-777777777777";
const USER_B = "88888888-8888-4888-8888-888888888888";

function makeDaily(
  overrides: Partial<DailySadhana> & { sadhana_date: string }
): DailySadhana {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    user_id: USER_A,
    timezone_snapshot: "UTC",
    original_daily_target: 16,
    previous_pending_balance: 0,
    effective_daily_target: 16,
    completed_rounds: 0,
    remaining_balance: 16,
    extra_rounds: 0,
    policy_applied: "automatic",
    carry_forward_accepted: true,
    has_activity: false,
    ...overrides,
  };
}

describe("Phase 3 onboarding state, calculations & PostgreSQL isolation", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_A,
      email: "onboarding-a@example.org",
      name: "Keshava",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_B,
      email: "onboarding-b@example.org",
      name: "Madhavi",
      timezone: "America/New_York",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("computes empty dashboard state, streaks, and carried-forward metrics accurately", () => {
    const emptyToday = makeDaily({ sadhana_date: "2026-11-11" });
    const emptyMetrics = computePersonalDashboardMetrics({
      today: emptyToday,
      history: [],
      todayDate: "2026-11-11",
    });
    expect(emptyMetrics.lifetimeRounds).toBe(0);
    expect(emptyMetrics.currentStreak).toBe(0);
    expect(emptyMetrics.completionPercentage).toBe(0);
    expect(emptyMetrics.originalTarget).toBe(16);
    expect(emptyMetrics.effectiveTarget).toBe(16);

    // Streak preserved when today is in progress and prior 2 days met targets
    const history: DailySadhana[] = [
      makeDaily({
        sadhana_date: "2026-11-09",
        completed_rounds: 16,
        remaining_balance: 0,
        has_activity: true,
      }),
      makeDaily({
        sadhana_date: "2026-11-10",
        completed_rounds: 10,
        remaining_balance: 6,
        has_activity: true,
      }),
    ];
    // 2026-11-10 had 6 remaining -> 2026-11-11 effective is 22
    const activeToday = makeDaily({
      sadhana_date: "2026-11-11",
      original_daily_target: 16,
      previous_pending_balance: 6,
      effective_daily_target: 22,
      completed_rounds: 11,
      remaining_balance: 11,
      has_activity: true,
    });

    const metrics = computePersonalDashboardMetrics({
      today: activeToday,
      history,
      todayDate: "2026-11-11",
    });

    // Yesterday missed (10 < 16) and today is in progress (11 < 22) -> streak 0
    expect(metrics.currentStreak).toBe(0);
    expect(metrics.lifetimeRounds).toBe(37);
    expect(metrics.completionPercentage).toBe(50);
    expect(metrics.carriedForwardBalance).toBe(6);
    expect(metrics.effectiveTarget).toBe(22);

    // When yesterday met target and today is in progress -> streak = 1
    expect(
      computeCurrentStreak(
        [
          makeDaily({
            sadhana_date: "2026-11-10",
            completed_rounds: 16,
            effective_daily_target: 16,
          }),
          makeDaily({
            sadhana_date: "2026-11-11",
            completed_rounds: 4,
            effective_daily_target: 16,
          }),
        ],
        "2026-11-11"
      )
    ).toBe(1);
  });

  it("formats timezone local dates cleanly", () => {
    const fixedInstant = new Date("2026-11-11T20:00:00.000Z");
    // 20:00 UTC on Nov 11 is 01:30 IST on Nov 12 in Asia/Kolkata
    expect(getLocalDateString("UTC", fixedInstant)).toBe("2026-11-11");
    expect(getLocalDateString("Asia/Kolkata", fixedInstant)).toBe("2026-11-12");
  });

  it("tracks onboarding completion without duplicate profile rows and isolates users via RLS", async () => {
    // Initially created_at == updated_at on user_preferences
    const before = await asUser(testDb.db, USER_A, async (tx) => {
      const pref = await tx.query<{ created_at: string; updated_at: string }>(
        `SELECT created_at::text, updated_at::text FROM public.user_preferences`
      );
      const count = await tx.query<{ c: string }>(
        `SELECT count(*)::text AS c FROM public.daily_sadhana`
      );
      return { pref: pref.rows, count: Number(count.rows[0]!.c) };
    });

    expect(before.pref).toHaveLength(1);
    expect(hasCompletedOnboarding(before.pref[0]!, before.count)).toBe(false);

    // User A updates onboarding settings (in a new transaction so updated_at advances) and calls RPC
    await asUser(testDb.db, USER_A, async (tx) => {
      await tx.query(
        `UPDATE public.profiles
         SET display_name = 'Keshava Das', timezone = 'Asia/Kolkata'
         WHERE id = $1`,
        [USER_A]
      );
      await tx.query(
        `UPDATE public.user_preferences
         SET daily_round_target = 8, carry_forward_policy = 'automatic'
         WHERE user_id = $1`,
        [USER_A]
      );
      await tx.query(`SELECT public.ensure_my_daily_sadhana(CURRENT_DATE)`);
    });

    const after = await asUser(testDb.db, USER_A, async (tx) => {
      const profiles = await tx.query<{ id: string }>(
        `SELECT id FROM public.profiles`
      );
      const prefs = await tx.query<{
        daily_round_target: number;
        created_at: string;
        updated_at: string;
      }>(
        `SELECT daily_round_target, created_at::text, updated_at::text FROM public.user_preferences`
      );
      const sadhana = await tx.query<{ original_daily_target: number }>(
        `SELECT original_daily_target FROM public.daily_sadhana`
      );
      return {
        profiles: profiles.rows,
        prefs: prefs.rows,
        sadhana: sadhana.rows,
      };
    });

    // No duplicate rows created
    expect(after.profiles).toHaveLength(1);
    expect(after.prefs).toHaveLength(1);
    expect(after.prefs[0]!.daily_round_target).toBe(8);
    expect(after.sadhana[0]!.original_daily_target).toBe(8);
    expect(hasCompletedOnboarding(after.prefs[0]!, after.sadhana.length)).toBe(
      true
    );

    // User B cannot see User A's profile or daily_sadhana
    const bView = await asUser(testDb.db, USER_B, async (tx) => {
      const sadhana = await tx.query(`SELECT id FROM public.daily_sadhana`);
      const profiles = await tx.query<{ id: string }>(
        `SELECT id FROM public.profiles`
      );
      return { sadhana: sadhana.rows, profiles: profiles.rows };
    });
    expect(bView.sadhana).toEqual([]);
    expect(bView.profiles).toEqual([{ id: USER_B }]);
  });

  it("validates completeOnboardingAction server action persistence path", async () => {
    const profileEq = vi.fn().mockResolvedValue({ error: null });
    const prefEq = vi.fn().mockResolvedValue({ error: null });
    const rpcMock = vi.fn().mockResolvedValue({ error: null });

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: USER_A } }, error: null }),
        },
        from: (table: string) => ({
          update: () => ({
            eq: table === "profiles" ? profileEq : prefEq,
          }),
        }),
        rpc: rpcMock,
      })),
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const { completeOnboardingAction } = await import(
      "@/app/onboarding/actions"
    );

    const form = new FormData();
    form.set("displayName", "Keshava");
    form.set("timezone", "Asia/Kolkata");
    form.set("dailyRoundTarget", "16");
    form.set("carryForwardPolicy", "automatic");

    const res = await completeOnboardingAction({}, form);
    expect(res.completed).toBe(true);
    expect(res.summary?.dailyRoundTarget).toBe(16);
    expect(rpcMock).toHaveBeenCalledWith("ensure_my_daily_sadhana", {
      p_target_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
    });
  });
});

