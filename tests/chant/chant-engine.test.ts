import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import {
  chantPreferencesInputSchema,
  createSessionInputSchema,
  recordRoundApiInputSchema,
  undoRoundApiInputSchema,
  updateSessionInputSchema,
} from "@/lib/chant/validation";

const USER_CH = "99999999-9999-4999-8999-999999999999";
const USER_OTHER = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("Phase 4 PostgreSQL chanting sessions, 108-bead Japa Mala & API validation", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_CH,
      email: "chanter@example.org",
      name: "Nityananda",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_OTHER,
      email: "other@example.org",
      name: "Other",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("supports multiple sessions per day, pause/resume, partial 107-bead preservation, 108th completion, and undo", async () => {
    // 1. Create Session 1 (manual)
    const s1 = await asUser(testDb.db, USER_CH, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `INSERT INTO public.chanting_sessions (user_id, sadhana_date, method, client_session_key)
         VALUES ($1, CURRENT_DATE, 'manual', 'sess-manual-0001')
         RETURNING id`,
        [USER_CH]
      );
      return r.rows[0]!.id;
    });

    // Record 2 manual rounds
    const r1 = await asUser(testDb.db, USER_CH, async (tx) => {
      const res = await tx.query<{
        res: { record: { id: string }; daily_sadhana: { completed_rounds: number } };
      }>(
        `SELECT public.record_chanting_round('manual', 'manual-r1-key-0001', $1, NULL) AS res`,
        [s1]
      );
      return res.rows[0]!.res;
    });
    expect(r1.daily_sadhana.completed_rounds).toBe(1);

    const r2 = await asUser(testDb.db, USER_CH, async (tx) => {
      const res = await tx.query<{
        res: { record: { id: string }; daily_sadhana: { completed_rounds: number } };
      }>(
        `SELECT public.record_chanting_round('manual', 'manual-r2-key-0002', $1, NULL) AS res`,
        [s1]
      );
      return res.rows[0]!.res;
    });
    expect(r2.daily_sadhana.completed_rounds).toBe(2);

    // Pause, resume, and complete Session 1
    await asUser(testDb.db, USER_CH, async (tx) => {
      await tx.query(
        `UPDATE public.chanting_sessions
         SET status = 'paused', paused_at = now()
         WHERE id = $1`,
        [s1]
      );
      await tx.query(
        `UPDATE public.chanting_sessions
         SET status = 'active', paused_at = NULL
         WHERE id = $1`,
        [s1]
      );
      await tx.query(
        `UPDATE public.chanting_sessions
         SET status = 'completed', ended_at = now()
         WHERE id = $1`,
        [s1]
      );
    });

    // 2. Create Session 2 (japa_mala) on the same day, set 107 partial beads
    const s2 = await asUser(testDb.db, USER_CH, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `INSERT INTO public.chanting_sessions (user_id, sadhana_date, method, client_session_key)
         VALUES ($1, CURRENT_DATE, 'japa_mala', 'sess-japa-0002')
         RETURNING id`,
        [USER_CH]
      );
      const id = r.rows[0]!.id;
      await tx.query(
        `UPDATE public.chanting_sessions
         SET current_bead_count = 107, status = 'paused', paused_at = now()
         WHERE id = $1`,
        [id]
      );
      return id;
    });

    // Partial 107 beads MUST NOT count as completed round
    const before108 = await asUser(testDb.db, USER_CH, async (tx) => {
      const daily = await tx.query<{ completed_rounds: number }>(
        `SELECT completed_rounds FROM public.daily_sadhana WHERE sadhana_date = CURRENT_DATE`
      );
      const sess = await tx.query<{ current_bead_count: number; rounds_completed: number }>(
        `SELECT current_bead_count, rounds_completed FROM public.chanting_sessions WHERE id = $1`,
        [s2]
      );
      return { daily: daily.rows[0]!, sess: sess.rows[0]! };
    });
    expect(before108.daily.completed_rounds).toBe(2);
    expect(before108.sess).toEqual({ current_bead_count: 107, rounds_completed: 0 });

    // 3. Complete 108th bead -> completed_rounds becomes 3, session bead count resets to 0
    const r3 = await asUser(testDb.db, USER_CH, async (tx) => {
      await tx.query(
        `UPDATE public.chanting_sessions SET status = 'active', paused_at = NULL WHERE id = $1`,
        [s2]
      );
      const res = await tx.query<{
        res: { record: { id: string }; daily_sadhana: { completed_rounds: number } };
      }>(
        `SELECT public.record_chanting_round('japa_mala', 'japa-r3-key-0003', $1, NULL) AS res`,
        [s2]
      );
      return res.rows[0]!.res;
    });
    expect(r3.daily_sadhana.completed_rounds).toBe(3);

    const after108 = await asUser(testDb.db, USER_CH, async (tx) => {
      const sess = await tx.query<{ current_bead_count: number; rounds_completed: number }>(
        `SELECT current_bead_count, rounds_completed FROM public.chanting_sessions WHERE id = $1`,
        [s2]
      );
      return sess.rows[0]!;
    });
    expect(after108).toEqual({ current_bead_count: 0, rounds_completed: 1 });

    // 4. Duplicate replay with same idempotency_key does not double-count
    const dup = await asUser(testDb.db, USER_CH, async (tx) => {
      const res = await tx.query<{
        res: { duplicate: boolean; daily_sadhana: { completed_rounds: number } };
      }>(
        `SELECT public.record_chanting_round('japa_mala', 'japa-r3-key-0003', $1, NULL) AS res`,
        [s2]
      );
      return res.rows[0]!.res;
    });
    expect(dup.duplicate).toBe(true);
    expect(dup.daily_sadhana.completed_rounds).toBe(3);

    // 5. Undo / decrement reverts round 3 cleanly across daily_sadhana and session
    const undo = await asUser(testDb.db, USER_CH, async (tx) => {
      const res = await tx.query<{
        res: { daily_sadhana: { completed_rounds: number } };
      }>(`SELECT public.undo_chanting_round($1, 'user_undo') AS res`, [
        r3.record.id,
      ]);
      return res.rows[0]!.res;
    });
    expect(undo.daily_sadhana.completed_rounds).toBe(2);

    // 6. Cross-user isolation: USER_OTHER cannot update USER_CH session or undo USER_CH record
    await asUser(testDb.db, USER_OTHER, async (tx) => {
      const upd = await tx.query(
        `UPDATE public.chanting_sessions SET status = 'abandoned' WHERE id = $1 RETURNING id`,
        [s2]
      );
      expect(upd.rows).toEqual([]);
    });

    await expect(
      asUser(testDb.db, USER_OTHER, async (tx) => {
        await tx.query(
          `SELECT public.undo_chanting_round($1, 'malicious')`,
          [r1.record.id]
        );
      })
    ).rejects.toThrow(/not found/);
  });

  it("handles concurrent round submissions cleanly without lost counts", async () => {
    const keys = [
      "conc-round-key-101",
      "conc-round-key-102",
      "conc-round-key-103",
    ];
    await Promise.all(
      keys.map((k) =>
        asUser(testDb.db, USER_OTHER, async (tx) => {
          await tx.query(
            `SELECT public.record_chanting_round('manual', $1, NULL, NULL)`,
            [k]
          );
        })
      )
    );

    const total = await asUser(testDb.db, USER_OTHER, async (tx) => {
      const r = await tx.query<{ completed_rounds: number }>(
        `SELECT completed_rounds FROM public.daily_sadhana WHERE sadhana_date = CURRENT_DATE`
      );
      return r.rows[0]!.completed_rounds;
    });
    expect(total).toBe(3);
  });

  it("validates Phase 4 API route input schemas and enforces auth on route handlers", async () => {
    expect(
      createSessionInputSchema.safeParse({
        method: "japa_mala",
        clientSessionKey: "sess-12345678",
      }).success
    ).toBe(true);

    expect(
      updateSessionInputSchema.safeParse({
        sessionId: "11111111-1111-4111-8111-111111111111",
        currentBeadCount: 108, // max is 107 (108 triggers round completion)
      }).success
    ).toBe(false);

    expect(
      recordRoundApiInputSchema.safeParse({
        method: "manual",
        idempotencyKey: "round-key-12345678",
      }).success
    ).toBe(true);

    expect(
      undoRoundApiInputSchema.safeParse({
        recordId: "11111111-1111-4111-8111-111111111111",
      }).success
    ).toBe(true);

    expect(chantPreferencesInputSchema.safeParse({}).success).toBe(false);

    // Verify unauthenticated POST /api/chant/rounds returns 401
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));
    vi.doMock("next/cache", () => ({
      revalidatePath: vi.fn(),
    }));

    const { POST: postRound } = await import("@/app/api/chant/rounds/route");
    const res = await postRound(
      new Request("http://localhost:3000/api/chant/rounds", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          method: "manual",
          idempotencyKey: "round-key-12345678",
        }),
      })
    );
    expect(res.status).toBe(401);
  });
});

