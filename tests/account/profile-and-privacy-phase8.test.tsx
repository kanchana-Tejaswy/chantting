import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import {
  asUser,
  createBootstrappedDb,
  seedTestUser,
  type TestDb,
} from "../db/helpers/pglite-bootstrap";
import {
  accountPasswordUpdateSchema,
  accountProfileUpdateSchema,
} from "@/lib/account/validation";
import { buildAccountExportDocument } from "@/lib/account/domain";
import { AccountWorkspace } from "@/components/account/account-workspace";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
  usePathname: () => "/account",
}));

const DEVOTEE_1 = "e1111111-1111-4111-8111-111111111111";
const DEVOTEE_2 = "e2222222-2222-4222-8222-222222222222";

describe("SMARAN Phase 8: Profile, Privacy & Account Management", () => {
  let testDb: TestDb;

  beforeAll(async () => {
    testDb = await createBootstrappedDb();
    await seedTestUser(testDb.db, {
      id: DEVOTEE_1,
      email: "radha@example.org",
      name: "Radhika Dasi",
      timezone: "Asia/Kolkata",
    });
    await seedTestUser(testDb.db, {
      id: DEVOTEE_2,
      email: "madhav@example.org",
      name: "Madhava Das",
      timezone: "UTC",
    });
  });

  afterAll(async () => {
    await testDb.cleanup();
  });

  it("1. Profile editing, avatar validation, member directory sync & ownership RLS", async () => {
    // Schema validation checks
    const validUpdate = accountProfileUpdateSchema.safeParse({
      displayName: "Sri Radhika",
      username: "radhika_seva",
      avatarUrl: "https://example.com/lotus.jpg",
      bio: "Morning Japa in Vrindavan.",
      timezone: "Asia/Kolkata",
      preferredLanguage: "sa",
    });
    expect(validUpdate.success).toBe(true);

    const invalidAvatar = accountProfileUpdateSchema.safeParse({
      displayName: "Sri Radhika",
      avatarUrl: "ftp://unsafe-link.org",
      timezone: "Asia/Kolkata",
    });
    expect(invalidAvatar.success).toBe(false);

    // DEVOTEE_1 updates profile in PostgreSQL
    await asUser(testDb.db, DEVOTEE_1, async (tx) => {
      await tx.query(
        `UPDATE public.profiles
         SET display_name = 'Sri Radhika',
             username = 'radhika_seva',
             avatar_url = 'https://example.com/lotus.jpg',
             bio = 'Morning Japa in Sri Vrindavan.',
             timezone = 'Asia/Kolkata',
             preferred_language = 'sa'
         WHERE id = $1`,
        [DEVOTEE_1]
      );
    });

    // Check member_directory sync trigger
    const dirRow = await asUser(testDb.db, DEVOTEE_1, async (tx) => {
      const r = await tx.query<{
        display_name: string;
        username: string;
        avatar_url: string;
      }>(
        `SELECT display_name, username, avatar_url FROM public.member_directory WHERE user_id = $1`,
        [DEVOTEE_1]
      );
      return r.rows[0];
    });
    expect(dirRow?.display_name).toBe("Sri Radhika");
    expect(dirRow?.username).toBe("radhika_seva");
    expect(dirRow?.avatar_url).toBe("https://example.com/lotus.jpg");

    // DEVOTEE_2 cannot alter DEVOTEE_1's profile
    const unauthUpdate = await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      const r = await tx.query(
        `UPDATE public.profiles SET display_name = 'Hacked' WHERE id = $1 RETURNING id`,
        [DEVOTEE_1]
      );
      return r.rows;
    });
    expect(unauthUpdate).toEqual([]);

    // Profile API 401 gate check
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));

    const { PATCH: profilePatch } = await import(
      "@/app/api/account/profile/route"
    );
    const unauthRes = await profilePatch(
      new Request("http://localhost:3000/api/account/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: "Tester",
          timezone: "UTC",
        }),
      })
    );
    expect(unauthRes.status).toBe(401);
  });

  it("2. Privacy & visibility modes, consent revocation & room feed cleanup", async () => {
    // DEVOTEE_1 creates room, DEVOTEE_2 joins with 'full' progress sharing
    const roomId = await asUser(testDb.db, DEVOTEE_1, async (tx) => {
      const r = await tx.query<{ id: string }>(
        `INSERT INTO public.rooms (slug, name, visibility, owner_id)
         VALUES ('vrinda-sangha', 'Vrinda Morning Sangha', 'public', $1)
         RETURNING id`,
        [DEVOTEE_1]
      );
      return r.rows[0]!.id;
    });

    await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      await tx.query(
        `INSERT INTO public.room_memberships (room_id, user_id, role, share_progress_mode)
         VALUES ($1, $2, 'member', 'full')`,
        [roomId, DEVOTEE_2]
      );
      // Record personal round
      await tx.query(
        `SELECT public.record_chanting_round('japa_mala', 'round-p8-d2-1', NULL, NULL)`
      );
      // Post activity feed items
      await tx.query(
        `INSERT INTO public.room_activity_feed (room_id, user_id, activity_date, activity_type, shared_rounds_count)
         VALUES ($1, $2, CURRENT_DATE, 'rounds_shared', 16)`,
        [roomId, DEVOTEE_2]
      );
      await tx.query(
        `INSERT INTO public.room_activity_feed (room_id, user_id, activity_date, activity_type, shared_rounds_count)
         VALUES ($1, $2, CURRENT_DATE, 'daily_target_met', 16)`,
        [roomId, DEVOTEE_2]
      );
    });

    // DEVOTEE_2 downgrades to 'completion_only' -> 'rounds_shared' deleted, 'daily_target_met' count nullified!
    await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      await tx.query(
        `UPDATE public.room_memberships
         SET share_progress_mode = 'completion_only'
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, DEVOTEE_2]
      );
    });

    const feedAfterCompletionOnly = await asUser(
      testDb.db,
      DEVOTEE_2,
      async (tx) => {
        const r = await tx.query<{
          activity_type: string;
          shared_rounds_count: number | null;
        }>(
          `SELECT activity_type, shared_rounds_count FROM public.room_activity_feed WHERE user_id = $1`,
          [DEVOTEE_2]
        );
        return r.rows;
      }
    );
    expect(feedAfterCompletionOnly).toHaveLength(1);
    expect(feedAfterCompletionOnly[0]!.activity_type).toBe("daily_target_met");
    expect(feedAfterCompletionOnly[0]!.shared_rounds_count).toBeNull();

    // DEVOTEE_2 sets to 'private' -> feed rows purged except joined_room
    await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      await tx.query(
        `UPDATE public.room_memberships
         SET share_progress_mode = 'private'
         WHERE room_id = $1 AND user_id = $2`,
        [roomId, DEVOTEE_2]
      );
    });

    const feedAfterPrivate = await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.room_activity_feed WHERE user_id = $1`,
        [DEVOTEE_2]
      );
      return r.rows;
    });
    expect(feedAfterPrivate).toEqual([]);

    // Room admin DEVOTEE_1 still sees zero rows in daily_sadhana or chanting_records for DEVOTEE_2
    const adminCheck = await asUser(testDb.db, DEVOTEE_1, async (tx) => {
      const r = await tx.query(
        `SELECT * FROM public.daily_sadhana WHERE user_id = $1`,
        [DEVOTEE_2]
      );
      return r.rows;
    });
    expect(adminCheck).toEqual([]);
  });

  it("3. Password schema validation, reset route & sessions authorization", async () => {
    // Valid password update payload
    expect(
      accountPasswordUpdateSchema.safeParse({
        action: "update_password",
        password: "SacredPassword108!",
        confirmPassword: "SacredPassword108!",
      }).success
    ).toBe(true);

    // Mismatched passwords reject
    expect(
      accountPasswordUpdateSchema.safeParse({
        action: "update_password",
        password: "SacredPassword108!",
        confirmPassword: "DifferentPassword108!",
      }).success
    ).toBe(false);

    // Passwords < 8 characters reject
    expect(
      accountPasswordUpdateSchema.safeParse({
        action: "update_password",
        password: "short",
        confirmPassword: "short",
      }).success
    ).toBe(false);

    // Valid reset link request
    expect(
      accountPasswordUpdateSchema.safeParse({
        action: "request_reset_link",
      }).success
    ).toBe(true);

    // Password API 401 gate
    vi.resetModules();
    vi.doMock("@/lib/supabase/server", () => ({
      createClient: vi.fn(async () => ({
        auth: {
          getUser: async () => ({ data: { user: null }, error: null }),
        },
      })),
    }));

    const { POST: passwordPost } = await import(
      "@/app/api/account/password/route"
    );
    const unauthPwd = await passwordPost(
      new Request("http://localhost:3000/api/account/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "update_password",
          password: "SacredPassword108!",
          confirmPassword: "SacredPassword108!",
        }),
      })
    );
    expect(unauthPwd.status).toBe(401);

    const { POST: sessionsPost } = await import(
      "@/app/api/account/sessions/route"
    );
    const unauthSessions = await sessionsPost(
      new Request("http://localhost:3000/api/account/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scope: "local" }),
      })
    );
    expect(unauthSessions.status).toBe(401);
  });

  it("4. Data export payload includes Sankalpa commitments & sadhana history", () => {
    const exportDoc = buildAccountExportDocument({
      exportedAt: "2026-11-14T05:00:00Z",
      userEmail: "radha@example.org",
      profile: {
        id: DEVOTEE_1,
        username: "radhika_seva",
        display_name: "Sri Radhika",
        avatar_url: "https://example.com/lotus.jpg",
        bio: "Morning Japa in Sri Vrindavan.",
        timezone: "Asia/Kolkata",
        preferred_language: "sa",
        is_deactivated: false,
        deletion_requested_at: null,
        created_at: "2026-11-01T00:00:00Z",
        updated_at: "2026-11-14T00:00:00Z",
      },
      preferences: {
        user_id: DEVOTEE_1,
        daily_round_target: 16,
        carry_forward_policy: "automatic",
        custom_carry_rule: {},
        default_counting_method: "japa_mala",
        tactile_feedback_enabled: true,
        sound_feedback_enabled: true,
        reduced_motion_preference: false,
        public_profile_enabled: false,
        default_room_share_mode: "completion_only",
        share_streak_in_rooms: false,
        daily_reminder_enabled: true,
        daily_reminder_time: "06:30:00",
        quiet_hours_enabled: true,
        quiet_hours_start: "22:00:00",
        quiet_hours_end: "05:00:00",
        room_notifications_enabled: true,
        room_goal_notifications_enabled: true,
        wisdom_notifications_enabled: true,
        platform_updates_enabled: true,
      },
      dailySadhana: [{ sadhana_date: "2026-11-14", completed_rounds: 16 }],
      carryForwardLedger: [],
      chantingSessions: [],
      chantingRecords: [],
      sankalpas: [
        {
          id: "sk-1",
          title: "Kartika 64 Rounds Vow",
          target_rounds: 1920,
          completed_rounds: 64,
          status: "active",
        },
      ],
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
    expect(exportDoc.sadhana.sankalpas).toHaveLength(1);
    expect(exportDoc.account.profile.avatar_url).toBe(
      "https://example.com/lotus.jpg"
    );
  });

  it("5. Account deletion safeguards & automatic Sankalpa cleanup upon scrub", async () => {
    // DEVOTEE_2 creates a Sankalpa
    await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      await tx.query(
        `INSERT INTO public.sankalpas (user_id, title, target_rounds, start_date)
         VALUES ($1, 'Damodara Vow', 1000, CURRENT_DATE)`,
        [DEVOTEE_2]
      );
    });

    // Check sankalpa exists
    const beforeSankalpas = await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.sankalpas WHERE user_id = $1`,
        [DEVOTEE_2]
      );
      return r.rows;
    });
    expect(beforeSankalpas).toHaveLength(1);

    // Deactivation with wrong phrase rejected
    await expect(
      asUser(testDb.db, DEVOTEE_2, async (tx) => {
        await tx.query(
          `SELECT public.deactivate_and_scrub_my_account('cancel my account')`
        );
      })
    ).rejects.toThrow(/DELETE MY ACCOUNT/);

    // Deactivation with exact phrase scrubs PII and fires trigger to clean up sankalpas
    await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      await tx.query(
        `SELECT public.deactivate_and_scrub_my_account('DELETE MY ACCOUNT')`
      );
    });

    // Verify sankalpas cleaned
    const afterSankalpas = await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      const r = await tx.query(
        `SELECT id FROM public.sankalpas WHERE user_id = $1`,
        [DEVOTEE_2]
      );
      return r.rows;
    });
    expect(afterSankalpas).toHaveLength(0);

    // Verify profile is anonymized
    const scrubbedProfile = await asUser(testDb.db, DEVOTEE_2, async (tx) => {
      const r = await tx.query<{
        display_name: string;
        is_deactivated: boolean;
      }>(`SELECT display_name, is_deactivated FROM public.profiles WHERE id = $1`, [
        DEVOTEE_2,
      ]);
      return r.rows[0];
    });
    expect(scrubbedProfile?.display_name).toBe("Former Devotee");
    expect(scrubbedProfile?.is_deactivated).toBe(true);
  });

  it("6. UI rendering across all 4 primary settings sections + notifications & milestones", () => {
    const baseProfile = {
      id: "u1",
      username: "ananda",
      display_name: "Ananda Das",
      avatar_url: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=200&auto=format&fit=crop&q=80",
      bio: "Chanting morning Japa with devotion.",
      timezone: "Asia/Kolkata",
      preferred_language: "en",
      is_deactivated: false,
      deletion_requested_at: null,
      created_at: "2026-11-01T00:00:00Z",
      updated_at: "2026-11-14T00:00:00Z",
    };

    const basePrefs = {
      user_id: "u1",
      daily_round_target: 16,
      carry_forward_policy: "automatic" as const,
      custom_carry_rule: {},
      default_counting_method: "japa_mala" as const,
      tactile_feedback_enabled: true,
      sound_feedback_enabled: true,
      reduced_motion_preference: false,
      public_profile_enabled: false,
      default_room_share_mode: "completion_only" as const,
      share_streak_in_rooms: false,
      daily_reminder_enabled: true,
      daily_reminder_time: "06:30:00",
      quiet_hours_enabled: true,
      quiet_hours_start: "22:00:00",
      quiet_hours_end: "05:00:00",
      room_notifications_enabled: true,
      room_goal_notifications_enabled: true,
      wisdom_notifications_enabled: true,
      platform_updates_enabled: true,
    };

    // 1. Profile section
    const profileHtml = renderToStaticMarkup(
      <AccountWorkspace
        userEmail="ananda@example.org"
        emailConfirmed={true}
        accountCreatedAt="2026-11-01T00:00:00Z"
        profile={baseProfile}
        preferences={basePrefs}
        memberships={[]}
        notifications={[]}
        unreadNotificationCount={0}
        milestones={[]}
        milestoneStats={{ totalRounds: 16, malaRounds: 1, activeDays: 2, anniversaryDays: 13 }}
        initialTab="profile"
      />
    );
    expect(profileHtml).toContain("Identity &amp; Devotional Avatar");
    expect(profileHtml).toContain("Devotional Avatar");
    expect(profileHtml).toContain("Sacred Lotus");
    expect(profileHtml).toContain("Registered Email");
    expect(profileHtml).toContain("Verified");
    expect(profileHtml).toContain("Devotee since November 1, 2026");

    // 2. Privacy section
    const privacyHtml = renderToStaticMarkup(
      <AccountWorkspace
        userEmail="ananda@example.org"
        emailConfirmed={true}
        accountCreatedAt="2026-11-01T00:00:00Z"
        profile={baseProfile}
        preferences={basePrefs}
        memberships={[]}
        notifications={[]}
        unreadNotificationCount={0}
        milestones={[]}
        milestoneStats={{ totalRounds: 16, malaRounds: 1, activeDays: 2, anniversaryDays: 13 }}
        initialTab="privacy"
      />
    );
    expect(privacyHtml).toContain("Global Privacy &amp; Directory Visibility");
    expect(privacyHtml).toContain("Room Sharing Consent");
    expect(privacyHtml).toContain("DELETE MY ACCOUNT");

    // 3. Security section
    const securityHtml = renderToStaticMarkup(
      <AccountWorkspace
        userEmail="ananda@example.org"
        emailConfirmed={true}
        accountCreatedAt="2026-11-01T00:00:00Z"
        profile={baseProfile}
        preferences={basePrefs}
        memberships={[]}
        notifications={[]}
        unreadNotificationCount={0}
        milestones={[]}
        milestoneStats={{ totalRounds: 16, malaRounds: 1, activeDays: 2, anniversaryDays: 13 }}
        initialTab="security"
      />
    );
    expect(securityHtml).toContain("Password &amp; Authentication");
    expect(securityHtml).toContain("Update Password");
    expect(securityHtml).toContain("Send Password Reset Link to Email");
    expect(securityHtml).toContain("Sign Out This Device");
    expect(securityHtml).toContain("Sign Out All Devices");

    // 4. Data section
    const dataHtml = renderToStaticMarkup(
      <AccountWorkspace
        userEmail="ananda@example.org"
        emailConfirmed={true}
        accountCreatedAt="2026-11-01T00:00:00Z"
        profile={baseProfile}
        preferences={basePrefs}
        memberships={[]}
        notifications={[]}
        unreadNotificationCount={0}
        milestones={[]}
        milestoneStats={{ totalRounds: 16, malaRounds: 1, activeDays: 2, anniversaryDays: 13 }}
        initialTab="data"
      />
    );
    expect(dataHtml).toContain("Account Data Export");
    expect(dataHtml).toContain("Download Complete JSON Data Archive");
    expect(dataHtml).toContain("Permanent Account Deletion Safeguards");
  });
});
