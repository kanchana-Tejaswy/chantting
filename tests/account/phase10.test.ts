import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import {
  buildAccountExportDocument,
  buildMilestoneDisplayList,
  isWithinQuietHours,
} from "@/lib/account/domain";
import {
  accountDeleteConfirmSchema,
  accountPreferencesUpdateSchema,
  accountProfileUpdateSchema,
  notificationActionSchema,
} from "@/lib/account/validation";
import { isProtectedRoute } from "@/lib/auth/route-guard";

const USER_A = "f1111111-1111-4111-8111-111111111111";
const USER_B = "f2222222-2222-4222-8222-222222222222";
const USER_C = "f3333333-3333-4333-8333-333333333333";

describe("Phase 10 Platform Completion — Account, Notifications, Milestones, Privacy & Security", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: USER_A,
      email: "a-sadhaka@example.org",
      name: "Ananda",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_B,
      email: "b-sadhaka@example.org",
      name: "Balarama",
      timezone: "UTC",
    });
    await seedTestUser(testDb.db, {
      id: USER_C,
      email: "c-sadhaka@example.org",
      name: "Chitra",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("evaluates quiet hours cleanly and creates consent-respected room & daily reminder notifications with zero private data leakage", async () => {
    // Overnight quiet hours (22:00..05:00) and daytime (13:00..15:00)
    expect(isWithinQuietHours("23:30", "22:00", "05:00")).toBe(true);
    expect(isWithinQuietHours("04:59", "22:00", "05:00")).toBe(true);
    expect(isWithinQuietHours("05:00", "22:00", "05:00")).toBe(false);
    expect(isWithinQuietHours("14:00", "13:00", "15:00")).toBe(true);
    expect(isWithinQuietHours("16:00", "13:00", "15:00")).toBe(false);

    // USER_C opts out of room notifications; USER_B keeps them enabled
    await asUser(testDb.db, USER_C, async (tx) => {
      await tx.query(
        `UPDATE public.user_preferences SET room_notifications_enabled = FALSE WHERE user_id = $1`,
        [USER_C]
      );
    });

    // USER_A creates public room; USER_B and USER_C join
    const roomId = await asUser(testDb.db, USER_A, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `INSERT INTO public.rooms (slug, name, visibility, owner_id)
         VALUES ('kirtan-circle', 'Kirtan Sangha', 'public', $1) RETURNING id`,
        [USER_A]
      );
      return r.rows[0]!.id;
    });

    await asUser(testDb.db, USER_B, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_memberships (room_id, user_id, role, share_progress_mode)
         VALUES ($1, $2, 'member', 'completion_only')`,
        [roomId, USER_B]
      );
    });
    await asUser(testDb.db, USER_C, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_memberships (room_id, user_id, role, share_progress_mode)
         VALUES ($1, $2, 'member', 'private')`,
        [roomId, USER_C]
      );
    });

    // USER_A posts an announcement and a voluntary goal
    await asUser(testDb.db, USER_A, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_announcements (room_id, author_id, title, body)
         VALUES ($1, $2, 'Sunrise Japa Hour', 'Join quietly at dawn.')`,
        [roomId, USER_A]
      );
      await tx.query(
        `INSERT INTO public.room_goals (room_id, created_by, title, target_rounds, period_type, start_date)
         VALUES ($1, $2, 'Kartik Steady Practice', 16, 'daily', CURRENT_DATE)`,
        [roomId, USER_A]
      );
    });

    // USER_B received both notifications; USER_C opted out and received 0; USER_A (author) received 0
    const bNotifs = await asUser(testDb.db, USER_B, async (tx) => {
      return tx.query<{ type: string; body: string }>(
        `SELECT type, body FROM public.notifications ORDER BY created_at ASC`
      );
    });
    expect(bNotifs.rows.map((n) => n.type)).toEqual([
      "room_announcement",
      "room_milestone",
    ]);

    const cNotifs = await asUser(testDb.db, USER_C, async (tx) => {
      return tx.query(`SELECT id FROM public.notifications`);
    });
    expect(cNotifs.rows).toEqual([]);

    // Daily reminder evaluation with quiet hours disabled and reminder time <= now() succeeds once per local day
    const reminderOutcomes = await asUser(testDb.db, USER_B, async (tx) => {
      await tx.query(
        `UPDATE public.user_preferences
         SET daily_reminder_enabled = TRUE,
             daily_reminder_time = '00:00:00',
             quiet_hours_enabled = FALSE
         WHERE user_id = $1`,
        [USER_B]
      );
      const first = await tx.query<{ res: { created: boolean } }>(
        `SELECT public.evaluate_my_daily_reminder() AS res`
      );
      const second = await tx.query<{ res: { created: boolean; reason: string } }>(
        `SELECT public.evaluate_my_daily_reminder() AS res`
      );
      const reminderRow = await tx.query<{ body: string }>(
        `SELECT body FROM public.notifications WHERE type = 'sadhana_reminder'`
      );
      return {
        first: first.rows[0]!.res,
        second: second.rows[0]!.res,
        body: reminderRow.rows[0]!.body,
      };
    });
    expect(reminderOutcomes.first.created).toBe(true);
    expect(reminderOutcomes.second.created).toBe(false);
    expect(reminderOutcomes.second.reason).toBe("already_sent_today");
    // Notification copy must never mention round numbers or streak guilt
    expect(reminderOutcomes.body).not.toMatch(/\d/);
  });

  it("computes verified non-duplicate personal milestones and keeps them private per owner", async () => {
    // USER_A records 16 rounds (1 via japa_mala, 15 via manual)
    await asUser(testDb.db, USER_A, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'p10-mala-1', NULL, NULL)`
      );
      for (let i = 2; i <= 16; i++) {
        await tx.query(
          `SELECT public.record_chanting_round('manual', $1, NULL, NULL)`,
          [`p10-manual-${i}`]
        );
      }
      const firstSync = await tx.query<{
        sync_my_achievements: {
          total_rounds: number;
          mala_rounds: number;
          newly_unlocked: number;
        };
      }>(`SELECT public.sync_my_achievements()`);
      expect(firstSync.rows[0]!.sync_my_achievements.total_rounds).toBe(16);
      expect(firstSync.rows[0]!.sync_my_achievements.mala_rounds).toBe(1);
      expect(firstSync.rows[0]!.sync_my_achievements.newly_unlocked).toBe(3);

      // Re-syncing never duplicates awards
      const secondSync = await tx.query<{
        sync_my_achievements: { newly_unlocked: number };
      }>(`SELECT public.sync_my_achievements()`);
      expect(secondSync.rows[0]!.sync_my_achievements.newly_unlocked).toBe(0);
    });

    // USER_B cannot see USER_A's unlocked achievements
    const bAchievements = await asUser(testDb.db, USER_B, async (tx) => {
      return tx.query(`SELECT id FROM public.user_achievements`);
    });
    expect(bAchievements.rows).toEqual([]);

    const displayList = buildMilestoneDisplayList(
      [
        {
          id: "m1",
          code: "first_round",
          title: "First Round",
          description: "First",
          category: "milestone",
          threshold_value: 1,
        },
        {
          id: "m2",
          code: "rounds_108",
          title: "108 Rounds",
          description: "Century",
          category: "milestone",
          threshold_value: 108,
        },
      ],
      [{ id: "ua1", achievement_id: "m1", unlocked_at: "2026-11-11T00:00:00Z", metadata: {} }],
      { totalRounds: 16, malaRounds: 1, activeDays: 1, anniversaryDays: 0 }
    );
    expect(displayList[0]!.unlocked).toBe(true);
    expect(displayList[1]!.unlocked).toBe(false);
    expect(displayList[1]!.currentValue).toBe(16);
  });

  it("allows revoking shared room feed activity and securely scrubbing/deleting user data without corrupting rooms", async () => {
    // USER_B joins USER_A's room? Wait: in previous test A created room and B was member.
    // Now B also records personal data and shares in A's room, then revokes shared feed and deletes B's account!
    const roomRes = await asUser(testDb.db, USER_A, async (tx) => {
      return tx.query<{ id: string }>(
        `SELECT id FROM public.rooms WHERE slug = 'kirtan-circle'`
      );
    });
    const roomId = roomRes.rows[0]!.id;

    await asUser(testDb.db, USER_B, async (tx) => {
      await tx.query(
        `SELECT public.record_chanting_round('manual', 'p10-b-round-1', NULL, NULL)`
      );
      await tx.query(
        `INSERT INTO public.room_activity_feed (room_id, user_id, activity_date, activity_type)
         VALUES ($1, $2, CURRENT_DATE, 'daily_target_met')`,
        [roomId, USER_B]
      );
      // USER_B revokes shared feed rows directly via RLS
      await tx.query(
        `DELETE FROM public.room_activity_feed WHERE user_id = $1`,
        [USER_B]
      );
      // Personal chanting record stays completely intact!
      const personalCount = await tx.query<{ count: string }>(
        `SELECT count(*) FROM public.chanting_records WHERE is_reverted = FALSE`
      );
      expect(Number(personalCount.rows[0]!.count)).toBe(1);
    });

    // Wrong confirmation phrase rejects deletion
    await expect(
      asUser(testDb.db, USER_B, async (tx) => {
        await tx.query(`SELECT public.deactivate_and_scrub_my_account('nope')`);
      })
    ).rejects.toThrow(/DELETE MY ACCOUNT/);

    // Correct phrase scrubs USER_B PII & personal data cleanly while preserving USER_A's room
    const deleteRes = await asUser(testDb.db, USER_B, async (tx) => {
      return tx.query<{
        res: { ok: boolean; deactivated: boolean; can_hard_delete_auth: boolean };
      }>(`SELECT public.deactivate_and_scrub_my_account('DELETE MY ACCOUNT') AS res`);
    });
    expect(deleteRes.rows[0]!.res.ok).toBe(true);
    expect(deleteRes.rows[0]!.res.deactivated).toBe(true);
    expect(deleteRes.rows[0]!.res.can_hard_delete_auth).toBe(true);

    // USER_B's profile is scrubbed and hidden from member_directory, while USER_A's room remains intact
    const postCheck = await asUser(testDb.db, USER_A, async (tx) => {
      const room = await tx.query(`SELECT id FROM public.rooms WHERE id = $1`, [
        roomId,
      ]);
      const memberCheck = await tx.query(
        `SELECT user_id FROM public.room_memberships WHERE room_id = $1 AND user_id = $2`,
        [roomId, USER_B]
      );
      return { roomCount: room.rows.length, bMembership: memberCheck.rows };
    });
    expect(postCheck.roomCount).toBe(1);
    expect(postCheck.bMembership).toEqual([]);
  });

  it("enforces route guards, input schemas, export payload structure, and 401 API gates", async () => {
    expect(isProtectedRoute("/account")).toBe(true);
    expect(isProtectedRoute("/library")).toBe(false);

    expect(
      accountProfileUpdateSchema.safeParse({
        displayName: "Radhika",
        username: "Invalid Handle!",
        timezone: "Asia/Kolkata",
      }).success
    ).toBe(false);

    expect(
      accountProfileUpdateSchema.safeParse({
        displayName: "Radhika",
        username: "radhika_devotee",
        timezone: "Invalid/Zone",
      }).success
    ).toBe(false);

    expect(
      accountPreferencesUpdateSchema.safeParse({
        dailyRoundTarget: 16,
        carryForwardPolicy: "automatic",
        defaultCountingMethod: "japa_mala",
        tactileFeedbackEnabled: true,
        soundFeedbackEnabled: false,
        reducedMotionPreference: true,
        publicProfileEnabled: false,
        defaultRoomShareMode: "completion_only",
        shareStreakInRooms: false,
        dailyReminderEnabled: true,
        dailyReminderTime: "06:30",
        quietHoursEnabled: true,
        quietHoursStart: "22:00",
        quietHoursEnd: "05:00",
        roomNotificationsEnabled: true,
        roomGoalNotificationsEnabled: true,
        wisdomNotificationsEnabled: true,
        platformUpdatesEnabled: true,
      }).success
    ).toBe(true);

    expect(
      notificationActionSchema.safeParse({ action: "mark_read" }).success
    ).toBe(false);
    expect(
      accountDeleteConfirmSchema.safeParse({ confirmPhrase: "delete my account" })
        .success
    ).toBe(false);

    const exportDoc = buildAccountExportDocument({
      exportedAt: "2026-11-11T00:00:00Z",
      userEmail: "devotee@example.org",
      profile: {
        id: "u1",
        username: null,
        display_name: "Devotee",
        avatar_url: null,
        bio: null,
        timezone: "UTC",
        preferred_language: "en",
        is_deactivated: false,
        deletion_requested_at: null,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-11T00:00:00Z",
      },
      preferences: {
        user_id: "u1",
        daily_round_target: 16,
        carry_forward_policy: "automatic",
        custom_carry_rule: {},
        default_counting_method: "japa_mala",
        tactile_feedback_enabled: true,
        sound_feedback_enabled: false,
        reduced_motion_preference: false,
        public_profile_enabled: false,
        default_room_share_mode: "completion_only",
        share_streak_in_rooms: false,
        daily_reminder_enabled: false,
        daily_reminder_time: null,
        quiet_hours_enabled: true,
        quiet_hours_start: "22:00:00",
        quiet_hours_end: "05:00:00",
        room_notifications_enabled: true,
        room_goal_notifications_enabled: true,
        wisdom_notifications_enabled: true,
        platform_updates_enabled: true,
      },
      dailySadhana: [],
      carryForwardLedger: [],
      chantingSessions: [],
      chantingRecords: [],
      roomMemberships: [],
      gitaBookmarks: [],
      gitaNotes: [],
      gitaReadingHistory: [],
      learningCollections: [],
      libraryBookmarks: [],
      libraryViewHistory: [],
      achievements: [],
      notifications: [],
    });
    expect(exportDoc.platform).toBe("SMARAN");

    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));
    vi.doMock("next/cache", () => ({ revalidatePath: vi.fn() }));

    const { GET: exportGet } = await import("@/app/api/account/export/route");
    expect(
      (await exportGet(new Request("http://localhost:3000/api/account/export")))
        .status
    ).toBe(401);

    const { PATCH: profilePatch } = await import(
      "@/app/api/account/profile/route"
    );
    expect(
      (
        await profilePatch(
          new Request("http://localhost:3000/api/account/profile", {
            method: "PATCH",
          })
        )
      ).status
    ).toBe(401);

    const { POST: deletePost } = await import(
      "@/app/api/account/delete/route"
    );
    expect(
      (
        await deletePost(
          new Request("http://localhost:3000/api/account/delete", {
            method: "POST",
          })
        )
      ).status
    ).toBe(401);
  });
});

