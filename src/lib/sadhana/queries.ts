import { createClient } from "@/lib/supabase/server";
import { dailySadhanaSchema, type DailySadhana } from "@/lib/domain/sadhana";
import type {
  ChantingRoundRecord,
  ChantingSessionRecord,
  ChantWorkspacePayload,
} from "@/lib/chant/types";
import type { SankalpaRecord } from "@/lib/sankalpa/types";
import type { MantraRecord, MantraHistoricalStat } from "@/lib/mantra/types";
import type { ChantingReminderRecord } from "@/lib/reminders/types";
import type { SessionNoteRecord } from "@/lib/notes/types";
import {
  getPendingOptionalCarryOffer,
  getUnappliedPendingNotice,
  type CarryForwardLedgerEntry,
  type PendingOptionalCarryOffer,
  type UnappliedPendingNotice,
} from "./carry-forward";
import {
  buildSadhanaAnalytics,
  type SadhanaAnalyticsSummary,
} from "./analytics";
import {
  computeCurrentStreak,
  computeLongestStreak,
  computePersonalDashboardMetrics,
  getLocalDateString,
  type ChantingSessionSummary,
  type PersonalDashboardMetrics,
} from "./stats";

export type { PersonalDashboardMetrics, ChantingSessionSummary };

export interface UserProfileRecord {
  id: string;
  display_name: string;
  avatar_url?: string | null;
  timezone: string;
  preferred_language: string;
  created_at: string;
  updated_at: string;
}

export interface UserPreferencesRecord {
  user_id: string;
  daily_round_target: number;
  carry_forward_policy: "automatic" | "optional" | "fresh_daily" | "custom";
  custom_carry_rule: Record<string, unknown>;
  default_counting_method: "manual" | "japa_mala";
  tactile_feedback_enabled: boolean;
  sound_feedback_enabled: boolean;
  public_profile_enabled: boolean;
  default_room_share_mode: "full" | "completion_only" | "private";
  share_streak_in_rooms: boolean;
  preferred_mantra_id?: string | null;
  ambient_mode_enabled?: boolean;
  ambient_sound_enabled?: boolean;
  ambient_sound_volume?: number;
  pace_guidance_enabled?: boolean;
  pace_seconds_per_bead?: number;
  created_at: string;
  updated_at: string;
}

export type OnboardingContextResult =
  | { status: "unauthenticated" }
  | { status: "schema_not_ready"; userEmail: string | null; detail: string }
  | { status: "error"; userEmail: string | null; message: string }
  | {
    status: "ready";
    userEmail: string | null;
    profile: UserProfileRecord;
    preferences: UserPreferencesRecord;
    alreadyCompleted: boolean;
  };

export type SadhanaLoadResult =
  | { status: "unauthenticated" }
  | { status: "needs_onboarding"; userEmail: string | null; displayName: string }
  | { status: "schema_not_ready"; userEmail: string | null; detail: string }
  | { status: "error"; userEmail: string | null; message: string }
  | {
    status: "ready";
    userEmail: string | null;
    profile: UserProfileRecord;
    preferences: UserPreferencesRecord;
    metrics: PersonalDashboardMetrics;
    recentSessions: ChantingSessionSummary[];
    activeSession: ChantingSessionRecord | null;
    carryForwardLedger: CarryForwardLedgerEntry[];
    pendingOptionalOffer: PendingOptionalCarryOffer | null;
    unappliedPendingNotice: UnappliedPendingNotice | null;
    sankalpas: SankalpaRecord[];
    activeSankalpa: SankalpaRecord | null;
  };

export type ChantWorkspaceLoadResult =
  | { status: "unauthenticated" }
  | { status: "needs_onboarding" }
  | { status: "schema_not_ready"; userEmail: string | null; detail: string }
  | { status: "error"; userEmail: string | null; message: string }
  | { status: "ready"; data: ChantWorkspacePayload };

