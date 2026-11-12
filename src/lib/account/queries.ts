import { createClient } from "@/lib/supabase/server";
import { isMissingSchemaError } from "@/lib/sadhana/queries";
import { getLocalDateString } from "@/lib/sadhana/stats";
import {
  buildMilestoneDisplayList,
  type AccountNotification,
  type AccountPreferences,
  type AccountProfile,
  type AchievementCatalogItem,
  type MilestoneDisplayItem,
  type UserAchievementRow,
  type VerifiedMilestoneStats,
} from "./domain";

export interface AccountRoomMembershipSummary {
  id: string;
  room_id: string;
  room_slug: string;
  room_name: string;
  room_visibility: "public" | "private";
  role: "owner" | "admin" | "member";
  share_progress_mode: "full" | "completion_only" | "private";
  share_streak: boolean;
}

export type AccountWorkspaceLoadResult =
  | { status: "unauthenticated" }
  | { status: "deactivated" }
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      userEmail: string | null;
      profile: AccountProfile;
      preferences: AccountPreferences;
      memberships: AccountRoomMembershipSummary[];
      notifications: AccountNotification[];
      unreadNotificationCount: number;
      milestones: MilestoneDisplayItem[];
      milestoneStats: VerifiedMilestoneStats;
    };

export async function loadAccountWorkspace(): Promise<AccountWorkspaceLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" };
  }

  // Reconcile verified milestones & optional daily reminder quietly via locked RPCs
  try {
    await Promise.all([
      supabase.rpc("sync_my_achievements"),
      supabase.rpc("evaluate_my_daily_reminder"),
    ]);
  } catch {
    // Do not mask missing schema detection handled below
  }

  const [
    profileRes,
    prefsRes,
    membershipsRes,
    notificationsRes,
    catalogRes,
    unlockedRes,
    recordsRes,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id, username, display_name, avatar_url, bio, timezone, preferred_language, is_deactivated, deletion_requested_at, created_at, updated_at"
      )
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select(
        "user_id, daily_round_target, carry_forward_policy, custom_carry_rule, default_counting_method, tactile_feedback_enabled, sound_feedback_enabled, reduced_motion_preference, public_profile_enabled, default_room_share_mode, share_streak_in_rooms, daily_reminder_enabled, daily_reminder_time, quiet_hours_enabled, quiet_hours_start, quiet_hours_end, room_notifications_enabled, room_goal_notifications_enabled, wisdom_notifications_enabled, platform_updates_enabled"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("room_memberships")
      .select("id, room_id, role, share_progress_mode, share_streak")
      .eq("user_id", user.id),
    supabase
      .from("notifications")
      .select("id, type, title, body, action_url, is_read, read_at, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("achievements")
      .select("id, code, title, description, category, threshold_value")
      .eq("is_active", true)
      .order("threshold_value", { ascending: true }),
    supabase
      .from("user_achievements")
      .select("id, achievement_id, unlocked_at, metadata")
      .eq("user_id", user.id),
    supabase
      .from("chanting_records")
      .select("sadhana_date, method")
      .eq("user_id", user.id)
      .eq("is_reverted", false),
  ]);

  const err =
    profileRes.error ??
    prefsRes.error ??
    membershipsRes.error ??
    notificationsRes.error ??
    catalogRes.error ??
    unlockedRes.error ??
    recordsRes.error;

  if (err) {
    if (isMissingSchemaError(err)) {
      return { status: "schema_not_ready", detail: err.message };
    }
    return { status: "error", message: err.message };
  }

  if (!profileRes.data || !prefsRes.data) {
    return {
      status: "error",
      message: "Account profile records have not been initialized yet.",
    };
  }

  const profile = profileRes.data as AccountProfile;
  if (profile.is_deactivated) {
    return { status: "deactivated" };
  }

  const rawMemberships = membershipsRes.data ?? [];
  const roomIds = rawMemberships.map((m) => m.room_id as string);
  const roomMap = new Map<
    string,
    { slug: string; name: string; visibility: "public" | "private" }
  >();

  if (roomIds.length > 0) {
    const roomsRes = await supabase
      .from("rooms")
      .select("id, slug, name, visibility")
      .in("id", roomIds);
    for (const r of roomsRes.data ?? []) {
      roomMap.set(r.id as string, {
        slug: String(r.slug),
        name: String(r.name),
        visibility: r.visibility as "public" | "private",
      });
    }
  }

  const memberships: AccountRoomMembershipSummary[] = rawMemberships.map(
    (m) => {
      const room = roomMap.get(m.room_id as string);
      return {
        id: m.id as string,
        room_id: m.room_id as string,
        room_slug: room?.slug ?? "",
        room_name: room?.name ?? "Chanting Room",
        room_visibility: room?.visibility ?? "private",
        role: m.role as "owner" | "admin" | "member",
        share_progress_mode: m.share_progress_mode as
          | "full"
          | "completion_only"
          | "private",
        share_streak: Boolean(m.share_streak),
      };
    }
  );

  const validRecords = recordsRes.data ?? [];
  let totalRounds = 0;
  let malaRounds = 0;
  const activeDates = new Set<string>();
  let earliestDate: string | null = null;

  for (const r of validRecords) {
    totalRounds += 1;
    if (r.method === "japa_mala") malaRounds += 1;
    const d = String(r.sadhana_date);
    activeDates.add(d);
    if (!earliestDate || d < earliestDate) earliestDate = d;
  }

  let anniversaryDays = 0;
  if (earliestDate) {
    const todayLocal = getLocalDateString(profile.timezone ?? "UTC");
    const todayMs = Date.parse(`${todayLocal}T00:00:00Z`);
    const firstMs = Date.parse(`${earliestDate}T00:00:00Z`);
    if (Number.isFinite(todayMs) && Number.isFinite(firstMs)) {
      anniversaryDays = Math.max(
        0,
        Math.floor((todayMs - firstMs) / (1000 * 60 * 60 * 24))
      );
    }
  }

  const milestoneStats: VerifiedMilestoneStats = {
    totalRounds,
    malaRounds,
    activeDays: activeDates.size,
    anniversaryDays,
  };

  const notifications = (notificationsRes.data ?? []) as AccountNotification[];
  const unreadNotificationCount = notifications.filter((n) => !n.is_read).length;

  const milestones = buildMilestoneDisplayList(
    (catalogRes.data ?? []) as AchievementCatalogItem[],
    (unlockedRes.data ?? []) as UserAchievementRow[],
    milestoneStats
  );

  return {
    status: "ready",
    userEmail: user.email ?? null,
    profile,
    preferences: prefsRes.data as AccountPreferences,
    memberships,
    notifications,
    unreadNotificationCount,
    milestones,
    milestoneStats,
  };
}

