import type { CARRY_FORWARD_POLICIES } from "@/lib/domain/sadhana";

export interface AccountProfile {
  id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  preferred_language: string;
  is_deactivated: boolean;
  deletion_requested_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AccountPreferences {
  user_id: string;
  daily_round_target: number;
  carry_forward_policy: (typeof CARRY_FORWARD_POLICIES)[number];
  custom_carry_rule: Record<string, unknown>;
  default_counting_method: "manual" | "japa_mala";
  tactile_feedback_enabled: boolean;
  sound_feedback_enabled: boolean;
  reduced_motion_preference: boolean;
  public_profile_enabled: boolean;
  default_room_share_mode: "full" | "completion_only" | "private";
  share_streak_in_rooms: boolean;
  daily_reminder_enabled: boolean;
  daily_reminder_time: string | null;
  quiet_hours_enabled: boolean;
  quiet_hours_start: string;
  quiet_hours_end: string;
  room_notifications_enabled: boolean;
  room_goal_notifications_enabled: boolean;
  wisdom_notifications_enabled: boolean;
  platform_updates_enabled: boolean;
}

export interface AccountNotification {
  id: string;
  type:
    | "sadhana_reminder"
    | "carry_forward_notice"
    | "room_invite"
    | "room_announcement"
    | "room_milestone"
    | "content_feedback_update"
    | "system_notice";
  title: string;
  body: string;
  action_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface AchievementCatalogItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: "consistency" | "milestone" | "study" | "community";
  threshold_value: number;
}

export interface UserAchievementRow {
  id: string;
  achievement_id: string;
  unlocked_at: string;
  metadata: Record<string, unknown>;
}

export interface MilestoneDisplayItem {
  id: string;
  code: string;
  title: string;
  description: string;
  category: "consistency" | "milestone" | "study" | "community";
  thresholdValue: number;
  currentValue: number;
  unlocked: boolean;
  unlockedAt: string | null;
}

export interface VerifiedMilestoneStats {
  totalRounds: number;
  malaRounds: number;
  activeDays: number;
  anniversaryDays: number;
}

function timeToMinutes(hhmm: string): number {
  const parts = hhmm.split(":");
  const h = Number.parseInt(parts[0] ?? "0", 10);
  const m = Number.parseInt(parts[1] ?? "0", 10);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return 0;
  return h * 60 + m;
}

/**
 * Matches PostgreSQL quiet-hours logic cleanly across midnight wrap-around intervals.
 */
export function isWithinQuietHours(
  localTimeHHMM: string,
  quietStartHHMM: string,
  quietEndHHMM: string
): boolean {
  const cur = timeToMinutes(localTimeHHMM);
  const start = timeToMinutes(quietStartHHMM);
  const end = timeToMinutes(quietEndHHMM);
  if (start === end) return false;
  if (start > end) {
    return cur >= start || cur < end;
  }
  return cur >= start && cur < end;
}

export function buildMilestoneDisplayList(
  catalog: AchievementCatalogItem[],
  unlockedRows: UserAchievementRow[],
  stats: VerifiedMilestoneStats
): MilestoneDisplayItem[] {
  const unlockedMap = new Map<string, UserAchievementRow>(
    unlockedRows.map((u) => [u.achievement_id, u])
  );

  return catalog.map((item) => {
    const unlock = unlockedMap.get(item.id);
    let currentValue = 0;
    if (item.code === "first_round" || item.code.startsWith("rounds_")) {
      currentValue = stats.totalRounds;
    } else if (item.code === "first_108_mala") {
      currentValue = stats.malaRounds;
    } else if (item.code.startsWith("consistent_days_")) {
      currentValue = stats.activeDays;
    } else if (item.code.startsWith("anniversary_")) {
      currentValue = stats.anniversaryDays;
    }

    return {
      id: item.id,
      code: item.code,
      title: item.title,
      description: item.description,
      category: item.category,
      thresholdValue: item.threshold_value,
      currentValue: Math.min(currentValue, item.threshold_value),
      unlocked: Boolean(unlock),
      unlockedAt: unlock?.unlocked_at ?? null,
    };
  });
}

export function buildAccountExportDocument(params: {
  exportedAt: string;
  userEmail: string | null;
  profile: AccountProfile;
  preferences: AccountPreferences;
  dailySadhana: unknown[];
  carryForwardLedger: unknown[];
  chantingSessions: unknown[];
  chantingRecords: unknown[];
  roomMemberships: unknown[];
  gitaBookmarks: unknown[];
  gitaNotes: unknown[];
  gitaReadingHistory: unknown[];
  learningCollections: unknown[];
  libraryBookmarks: unknown[];
  libraryViewHistory: unknown[];
  achievements: unknown[];
  notifications: unknown[];
}) {
  return {
    platform: "SMARAN",
    exportVersion: "1.0",
    exportedAt: params.exportedAt,
    account: {
      email: params.userEmail,
      profile: params.profile,
      preferences: params.preferences,
    },
    sadhana: {
      dailySadhana: params.dailySadhana,
      carryForwardLedger: params.carryForwardLedger,
      chantingSessions: params.chantingSessions,
      chantingRecords: params.chantingRecords,
    },
    communities: {
      roomMemberships: params.roomMemberships,
    },
    scriptureStudy: {
      gitaBookmarks: params.gitaBookmarks,
      gitaNotes: params.gitaNotes,
      gitaReadingHistory: params.gitaReadingHistory,
      learningCollections: params.learningCollections,
    },
    library: {
      libraryBookmarks: params.libraryBookmarks,
      libraryViewHistory: params.libraryViewHistory,
    },
    milestones: params.achievements,
    notifications: params.notifications,
  };
}