export interface SadhanaDayDetailPayload {
  date: string;
  hasRecord: boolean;
  dailySadhana: DailySadhana | null;
  sessions: ChantingSessionRecord[];
  records: ChantingRoundRecord[];
  ledgerEntry: CarryForwardLedgerEntry | null;
}

export type AnalyticsLoadResult =
  | { status: "unauthenticated" }
  | { status: "needs_onboarding" }
  | { status: "schema_not_ready"; userEmail: string | null; detail: string }
  | { status: "error"; userEmail: string | null; message: string }
  | {
    status: "ready";
    userEmail: string | null;
    displayName: string;
    avatarUrl?: string | null;
    timezone: string;
    analytics: SadhanaAnalyticsSummary;
    activeSankalpa: SankalpaRecord | null;
    allSankalpas?: SankalpaRecord[];
    recentSessions?: ChantingSessionRecord[];
    initialDayDetail: SadhanaDayDetailPayload;
  };

export function isMissingSchemaError(
  err: { code?: string; message?: string } | null
): boolean {
  if (!err) return false;
  const code = err.code ?? "";
  const msg = (err.message ?? "").toLowerCase();
  return (
    code === "PGRST205" ||
    code === "PGRST202" ||
    code === "42P01" ||
    code === "42883" ||
    code === "42703" ||
    msg.includes("could not find the table") ||
    msg.includes("could not find the function") ||
    msg.includes("does not exist")
  );
}

/**
 * Determines whether a user has saved their initial onboarding preferences
 * without adding extra migration columns beyond Phase 1.
 */
export function hasCompletedOnboarding(
  preferences: Pick<UserPreferencesRecord, "created_at" | "updated_at">,
  recordedDayCount: number
): boolean {
  if (recordedDayCount > 0) return true;
  const createdMs = Date.parse(preferences.created_at);
  const updatedMs = Date.parse(preferences.updated_at);
  return Number.isFinite(createdMs) && Number.isFinite(updatedMs) && updatedMs > createdMs;
}

export async function loadOnboardingContext(): Promise<OnboardingContextResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" };
  }

  const [profileRes, prefRes, countRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, timezone, preferred_language, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select(
        "user_id, daily_round_target, carry_forward_policy, custom_carry_rule, default_counting_method, tactile_feedback_enabled, sound_feedback_enabled, public_profile_enabled, default_room_share_mode, share_streak_in_rooms, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_sadhana")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id),
  ]);

  if (profileRes.error || prefRes.error || countRes.error) {
    const err = profileRes.error ?? prefRes.error ?? countRes.error;
    if (isMissingSchemaError(err)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: err?.message ?? "Schema not initialized.",
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: err?.message ?? "Unable to load onboarding profile.",
    };
  }

  if (!profileRes.data || !prefRes.data) {
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: "Your profile records have not been initialized yet.",
    };
  }

  const profile = profileRes.data as UserProfileRecord;
  const preferences = prefRes.data as UserPreferencesRecord;

  return {
    status: "ready",
    userEmail: user.email ?? null,
    profile,
    preferences,
    alreadyCompleted: hasCompletedOnboarding(preferences, countRes.count ?? 0),
  };
}

/**
 * Loads authenticated user's profile, preferences, today's Sadhana row,
 * consistency history, and recent sessions strictly via RLS-enforced queries.
 */
