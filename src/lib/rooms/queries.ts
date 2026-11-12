import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { DailySadhana } from "@/lib/domain/sadhana";
import { isMissingSchemaError } from "@/lib/sadhana/queries";
import { getLocalDateString, shiftIsoDate } from "@/lib/sadhana/stats";
import {
  computeRoomProgressSummary,
  type RoomActivityItem,
  type RoomMemberItem,
  type RoomMemberRole,
  type RoomProgressSummary,
  type RoomShareMode,
  type RoomVisibility,
} from "./analytics";

export interface RoomListItem {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  visibility: RoomVisibility;
  owner_id: string;
  default_daily_goal: number | null;
  is_archived: boolean;
  created_at: string;
  membershipRole?: RoomMemberRole | null;
  shareProgressMode?: RoomShareMode | null;
}

export interface RoomGoalItem {
  id: string;
  room_id: string;
  created_by: string;
  title: string;
  description: string | null;
  target_rounds: number;
  period_type: "daily" | "weekly" | "challenge";
  start_date: string;
  end_date: string | null;
  is_voluntary: boolean;
  created_at: string;
}

export interface RoomAnnouncementItem {
  id: string;
  room_id: string;
  author_id: string;
  author_name: string;
  title: string;
  body: string;
  is_pinned: boolean;
  created_at: string;
}

export interface RoomInvitationSummary {
  id: string;
  room_id: string;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

export interface RoomAuditLogItem {
  id: number;
  actor_user_id: string | null;
  action: string;
  target_table: string;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export type RoomsDirectoryLoadResult =
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "ready";
      user: { id: string; email: string | null; displayName: string } | null;
      myRooms: RoomListItem[];
      publicRooms: RoomListItem[];
    };

export type RoomDetailLoadResult =
  | { status: "not_found" }
  | { status: "schema_not_ready"; detail: string }
  | { status: "error"; message: string }
  | {
      status: "public_preview";
      user: { id: string; email: string | null; displayName: string } | null;
      room: RoomListItem;
    }
  | {
      status: "member";
      user: { id: string; email: string | null; displayName: string; timezone: string };
      room: RoomListItem;
      currentMembership: RoomMemberItem;
      members: RoomMemberItem[];
      goals: RoomGoalItem[];
      announcements: RoomAnnouncementItem[];
      invitations: RoomInvitationSummary[];
      auditLogs: RoomAuditLogItem[];
      progressSummary: RoomProgressSummary;
    };

export async function loadRoomsDirectory(): Promise<RoomsDirectoryLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let userSummary: { id: string; email: string | null; displayName: string } | null =
    null;

  if (user) {
    const profileRes = await supabase
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle();

    userSummary = {
      id: user.id,
      email: user.email ?? null,
      displayName: profileRes.data?.display_name ?? user.email ?? "Devotee",
    };
  }

  const roomsRes = await supabase
    .from("rooms")
    .select(
      "id, slug, name, description, visibility, owner_id, default_daily_goal, is_archived, created_at"
    )
    .eq("is_archived", false)
    .order("created_at", { ascending: false })
    .limit(100);

  if (roomsRes.error) {
    if (isMissingSchemaError(roomsRes.error)) {
      return { status: "schema_not_ready", detail: roomsRes.error.message };
    }
    return { status: "error", message: roomsRes.error.message };
  }

  const membershipMap = new Map<
    string,
    { role: RoomMemberRole; share: RoomShareMode }
  >();

  if (user) {
    const memRes = await supabase
      .from("room_memberships")
      .select("room_id, role, share_progress_mode")
      .eq("user_id", user.id);

    if (memRes.error) {
      if (isMissingSchemaError(memRes.error)) {
        return { status: "schema_not_ready", detail: memRes.error.message };
      }
      return { status: "error", message: memRes.error.message };
    }

    for (const row of memRes.data ?? []) {
      membershipMap.set(row.room_id, {
        role: row.role as RoomMemberRole,
        share: row.share_progress_mode as RoomShareMode,
      });
    }
  }

