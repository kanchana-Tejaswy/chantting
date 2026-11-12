import { createClient } from "@/lib/supabase/server";
import { dailySadhanaSchema, type DailySadhana } from "@/lib/domain/sadhana";
import type {
  ChantingRoundRecord,
  ChantingSessionRecord,
  ChantWorkspacePayload,
} from "@/lib/chant/types";
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
  computePersonalDashboardMetrics,
  getLocalDateString,
  type ChantingSessionSummary,
  type PersonalDashboardMetrics,
} from "./stats";

export interface UserProfileRecord {
  id: string;
  display_name: string;
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
      timezone: string;
      analytics: SadhanaAnalyticsSummary;
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
      .select("id, display_name, timezone, preferred_language, created_at, updated_at")
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
      .select("id, display_name, timezone, preferred_language, created_at, updated_at")
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
  const [activeSessionRes, ledgerRes] = await Promise.all([
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
  ]);

  const carryForwardLedger = (ledgerRes.data ?? []) as CarryForwardLedgerEntry[];
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
      .select("id, display_name, timezone, preferred_language, created_at, updated_at")
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

  if (!hasCompletedOnboarding(preferences, countRes.count ?? 0)) {
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

  const [recoverableRes, todaySessionsRes, todayRecordsRes, ledgerRes] =
    await Promise.all([
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
        .from("chanting_sessions")
        .select(
          "id, user_id, sadhana_date, method, status, current_bead_count, rounds_completed, client_session_key, started_at, last_activity_at, paused_at, ended_at"
        )
        .eq("user_id", user.id)
        .eq("sadhana_date", todayDate)
        .order("started_at", { ascending: false })
        .limit(10),
      supabase
        .from("chanting_records")
        .select(
          "id, user_id, session_id, sadhana_date, method, round_delta, idempotency_key, recorded_at, client_recorded_at, timezone_snapshot, is_reverted"
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
    ]);

  const workspaceErr =
    recoverableRes.error ??
    todaySessionsRes.error ??
    todayRecordsRes.error ??
    ledgerRes.error;
  if (workspaceErr) {
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

  return {
    status: "ready",
    data: {
      userId: user.id,
      userEmail: user.email ?? null,
      displayName: profile.display_name,
      timezone: profile.timezone,
      preferences: {
        dailyRoundTarget: preferences.daily_round_target,
        defaultCountingMethod: preferences.default_counting_method,
        tactileFeedbackEnabled: preferences.tactile_feedback_enabled,
        soundFeedbackEnabled: preferences.sound_feedback_enabled,
        carryForwardPolicy: preferences.carry_forward_policy,
      },
      dailySadhana: parsedToday.data,
      pendingOptionalOffer,
      recoverableSession:
        (recoverableRes.data as ChantingSessionRecord | null) ?? null,
      todaySessions: (todaySessionsRes.data ?? []) as ChantingSessionRecord[],
      todayRecords: (todayRecordsRes.data ?? []) as ChantingRoundRecord[],
    },
  };
}

/**
 * Loads full historical Sadhana rows for annual consistency heatmap & analytics,
 * plus initial detail for todayDate.
 */
export async function loadSadhanaAnalyticsData(
  selectedYear?: number
): Promise<AnalyticsLoadResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { status: "unauthenticated" };
  }

  const [profileRes, prefRes, historyRes] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, timezone, preferred_language, created_at, updated_at")
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

  return {
    status: "ready",
    userEmail: user.email ?? null,
    displayName: profile.display_name,
    timezone: profile.timezone,
    analytics,
    initialDayDetail,
  };
}