export async function loadPersonalSadhanaDashboard(): Promise<SadhanaLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" };
  }

  const [profileRes, prefRes, historyRes, sessionsRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, timezone, preferred_language, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select(
        "user_id, daily_round_target, carry_forward_policy, custom_carry_rule, default_counting_method, tactile_feedback_enabled, sound_feedback_enabled, public_profile_enabled, default_room_share_mode, share_streak_in_rooms, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_sadhana")
      .select(
        "id, user_id, sadhana_date, timezone_snapshot, original_daily_target, previous_pending_balance, effective_daily_target, completed_rounds, remaining_balance, extra_rounds, policy_applied, carry_forward_accepted, has_activity"
      )
      .eq("user_id", user.id)
      .order("sadhana_date", { ascending: false }),
    supabase
      .from("chanting_sessions")
      .select(
        "id, sadhana_date, method, status, current_bead_count, rounds_completed, started_at, last_activity_at"
      )
      .eq("user_id", user.id)
      .order("last_activity_at", { ascending: false })
      .limit(5),
  ]);

  const queryErr =
    profileRes.error ?? prefRes.error ?? historyRes.error ?? sessionsRes.error;

  if (queryErr) {
    if (isMissingSchemaError(queryErr)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: queryErr.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: queryErr.message,
    };
  }

  if (!profileRes.data || !prefRes.data) {
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: "Your profile and preference records have not been initialized yet.",
    };
  }

  const profile = profileRes.data as UserProfileRecord;
  const preferences = prefRes.data as UserPreferencesRecord;

  const history: DailySadhana[] = [];
  for (const row of historyRes.data ?? []) {
    const parsed = dailySadhanaSchema.safeParse(row);
    if (parsed.success) {
      history.push(parsed.data);
    }
  }

  if (!hasCompletedOnboarding(preferences, history.length)) {
    return {
      status: "needs_onboarding",
      userEmail: user.email ?? null,
      displayName: profile.display_name,
    };
  }

  const todayDate = getLocalDateString(profile.timezone);

  // Initialize or fetch today's Sadhana row transactionally in PostgreSQL
  const ensureRes = await supabase.rpc("ensure_my_daily_sadhana", {
    p_target_date: todayDate,
  });

  if (ensureRes.error) {
    if (isMissingSchemaError(ensureRes.error)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: ensureRes.error.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: ensureRes.error.message,
    };
  }

  const parsedToday = dailySadhanaSchema.safeParse(ensureRes.data);
  if (!parsedToday.success) {
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: "Daily Sadhana payload did not match expected schema.",
    };
  }

  const recentSessions = (sessionsRes.data ?? []) as ChantingSessionSummary[];
  const [activeSessionRes, ledgerRes, sankalpasRes] = await Promise.all([
    supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("carry_forward_ledger")
      .select(
        "id, from_date, to_date, policy_applied, source_remaining_balance, carried_amount, notes, created_at"
      )
      .eq("user_id", user.id)
      .order("to_date", { ascending: false })
      .limit(14),
    supabase
      .from("sankalpas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const carryForwardLedger = (ledgerRes.data ?? []) as CarryForwardLedgerEntry[];
  const sankalpas = (sankalpasRes.data ?? []) as SankalpaRecord[];
  const activeSankalpa = sankalpas.find((s) => s.status === "active") ?? null;

  const pendingOptionalOffer = getPendingOptionalCarryOffer({
    todayDate,
    policyApplied: parsedToday.data.policy_applied,
    carryForwardAccepted: parsedToday.data.carry_forward_accepted,
    ledger: carryForwardLedger,
  });
  const unappliedPendingNotice = getUnappliedPendingNotice({
    todayDate,
    ledger: carryForwardLedger,
  });

  const metrics = computePersonalDashboardMetrics({
    today: parsedToday.data,
    history,
    todayDate,
  });

  return {
    status: "ready",
    userEmail: user.email ?? null,
    profile,
    preferences,
    metrics,
    recentSessions,
    activeSession: (activeSessionRes.data as ChantingSessionRecord | null) ?? null,
    carryForwardLedger,
    pendingOptionalOffer,
    unappliedPendingNotice,
    sankalpas,
    activeSankalpa,
  };
}

/**
 * Loads authenticated chanting workspace state: today's Sadhana row,
 * recoverable active/paused session, today's sessions, and non-reverted round records.
 */
export async function loadChantWorkspaceData(): Promise<ChantWorkspaceLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" };
  }

  const [profileRes, prefRes, countRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, timezone, preferred_language, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select(
        "user_id, daily_round_target, carry_forward_policy, custom_carry_rule, default_counting_method, tactile_feedback_enabled, sound_feedback_enabled, public_profile_enabled, default_room_share_mode, share_streak_in_rooms, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_sadhana")
      .select("sadhana_date, completed_rounds, effective_daily_target")
      .eq("user_id", user.id)
      .order("sadhana_date", { ascending: true }),
  ]);

  const initErr = profileRes.error ?? prefRes.error ?? countRes.error;
  if (initErr) {
    if (isMissingSchemaError(initErr)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: initErr.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: initErr.message,
    };
  }

  if (!profileRes.data || !prefRes.data) {
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: "Your profile and preference records have not been initialized yet.",
    };
  }

  const profile = profileRes.data as UserProfileRecord;
  const preferences = prefRes.data as UserPreferencesRecord;
  const historyCount = countRes.data?.length ?? 0;

  if (!hasCompletedOnboarding(preferences, historyCount)) {
    return { status: "needs_onboarding" };
  }

  const todayDate = getLocalDateString(profile.timezone);
  const ensureRes = await supabase.rpc("ensure_my_daily_sadhana", {
    p_target_date: todayDate,
  });

  if (ensureRes.error) {
    if (isMissingSchemaError(ensureRes.error)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: ensureRes.error.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: ensureRes.error.message,
    };
  }

  const parsedToday = dailySadhanaSchema.safeParse(ensureRes.data);
  if (!parsedToday.success) {
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: "Daily Sadhana payload did not match expected schema.",
    };
  }

  const [
    recoverableRes,
    todaySessionsRes,
    todayRecordsRes,
    ledgerRes,
    sankalpaRes,
    mantrasRes,
    remindersRes,
    notesRes,
    mantraRoundsRes,
    manualStateRes,
    manualEntriesRes,
  ] = await Promise.all([
    supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at, mantra_id"
      )
      .eq("user_id", user.id)
      .in("status", ["active", "paused"])
      .order("last_activity_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at, mantra_id"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", todayDate)
      .order("started_at", { ascending: false })
      .limit(10),
    supabase
      .from("chanting_records")
      .select(
        "id, user_id, session_id, sadhana_date, method, round_delta, idempotency_key, recorded_at, client_recorded_at, timezone_snapshot, is_reverted, mantra_id, sankalpa_id, sync_status"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", todayDate)
      .eq("is_reverted", false)
      .order("recorded_at", { ascending: false })
      .limit(25),
    supabase
      .from("carry_forward_ledger")
      .select(
        "id, from_date, to_date, policy_applied, source_remaining_balance, carried_amount, notes, created_at"
      )
      .eq("user_id", user.id)
      .eq("to_date", todayDate)
      .limit(1),
    supabase
      .from("sankalpas")
      .select("*")
      .eq("user_id", user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("mantras")
      .select("*")
      .or(`is_system.eq.true,user_id.eq.${user.id}`)
      .order("is_system", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("chanting_reminders")
      .select("*")
      .eq("user_id", user.id)
      .order("time_of_day", { ascending: true }),
    supabase
      .from("chanting_session_notes")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20),
    supabase
      .from("chanting_records")
      .select("mantra_id, round_delta")
      .eq("user_id", user.id)
      .eq("is_reverted", false),
    supabase
      .from("manual_counter_state")
      .select("cumulative_names, cumulative_rounds, current_remainder, last_entry_at")
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("manual_name_entries")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_reverted", false)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  const rawRecords = ((todayRecordsRes.data ?? []) as ChantingRoundRecord[]).map(
    (r) => ({
      ...r,
      sankalpa_id: (r as { sankalpa_id?: string | null }).sankalpa_id ?? null,
      mantra_id: (r as { mantra_id?: string | null }).mantra_id ?? null,
      sync_status: ((r as { sync_status?: "synced" | "offline_pending" })
        .sync_status ?? "synced") as "synced" | "offline_pending",
    })
  );

  const workspaceErr =
    recoverableRes.error ??
    todaySessionsRes.error ??
    todayRecordsRes.error ??
    ledgerRes.error;
  if (workspaceErr) {
    if (isMissingSchemaError(workspaceErr)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: workspaceErr.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: workspaceErr.message,
    };
  }

  const todayLedger = (ledgerRes.data ?? []) as CarryForwardLedgerEntry[];
  const pendingOptionalOffer = getPendingOptionalCarryOffer({
    todayDate,
    policyApplied: parsedToday.data.policy_applied,
    carryForwardAccepted: parsedToday.data.carry_forward_accepted,
    ledger: todayLedger,
  });

  const mantrasList = (mantrasRes.data ?? []) as MantraRecord[];
  const roundTotalsByMantra = new Map<string | null, number>();
  for (const r of (mantraRoundsRes.data ?? []) as {
    mantra_id?: string | null;
    round_delta?: number;
  }[]) {
    const mId = r.mantra_id ?? null;
    roundTotalsByMantra.set(
      mId,
      (roundTotalsByMantra.get(mId) ?? 0) + (r.round_delta ?? 1)
    );
  }

  const mantraStats: MantraHistoricalStat[] = [];
  for (const m of mantrasList) {
    mantraStats.push({
      mantraId: m.id,
      mantraName: m.name,
      completedRounds: roundTotalsByMantra.get(m.id) ?? 0,
      totalSessions: 0,
    });
  }
  const untaggedRounds = roundTotalsByMantra.get(null) ?? 0;
  if (untaggedRounds > 0) {
    mantraStats.push({
      mantraId: null,
      mantraName: "General / Legacy (Hare Krishna Mahāmantra)",
      completedRounds: untaggedRounds,
      totalSessions: 0,
    });
  }

  const activeMantraId =
    (recoverableRes.data as ChantingSessionRecord | null)?.mantra_id ??
    preferences.preferred_mantra_id ??
    "00000000-0000-0000-0000-000000000001";

  const activeMantra =
    mantrasList.find((m) => m.id === activeMantraId) ??
    mantrasList[0] ??
    null;

  const historyRows = (countRes.data ?? []) as Pick<
    DailySadhana,
    "sadhana_date" | "completed_rounds" | "effective_daily_target"
  >[];
  const allHistory = [...historyRows];
  if (!allHistory.some((r) => r.sadhana_date === todayDate)) {
    allHistory.push(parsedToday.data);
  }
  const currentStreak = computeCurrentStreak(allHistory, todayDate);
  const longestStreak = computeLongestStreak(allHistory);
  const lifetimeRounds = allHistory.reduce((sum, r) => sum + r.completed_rounds, 0);

  return {
    status: "ready",
    data: {
      userId: user.id,
      userEmail: user.email ?? null,
      displayName: profile.display_name,
      avatarUrl: profile.avatar_url ?? null,
      timezone: profile.timezone,
      preferences: {
        dailyRoundTarget: preferences.daily_round_target,
        defaultCountingMethod: preferences.default_counting_method,
        tactileFeedbackEnabled: preferences.tactile_feedback_enabled,
        soundFeedbackEnabled: preferences.sound_feedback_enabled,
        carryForwardPolicy: preferences.carry_forward_policy,
        preferredMantraId: preferences.preferred_mantra_id ?? null,
        ambientModeEnabled: Boolean(preferences.ambient_mode_enabled ?? false),
        ambientSoundEnabled: Boolean(preferences.ambient_sound_enabled ?? false),
        ambientSoundVolume: Number(preferences.ambient_sound_volume ?? 0.5),
        paceGuidanceEnabled: Boolean(preferences.pace_guidance_enabled ?? false),
        paceSecondsPerBead: Number(preferences.pace_seconds_per_bead ?? 7.0),
      },
      dailySadhana: parsedToday.data,
      pendingOptionalOffer,
      recoverableSession:
        (recoverableRes.data as ChantingSessionRecord | null) ?? null,
      todaySessions: (todaySessionsRes.data ?? []) as ChantingSessionRecord[],
      todayRecords: (rawRecords ?? todayRecordsRes.data ?? []) as ChantingRoundRecord[],
      activeSankalpa: (sankalpaRes?.data as SankalpaRecord | null) ?? null,
      mantras: mantrasList,
      activeMantra,
      mantraStats,
      reminders: (remindersRes.data ?? []) as ChantingReminderRecord[],
      recentNotes: (notesRes.data ?? []) as SessionNoteRecord[],
      currentStreak,
      longestStreak,
      lifetimeRounds,
      manualCounterState: manualStateRes?.data
        ? {
          cumulative_names: Number(manualStateRes.data.cumulative_names ?? 0),
          cumulative_rounds: Number(manualStateRes.data.cumulative_rounds ?? 0),
          current_remainder: Number(manualStateRes.data.current_remainder ?? 0),
          last_entry: null,
          active_session: null,
        }
        : {
          cumulative_names: 0,
          cumulative_rounds: 0,
          current_remainder: 0,
          last_entry: null,
          active_session: null,
        },
      manualEntries: (manualEntriesRes?.data ?? []) as any[],
    },
  };
}

/**
 * Loads full historical Sadhana rows for annual consistency heatmap & analytics,
 * plus initial detail for todayDate.
 */
export async function loadSadhanaAnalyticsData(
  selectedYear?: number,
  selectedMonth?: number
): Promise<AnalyticsLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" };
  }

  const [profileRes, prefRes, historyRes, sankalpasRes, sessionsHistoryRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, timezone, preferred_language, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select(
        "user_id, daily_round_target, carry_forward_policy, custom_carry_rule, default_counting_method, tactile_feedback_enabled, sound_feedback_enabled, public_profile_enabled, default_room_share_mode, share_streak_in_rooms, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_sadhana")
      .select(
        "id, user_id, sadhana_date, timezone_snapshot, original_daily_target, previous_pending_balance, effective_daily_target, completed_rounds, remaining_balance, extra_rounds, policy_applied, carry_forward_accepted, has_activity"
      )
      .eq("user_id", user.id)
      .order("sadhana_date", { ascending: true }),
    supabase
      .from("sankalpas")
      .select(
        "id, user_id, title, description, target_rounds, completed_rounds, start_date, end_date, status, completed_at, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at"
      )
      .eq("user_id", user.id)
      .gt("rounds_completed", 0)
      .order("started_at", { ascending: false })
      .limit(300),
  ]);

  const err = profileRes.error ?? prefRes.error ?? historyRes.error;
  if (err) {
    if (isMissingSchemaError(err)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: err.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: err.message,
    };
  }

  if (!profileRes.data || !prefRes.data) {
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: "Your profile and preference records have not been initialized yet.",
    };
  }

  const profile = profileRes.data as UserProfileRecord;
  const preferences = prefRes.data as UserPreferencesRecord;

  const history: DailySadhana[] = [];
  for (const row of historyRes.data ?? []) {
    const parsed = dailySadhanaSchema.safeParse(row);
    if (parsed.success) history.push(parsed.data);
  }

  if (!hasCompletedOnboarding(preferences, history.length)) {
    return { status: "needs_onboarding" };
  }

  const todayDate = getLocalDateString(profile.timezone);
  const ensureRes = await supabase.rpc("ensure_my_daily_sadhana", {
    p_target_date: todayDate,
  });

  if (ensureRes.error) {
    if (isMissingSchemaError(ensureRes.error)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: ensureRes.error.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: ensureRes.error.message,
    };
  }

  const parsedToday = dailySadhanaSchema.safeParse(ensureRes.data);
  if (parsedToday.success && !history.some((r) => r.sadhana_date === todayDate)) {
    history.push(parsedToday.data);
  }

  const analytics = buildSadhanaAnalytics({
    rows: history,
    todayDate,
    selectedYear,
    selectedMonth,
  });

  const [todaySessionsRes, todayRecordsRes, todayLedgerRes] = await Promise.all([
    supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", todayDate)
      .order("started_at", { ascending: false }),
    supabase
      .from("chanting_records")
      .select(
        "id, user_id, session_id, sadhana_date, method, round_delta, idempotency_key, recorded_at, client_recorded_at, timezone_snapshot, is_reverted"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", todayDate)
      .eq("is_reverted", false)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("carry_forward_ledger")
      .select(
        "id, from_date, to_date, policy_applied, source_remaining_balance, carried_amount, notes, created_at"
      )
      .eq("user_id", user.id)
      .eq("to_date", todayDate)
      .maybeSingle(),
  ]);

  const initialDayDetail: SadhanaDayDetailPayload = {
    date: todayDate,
    hasRecord: parsedToday.success,
    dailySadhana: parsedToday.success ? parsedToday.data : null,
    sessions: (todaySessionsRes.data ?? []) as ChantingSessionRecord[],
    records: (todayRecordsRes.data ?? []) as ChantingRoundRecord[],
    ledgerEntry: (todayLedgerRes.data as CarryForwardLedgerEntry | null) ?? null,
  };

  const allSankalpas = (sankalpasRes.data ?? []) as SankalpaRecord[];
  const activeSankalpa = allSankalpas.find((s) => s.status === "active") ?? null;
  const recentSessions = (sessionsHistoryRes.data ?? []) as ChantingSessionRecord[];

  return {
    status: "ready",
    userEmail: user.email ?? null,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url ?? null,
    timezone: profile.timezone,
    analytics,
    activeSankalpa,
    allSankalpas,
    recentSessions,
    initialDayDetail,
  };
}