  const allRooms = (roomsRes.data ?? []) as RoomListItem[];
  const myRooms: RoomListItem[] = [];
  const publicRooms: RoomListItem[] = [];

  for (const r of allRooms) {
    const mem = membershipMap.get(r.id);
    if (mem) {
      myRooms.push({
        ...r,
        membershipRole: mem.role,
        shareProgressMode: mem.share,
      });
    } else if (r.visibility === "public") {
      publicRooms.push(r);
    }
  }

  return {
    status: "ready",
    user: userSummary,
    myRooms,
    publicRooms,
  };
}

export async function loadRoomDetail(slug: string): Promise<RoomDetailLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const roomRes = await supabase
    .from("rooms")
    .select(
      "id, slug, name, description, visibility, owner_id, default_daily_goal, is_archived, created_at"
    )
    .eq("slug", slug)
    .maybeSingle();

  if (roomRes.error) {
    if (isMissingSchemaError(roomRes.error)) {
      return { status: "schema_not_ready", detail: roomRes.error.message };
    }
    return { status: "error", message: roomRes.error.message };
  }

  if (!roomRes.data) {
    return { status: "not_found" };
  }

  const room = roomRes.data as RoomListItem;

  if (!user) {
    if (room.visibility === "public" && !room.is_archived) {
      return { status: "public_preview", user: null, room };
    }
    return { status: "not_found" };
  }

  const profileRes = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", user.id)
    .maybeSingle();

  const userSummary = {
    id: user.id,
    email: user.email ?? null,
    displayName: profileRes.data?.display_name ?? user.email ?? "Devotee",
    timezone: profileRes.data?.timezone ?? "UTC",
  };

  const myMemRes = await supabase
    .from("room_memberships")
    .select("id, room_id, user_id, role, share_progress_mode, share_streak, joined_at")
    .eq("room_id", room.id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (myMemRes.error) {
    return { status: "error", message: myMemRes.error.message };
  }

  if (!myMemRes.data) {
    if (room.visibility === "public" && !room.is_archived) {
      return { status: "public_preview", user: userSummary, room };
    }
    return { status: "not_found" };
  }

  const todayDate = getLocalDateString(userSummary.timezone);
  const windowStart = shiftIsoDate(todayDate, -83);

  const [membersRes, goalsRes, announcementsRes, feedRes] = await Promise.all([
    supabase
      .from("room_memberships")
      .select("id, room_id, user_id, role, share_progress_mode, share_streak, joined_at")
      .eq("room_id", room.id)
      .order("joined_at", { ascending: true }),
    supabase
      .from("room_goals")
      .select(
        "id, room_id, created_by, title, description, target_rounds, period_type, start_date, end_date, is_voluntary, created_at"
      )
      .eq("room_id", room.id)
      .order("start_date", { ascending: false }),
    supabase
      .from("room_announcements")
      .select("id, room_id, author_id, title, body, is_pinned, created_at")
      .eq("room_id", room.id)
      .order("is_pinned", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("room_activity_feed")
      .select(
        "id, room_id, user_id, activity_date, activity_type, shared_rounds_count, metadata, created_at"
      )
      .eq("room_id", room.id)
      .gte("activity_date", windowStart)
      .order("created_at", { ascending: false })
      .limit(500),
  ]);

  const queryErr =
    membersRes.error ??
    goalsRes.error ??
    announcementsRes.error ??
    feedRes.error;
  if (queryErr) {
    return { status: "error", message: queryErr.message };
  }

  const rawMembers = membersRes.data ?? [];
  const memberIds = Array.from(new Set(rawMembers.map((m) => m.user_id)));

  // Fetch only public-safe directory fields (display_name, avatar_url)
  const dirMap = new Map<string, { display_name: string; avatar_url: string | null }>();
  if (memberIds.length > 0) {
    const dirRes = await supabase
      .from("member_directory")
      .select("user_id, display_name, avatar_url")
      .in("user_id", memberIds);

    for (const d of dirRes.data ?? []) {
      dirMap.set(d.user_id, {
        display_name: d.display_name,
        avatar_url: d.avatar_url,
      });
    }
  }

  const members: RoomMemberItem[] = rawMembers.map((m) => {
    const dir = dirMap.get(m.user_id);
    return {
      id: m.id,
      room_id: m.room_id,
      user_id: m.user_id,
      role: m.role as RoomMemberRole,
      share_progress_mode: m.share_progress_mode as RoomShareMode,
      share_streak: Boolean(m.share_streak),
      joined_at: m.joined_at,
      display_name: dir?.display_name ?? "Devotee",
      avatar_url: dir?.avatar_url ?? null,
    };
  });

  const currentMembership =
    members.find((m) => m.user_id === user.id) ??
    ({
      ...myMemRes.data,
      display_name: userSummary.displayName,
      avatar_url: null,
    } as RoomMemberItem);

  const isAdmin =
    currentMembership.role === "owner" || currentMembership.role === "admin";

  let invitations: RoomInvitationSummary[] = [];
  let auditLogs: RoomAuditLogItem[] = [];

  if (isAdmin) {
    const [invRes, auditRes] = await Promise.all([
      supabase
        .from("room_invitations")
        .select("id, room_id, max_uses, uses_count, expires_at, revoked_at, created_at")
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(20),
      supabase
        .from("audit_logs")
        .select(
          "id, actor_user_id, action, target_table, target_id, metadata, created_at"
        )
        .eq("room_id", room.id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);
    invitations = (invRes.data ?? []) as RoomInvitationSummary[];
    auditLogs = (auditRes.data ?? []) as RoomAuditLogItem[];
  }

  const announcements: RoomAnnouncementItem[] = (announcementsRes.data ?? []).map(
    (a) => ({
      ...a,
      author_name: dirMap.get(a.author_id)?.display_name ?? "Room Admin",
    })
  );

  const progressSummary = computeRoomProgressSummary({
    todayDate,
    members,
    activities: (feedRes.data ?? []) as RoomActivityItem[],
    daysWindow: 84,
  });

  return {
    status: "member",
    user: userSummary,
    room,
    currentMembership,
    members,
    goals: (goalsRes.data ?? []) as RoomGoalItem[],
    announcements,
    invitations,
    auditLogs,
    progressSummary,
  };
}

/**
 * Publishes consented room milestone snapshots when the caller records rounds,
 * strictly respecting each room's share_progress_mode (never exposing private data).
 */
export async function syncConsentedRoomActivity(
  supabase: SupabaseClient,
  userId: string,
  dailySadhana: DailySadhana
): Promise<void> {
  const memRes = await supabase
    .from("room_memberships")
    .select("room_id, share_progress_mode")
    .eq("user_id", userId);

  if (memRes.error || !memRes.data || memRes.data.length === 0) {
    return;
  }

  const targetMet =
    dailySadhana.completed_rounds >= dailySadhana.effective_daily_target;

  for (const mem of memRes.data) {
    if (mem.share_progress_mode === "private") continue;

    if (mem.share_progress_mode === "completion_only") {
      if (!targetMet) continue;
      // Only publish once per date under completion_only
      const existing = await supabase
        .from("room_activity_feed")
        .select("id")
        .eq("room_id", mem.room_id)
        .eq("user_id", userId)
        .eq("activity_date", dailySadhana.sadhana_date)
        .eq("activity_type", "daily_target_met")
        .limit(1);

      if ((existing.data ?? []).length === 0) {
        await supabase.from("room_activity_feed").insert({
          room_id: mem.room_id,
          user_id: userId,
          activity_date: dailySadhana.sadhana_date,
          activity_type: "daily_target_met",
          shared_rounds_count: null,
        });
      }
      continue;
    }

    if (mem.share_progress_mode === "full") {
      await supabase.from("room_activity_feed").insert({
        room_id: mem.room_id,
        user_id: userId,
        activity_date: dailySadhana.sadhana_date,
        activity_type: targetMet ? "daily_target_met" : "rounds_shared",
        shared_rounds_count: dailySadhana.completed_rounds,
      });
    }
  }
}

