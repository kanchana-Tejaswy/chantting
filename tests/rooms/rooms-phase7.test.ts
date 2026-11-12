import crypto from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import { computeRoomProgressSummary } from "@/lib/rooms/analytics";
import {
  createGoalSchema,
  createRoomSchema,
  slugifyRoomName,
} from "@/lib/rooms/validation";

const OWNER_A = "d1111111-1111-4111-8111-111111111111";
const MEMBER_B = "d2222222-2222-4222-8222-222222222222";
const OUTSIDER_C = "d3333333-3333-4333-8333-333333333333";

describe("Phase 7 Chanting Rooms, Invitations, Permissions & Privacy Isolation", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: OWNER_A,
      email: "owner-a@example.org",
      name: "Radha",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: MEMBER_B,
      email: "member-b@example.org",
      name: "Damodara",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: OUTSIDER_C,
      email: "outsider-c@example.org",
      name: "Vraja",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("enforces room visibility, hashed invite lifecycle, goals, announcements, and privacy-safe activity", async () => {
    // 1. OWNER_A creates a private room
    const roomId = await asUser(testDb.db, OWNER_A, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `INSERT INTO public.rooms (slug, name, visibility, owner_id, default_daily_goal)
         VALUES ('gokul-sangha', 'Gokul Morning Sangha', 'private', $1, 16)
         RETURNING id`,
        [OWNER_A]
      );
      return r.rows[0]!.id;
    });

    // Outsider C cannot see private room
    const outsiderView = await asUser(testDb.db, OUTSIDER_C, async (tx) => {
      const r = await tx.query(`SELECT id FROM public.rooms WHERE id = $1`, [
        roomId,
      ]);
      return r.rows;
    });
    expect(outsiderView).toEqual([]);

    // 2. Owner creates two invites: one valid, one revoked
    const validToken = "gokul-valid-invite-token-2026-secure";
    const revokedToken = "gokul-revoked-invite-token-2026-secure";
    const hash = (t: string) =>
      crypto.createHash("sha256").update(t, "utf8").digest("hex");

    await asUser(testDb.db, OWNER_A, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_invitations (room_id, created_by, token_hash, max_uses)
         VALUES ($1, $2, $3, 2)`,
        [roomId, OWNER_A, hash(validToken)]
      );
      const rev = await tx.query<{ id: string }>(
        `INSERT INTO public.room_invitations (room_id, created_by, token_hash, max_uses)
         VALUES ($1, $2, $3, 2)
         RETURNING id`,
        [roomId, OWNER_A, hash(revokedToken)]
      );
      await tx.query(
        `UPDATE public.room_invitations SET revoked_at = now() WHERE id = $1`,
        [rev.rows[0]!.id]
      );
    });

    // Revoked token is rejected
    await expect(
      asUser(testDb.db, MEMBER_B, async (tx) => {
        await tx.query(
          `SELECT public.redeem_room_invitation($1, 'completion_only')`,
          [revokedToken]
        );
      })
    ).rejects.toThrow(/revoked/);

    // Member B redeems valid invite with default conservative 'completion_only'
    await asUser(testDb.db, MEMBER_B, async (tx) => {
      await tx.query(
        `SELECT public.redeem_room_invitation($1, 'completion_only')`,
        [validToken]
      );
    });

    // Under 'completion_only', RLS rejects inserting numeric shared_rounds_count!
    await expect(
      asUser(testDb.db, MEMBER_B, async (tx) => {
        await tx.query(
          `INSERT INTO public.room_activity_feed
           (room_id, user_id, activity_date, activity_type, shared_rounds_count)
           VALUES ($1, $2, CURRENT_DATE, 'rounds_shared', 16)`,
          [roomId, MEMBER_B]
        );
      })
    ).rejects.toThrow();

    // Sharing 'daily_target_met' with NULL shared_rounds_count succeeds!
    await asUser(testDb.db, MEMBER_B, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_activity_feed
         (room_id, user_id, activity_date, activity_type, shared_rounds_count)
         VALUES ($1, $2, CURRENT_DATE, 'daily_target_met', NULL)`,
        [roomId, MEMBER_B]
      );
    });

    // Member B records private rounds -> Owner A STILL sees zero rows in daily_sadhana/chanting_records for B
    await asUser(testDb.db, MEMBER_B, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'room-p7-b-round-1', NULL, NULL)`
      );
    });
    const ownerCheckingB = await asUser(testDb.db, OWNER_A, async (tx) => {
      const r = await tx.query(`SELECT user_id FROM public.daily_sadhana`);
      return r.rows;
    });
    expect(ownerCheckingB).toEqual([]);

    // Member B cannot create goals or announcements while regular 'member'
    await expect(
      asUser(testDb.db, MEMBER_B, async (tx) => {
        await tx.query(
          `INSERT INTO public.room_goals
           (room_id, created_by, title, target_rounds, period_type, start_date)
           VALUES ($1, $2, 'Unauthorized goal', 16, 'daily', CURRENT_DATE)`,
          [roomId, MEMBER_B]
        );
      })
    ).rejects.toThrow();

    // Owner creates goal & announcement, promotes Member B -> Admin, logs audit trail
    await asUser(testDb.db, OWNER_A, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_goals
         (room_id, created_by, title, target_rounds, period_type, start_date)
         VALUES ($1, $2, 'Kartika 16', 16, 'daily', CURRENT_DATE)`,
        [roomId, OWNER_A]
      );
      await tx.query(
        `INSERT INTO public.room_announcements
         (room_id, author_id, title, body, is_pinned)
         VALUES ($1, $2, 'Welcome', 'Chant attentively', TRUE)`,
        [roomId, OWNER_A]
      );
      await tx.query(
        `SELECT public.update_room_member_role($1, $2, 'admin')`,
        [roomId, MEMBER_B]
      );
    });

    // Non-owner Member B can leave cleanly if not owner, and Owner cannot be demoted
    await expect(
      asUser(testDb.db, MEMBER_B, async (tx) => {
        await tx.query(
          `SELECT public.update_room_member_role($1, $2, 'member')`,
          [roomId, OWNER_A]
        );
      })
    ).rejects.toThrow(/owner/);
  });

  it("computes privacy-filtered room progress & 84-day heatmap honoring share_progress_mode", () => {
    const summary = computeRoomProgressSummary({
      todayDate: "2026-11-11",
      members: [
        {
          id: "m1",
          room_id: "r1",
          user_id: "u1",
          role: "owner",
          share_progress_mode: "full",
          share_streak: true,
          joined_at: "2026-11-01T00:00:00Z",
          display_name: "Radha",
          avatar_url: null,
        },
        {
          id: "m2",
          room_id: "r1",
          user_id: "u2",
          role: "member",
          share_progress_mode: "completion_only",
          share_streak: false,
          joined_at: "2026-11-02T00:00:00Z",
          display_name: "Damodara",
          avatar_url: null,
        },
        {
          id: "m3",
          room_id: "r1",
          user_id: "u3",
          role: "member",
          share_progress_mode: "private",
          share_streak: false,
          joined_at: "2026-11-03T00:00:00Z",
          display_name: "Vraja",
          avatar_url: null,
        },
      ],
      activities: [
        {
          id: "a1",
          room_id: "r1",
          user_id: "u1",
          activity_date: "2026-11-11",
          activity_type: "daily_target_met",
          shared_rounds_count: 16,
          metadata: {},
          created_at: "2026-11-11T06:00:00Z",
        },
        {
          id: "a2",
          room_id: "r1",
          user_id: "u2",
          activity_date: "2026-11-11",
          activity_type: "daily_target_met",
          shared_rounds_count: 18, // Even if historically present, completion_only masks it!
          metadata: {},
          created_at: "2026-11-11T07:00:00Z",
        },
        {
          id: "a3",
          room_id: "r1",
          user_id: "u3",
          activity_date: "2026-11-11",
          activity_type: "rounds_shared",
          shared_rounds_count: 24, // Private mode hides completely!
          metadata: {},
          created_at: "2026-11-11T08:00:00Z",
        },
      ],
    });

    expect(summary.memberCount).toBe(3);
    expect(summary.sharingMembersCount).toBe(2);
    expect(summary.todayActiveMembers).toBe(2); // u3 excluded!
    expect(summary.todayTargetMetMembers).toBe(2);
    expect(summary.todaySharedRounds).toBe(16); // u2's 18 masked & u3's 24 hidden!
    expect(summary.heatmapDays).toHaveLength(84);
    expect(summary.memberTodayStatus["u2"]?.sharedRoundsToday).toBeNull();
    expect(summary.memberTodayStatus["u3"]).toBeUndefined();
  });

  it("validates room schemas and rejects unauthenticated API calls", async () => {
    expect(slugifyRoomName("Vrindavan Morning Sangha!")).toBe(
      "vrindavan-morning-sangha"
    );
    expect(
      createRoomSchema.safeParse({
        name: "Gita Study & Japa",
        slug: "gita-study-japa",
        visibility: "public",
      }).success
    ).toBe(true);
    expect(
      createGoalSchema.safeParse({
        roomId: "11111111-1111-4111-8111-111111111111",
        title: "Daily 16",
        targetRounds: 16,
        periodType: "daily",
        startDate: "2026-11-11",
        endDate: "2026-11-01",
      }).success
    ).toBe(false);

    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));

    const { POST } = await import("@/app/api/rooms/route");
    const res = await POST(
      new Request("http://localhost:3000/api/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "Test",
          slug: "test-room",
          visibility: "public",
        }),
      })
    );
    expect(res.status).toBe(401);
  });
});