export type DrstiDashboardLoadResult =
  | {
    status: "ready";
    userEmail: string | null;
    displayName: string;
    avatarUrl?: string | null;
    timezone: string;
    todayDate: string;
    todaySadhana: DailySadhana;
    metrics: PersonalDashboardMetrics;
    analytics: SadhanaAnalyticsSummary;
    activeSankalpa: SankalpaRecord | null;
    sankalpas: SankalpaRecord[];
    initialDayDetail: SadhanaDayDetailPayload;
  }
  | { status: "unauthenticated" }
  | {
    status: "needs_onboarding";
    userEmail: string | null;
    displayName: string;
  }
  | {
    status: "schema_not_ready";
    userEmail: string | null;
    detail: string;
  }
  | {
    status: "error";
    userEmail: string | null;
    message: string;
  };

/**
 * Loads comprehensive, authoritative data for the DṚṢṬI Personal Spiritual Progress Dashboard:
 * profile, preferences, daily sadhana history, Sankalpa portfolio, today's guaranteed row,
 * metrics, analytics (heatmap & trends), and initial day detail.
 */
export async function loadDrstiDashboardData(
  selectedYear?: number,
  selectedMonth?: number
): Promise<DrstiDashboardLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" };
  }

  const [profileRes, prefRes, historyRes, sankalpasRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, avatar_url, timezone, preferred_language, created_at, updated_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("user_preferences")
      .select(
        "user_id, daily_round_target, carry_forward_policy, custom_carry_rule, default_counting_method, tactile_feedback_enabled, sound_feedback_enabled, public_profile_enabled, default_room_share_mode, share_streak_in_rooms, created_at, updated_at"
      )
      .eq("user_id", user.id)
      .maybeSingle(),
    supabase
      .from("daily_sadhana")
      .select(
        "id, user_id, sadhana_date, timezone_snapshot, original_daily_target, previous_pending_balance, effective_daily_target, completed_rounds, remaining_balance, extra_rounds, policy_applied, carry_forward_accepted, has_activity"
      )
      .eq("user_id", user.id)
      .order("sadhana_date", { ascending: true }),
    supabase
      .from("sankalpas")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false }),
  ]);

  const err =
    profileRes.error ?? prefRes.error ?? historyRes.error ?? sankalpasRes.error;
  if (err) {
    if (isMissingSchemaError(err)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: err.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: err.message,
    };
  }

  if (!profileRes.data || !prefRes.data) {
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: "Your profile and preference records have not been initialized yet.",
    };
  }

  const profile = profileRes.data as UserProfileRecord;
  const preferences = prefRes.data as UserPreferencesRecord;

  const history: DailySadhana[] = [];
  for (const row of historyRes.data ?? []) {
    const parsed = dailySadhanaSchema.safeParse(row);
    if (parsed.success) history.push(parsed.data);
  }

  if (!hasCompletedOnboarding(preferences, history.length)) {
    return {
      status: "needs_onboarding",
      userEmail: user.email ?? null,
      displayName: profile.display_name,
    };
  }

  const todayDate = getLocalDateString(profile.timezone);
  const ensureRes = await supabase.rpc("ensure_my_daily_sadhana", {
    p_target_date: todayDate,
  });

  if (ensureRes.error) {
    if (isMissingSchemaError(ensureRes.error)) {
      return {
        status: "schema_not_ready",
        userEmail: user.email ?? null,
        detail: ensureRes.error.message,
      };
    }
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: ensureRes.error.message,
    };
  }

  const parsedToday = dailySadhanaSchema.safeParse(ensureRes.data);
  if (!parsedToday.success) {
    return {
      status: "error",
      userEmail: user.email ?? null,
      message: "Daily Sadhana payload did not match expected schema.",
    };
  }

  if (!history.some((r) => r.sadhana_date === todayDate)) {
    history.push(parsedToday.data);
  }

  const sankalpas = (sankalpasRes.data ?? []) as SankalpaRecord[];
  const activeSankalpa = sankalpas.find((s) => s.status === "active") ?? null;

  const metrics = computePersonalDashboardMetrics({
    today: parsedToday.data,
    history,
    todayDate,
  });

  const analytics = buildSadhanaAnalytics({
    rows: history,
    todayDate,
    selectedYear,
    selectedMonth,
  });

  const [todaySessionsRes, todayRecordsRes, todayLedgerRes] = await Promise.all([
    supabase
      .from("chanting_sessions")
      .select(
        "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", todayDate)
      .order("started_at", { ascending: false }),
    supabase
      .from("chanting_records")
      .select(
        "id, user_id, session_id, sadhana_date, method, round_delta, idempotency_key, recorded_at, client_recorded_at, timezone_snapshot, is_reverted"
      )
      .eq("user_id", user.id)
      .eq("sadhana_date", todayDate)
      .eq("is_reverted", false)
      .order("recorded_at", { ascending: false }),
    supabase
      .from("carry_forward_ledger")
      .select(
        "id, from_date, to_date, policy_applied, source_remaining_balance, carried_amount, notes, created_at"
      )
      .eq("user_id", user.id)
      .eq("to_date", todayDate)
      .maybeSingle(),
  ]);

  const initialDayDetail: SadhanaDayDetailPayload = {
    date: todayDate,
    hasRecord: true,
    dailySadhana: parsedToday.data,
    sessions: (todaySessionsRes.data ?? []) as ChantingSessionRecord[],
    records: (todayRecordsRes.data ?? []) as ChantingRoundRecord[],
    ledgerEntry: (todayLedgerRes.data as CarryForwardLedgerEntry | null) ?? null,
  };

  return {
    status: "ready",
    userEmail: user.email ?? null,
    displayName: profile.display_name,
    avatarUrl: profile.avatar_url ?? null,
    timezone: profile.timezone,
    todayDate,
    todaySadhana: parsedToday.data,
    metrics,
    analytics,
    activeSankalpa,
    sankalpas,
    initialDayDetail,
  };
}
