import { shiftIsoDate } from "@/lib/sadhana/stats";

export type RoomVisibility = "public" | "private";
export type RoomMemberRole = "owner" | "admin" | "member";
export type RoomShareMode = "full" | "completion_only" | "private";

export interface RoomMemberItem {
  id: string;
  room_id: string;
  user_id: string;
  role: RoomMemberRole;
  share_progress_mode: RoomShareMode;
  share_streak: boolean;
  joined_at: string;
  display_name: string;
  avatar_url: string | null;
}

export interface RoomActivityItem {
  id: string;
  room_id: string;
  user_id: string;
  activity_date: string;
  activity_type:
    | "joined_room"
    | "daily_target_met"
    | "rounds_shared"
    | "challenge_joined";
  shared_rounds_count: number | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface SanitizedRoomActivity {
  id: string;
  user_id: string;
  display_name: string;
  activity_date: string;
  activity_type: RoomActivityItem["activity_type"];
  shared_rounds_count: number | null;
  created_at: string;
  metadata: Record<string, unknown>;
}

export interface RoomHeatmapDay {
  date: string;
  participatingMembers: number;
  targetMetMembers: number;
  totalSharedRounds: number;
}

export interface MemberTodayStatus {
  hasSharedToday: boolean;
  targetMetToday: boolean;
  sharedRoundsToday: number | null;
}

export interface RoomProgressSummary {
  todayDate: string;
  memberCount: number;
  sharingMembersCount: number;
  todayActiveMembers: number;
  todayTargetMetMembers: number;
  todaySharedRounds: number;
  weeklySharedRounds: number;
  weeklyActiveCheckins: number;
  heatmapDays: RoomHeatmapDay[];
  memberTodayStatus: Record<string, MemberTodayStatus>;
  sanitizedFeed: SanitizedRoomActivity[];
}

/**
 * Aggregates consented room progress, privacy-filtered feed items, and an 84-day
 * room consistency heatmap. Strictly enforces each member's current share_progress_mode
 * and never invents rankings or exposes private member chanting history.
 */
export function computeRoomProgressSummary(params: {
  todayDate: string;
  members: RoomMemberItem[];
  activities: RoomActivityItem[];
  daysWindow?: number;
}): RoomProgressSummary {
  const { todayDate, members, activities } = params;
  const daysWindow = params.daysWindow ?? 84;

  const memberById = new Map<string, RoomMemberItem>();
  for (const m of members) {
    memberById.set(m.user_id, m);
  }

  // Latest consented daily state per (user_id, activity_date)
  const latestDailyByUserDate = new Map<
    string,
    {
      userId: string;
      date: string;
      targetMet: boolean;
      sharedRounds: number | null;
      active: boolean;
    }
  >();

  const sanitizedFeed: SanitizedRoomActivity[] = [];

  // Process oldest -> newest or newest -> oldest carefully
  const sortedAsc = [...activities].sort((a, b) =>
    a.created_at.localeCompare(b.created_at)
  );

  for (const act of sortedAsc) {
    const member = memberById.get(act.user_id);
    if (!member) continue;

    // Enforce current privacy preference even on older feed items
    if (
      member.share_progress_mode === "private" &&
      act.activity_type !== "joined_room"
    ) {
      continue;
    }

    const safeRounds =
      member.share_progress_mode === "full" ? act.shared_rounds_count : null;

    sanitizedFeed.push({
      id: act.id,
      user_id: act.user_id,
      display_name: member.display_name,
      activity_date: act.activity_date,
      activity_type: act.activity_type,
      shared_rounds_count: safeRounds,
      created_at: act.created_at,
      metadata: act.metadata,
    });

    if (
      act.activity_type === "daily_target_met" ||
      act.activity_type === "rounds_shared"
    ) {
      const key = `${act.user_id}:${act.activity_date}`;
      const existing = latestDailyByUserDate.get(key);
      const isMet =
        act.activity_type === "daily_target_met" || Boolean(existing?.targetMet);
      const nextRounds =
        safeRounds !== null
          ? Math.max(existing?.sharedRounds ?? 0, safeRounds)
          : existing?.sharedRounds ?? null;

      latestDailyByUserDate.set(key, {
        userId: act.user_id,
        date: act.activity_date,
        targetMet: isMet,
        sharedRounds: member.share_progress_mode === "full" ? nextRounds : null,
        active: true,
      });
    }
  }

  const weekStart = shiftIsoDate(todayDate, -6);
  const windowStart = shiftIsoDate(todayDate, -(daysWindow - 1));

  const dayAgg = new Map<
    string,
    { participating: number; targetMet: number; rounds: number }
  >();

  let todayActiveMembers = 0;
  let todayTargetMetMembers = 0;
  let todaySharedRounds = 0;
  let weeklySharedRounds = 0;
  let weeklyActiveCheckins = 0;

  const memberTodayStatus: Record<string, MemberTodayStatus> = {};

  for (const state of latestDailyByUserDate.values()) {
    const bucket = dayAgg.get(state.date) ?? {
      participating: 0,
      targetMet: 0,
      rounds: 0,
    };
    bucket.participating += 1;
    if (state.targetMet) bucket.targetMet += 1;
    if (state.sharedRounds !== null) bucket.rounds += state.sharedRounds;
    dayAgg.set(state.date, bucket);

    if (state.date === todayDate) {
      todayActiveMembers += 1;
      if (state.targetMet) todayTargetMetMembers += 1;
      if (state.sharedRounds !== null) todaySharedRounds += state.sharedRounds;

      memberTodayStatus[state.userId] = {
        hasSharedToday: true,
        targetMetToday: state.targetMet,
        sharedRoundsToday: state.sharedRounds,
      };
    }

    if (state.date >= weekStart && state.date <= todayDate) {
      weeklyActiveCheckins += 1;
      if (state.sharedRounds !== null) weeklySharedRounds += state.sharedRounds;
    }
  }

  const heatmapDays: RoomHeatmapDay[] = [];
  for (let i = 0; i < daysWindow; i++) {
    const date = shiftIsoDate(windowStart, i);
    const agg = dayAgg.get(date);
    heatmapDays.push({
      date,
      participatingMembers: agg?.participating ?? 0,
      targetMetMembers: agg?.targetMet ?? 0,
      totalSharedRounds: agg?.rounds ?? 0,
    });
  }

  sanitizedFeed.sort((a, b) => b.created_at.localeCompare(a.created_at));

  return {
    todayDate,
    memberCount: members.length,
    sharingMembersCount: members.filter(
      (m) => m.share_progress_mode !== "private"
    ).length,
    todayActiveMembers,
    todayTargetMetMembers,
    todaySharedRounds,
    weeklySharedRounds,
    weeklyActiveCheckins,
    heatmapDays,
    memberTodayStatus,
    sanitizedFeed: sanitizedFeed.slice(0, 30),
  };
}
