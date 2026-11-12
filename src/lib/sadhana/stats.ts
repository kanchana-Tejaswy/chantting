import type { DailySadhana } from "@/lib/domain/sadhana";

export interface ChantingSessionSummary {
  id: string;
  sadhana_date: string;
  method: "manual" | "japa_mala";
  status: "active" | "paused" | "completed" | "abandoned";
  current_bead_count: number;
  rounds_completed: number;
  started_at: string;
  last_activity_at: string;
}

export interface HistoricalDaySummary {
  date: string;
  completedRounds: number;
  effectiveTarget: number;
  originalTarget: number;
  pendingBalance: number;
  targetMet: boolean;
  hasActivity: boolean;
}

export interface PersonalDashboardMetrics {
  todayDate: string;
  todayPolicyApplied: "automatic" | "optional" | "fresh_daily" | "custom";
  originalTarget: number;
  carriedForwardBalance: number;
  effectiveTarget: number;
  completedRounds: number;
  pendingRounds: number;
  extraRounds: number;
  completionPercentage: number;
  currentStreak: number;
  lifetimeRounds: number;
  recordedDays: number;
  targetMetDays: number;
  consistencyRatePct: number;
  averageDailyRounds: number;
  recentDays: HistoricalDaySummary[];
}

/**
 * Returns YYYY-MM-DD in the supplied IANA timezone.
 */
export function getLocalDateString(
  timezone: string,
  date: Date = new Date()
): string {
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  } catch {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "UTC",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(date);
  }
}

/**
 * Shifts a YYYY-MM-DD date string by deltaDays using UTC calendar arithmetic.
 */
export function shiftIsoDate(isoDate: string, deltaDays: number): string {
  const [y, m, d] = isoDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d!));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return dt.toISOString().slice(0, 10);
}

/**
 * Computes consecutive days meeting effective_daily_target ending on todayDate
 * (or ending yesterday when today's chanting is still in progress).
 */
export function computeCurrentStreak(
  rows: Pick<
    DailySadhana,
    "sadhana_date" | "completed_rounds" | "effective_daily_target"
  >[],
  todayDate: string
): number {
  const byDate = new Map<
    string,
    Pick<DailySadhana, "completed_rounds" | "effective_daily_target">
  >();
  for (const row of rows) {
    byDate.set(row.sadhana_date, row);
  }

  const todayRow = byDate.get(todayDate);
  const todayMet =
    Boolean(todayRow) &&
    todayRow!.completed_rounds >= todayRow!.effective_daily_target;

  let cursor = todayMet ? todayDate : shiftIsoDate(todayDate, -1);
  let streak = 0;

  while (true) {
    const entry = byDate.get(cursor);
    if (!entry || entry.completed_rounds < entry.effective_daily_target) {
      break;
    }
    streak += 1;
    cursor = shiftIsoDate(cursor, -1);
  }

  return streak;
}

/**
 * Aggregates Module A personal dashboard metrics strictly from recorded Sadhana rows.
 */
export function computePersonalDashboardMetrics(params: {
  today: DailySadhana;
  history: DailySadhana[];
  todayDate: string;
}): PersonalDashboardMetrics {
  const { today, history, todayDate } = params;

  const mapByDate = new Map<string, DailySadhana>();
  for (const row of history) {
    mapByDate.set(row.sadhana_date, row);
  }
  mapByDate.set(today.sadhana_date, today);

  const sortedRows = Array.from(mapByDate.values()).sort((a, b) =>
    b.sadhana_date.localeCompare(a.sadhana_date)
  );

  const lifetimeRounds = sortedRows.reduce(
    (sum, r) => sum + r.completed_rounds,
    0
  );
  const recordedDays = sortedRows.length;
  const targetMetDays = sortedRows.filter(
    (r) => r.completed_rounds >= r.effective_daily_target
  ).length;

  const consistencyRatePct =
    recordedDays > 0 ? Math.round((targetMetDays / recordedDays) * 100) : 0;

  const averageDailyRounds =
    recordedDays > 0
      ? Number((lifetimeRounds / recordedDays).toFixed(1))
      : 0;

  const completionPercentage = Math.min(
    100,
    Math.round(
      (today.completed_rounds / Math.max(1, today.effective_daily_target)) * 100
    )
  );

  const currentStreak = computeCurrentStreak(sortedRows, todayDate);

  const recentDays: HistoricalDaySummary[] = sortedRows
    .slice(0, 7)
    .map((row) => ({
      date: row.sadhana_date,
      completedRounds: row.completed_rounds,
      effectiveTarget: row.effective_daily_target,
      originalTarget: row.original_daily_target,
      pendingBalance: row.previous_pending_balance,
      targetMet: row.completed_rounds >= row.effective_daily_target,
      hasActivity: row.has_activity,
    }));

  return {
    todayDate,
    todayPolicyApplied: today.policy_applied,
    originalTarget: today.original_daily_target,
    carriedForwardBalance: today.previous_pending_balance,
    effectiveTarget: today.effective_daily_target,
    completedRounds: today.completed_rounds,
    pendingRounds: today.remaining_balance,
    extraRounds: today.extra_rounds,
    completionPercentage,
    currentStreak,
    lifetimeRounds,
    recordedDays,
    targetMetDays,
    consistencyRatePct,
    averageDailyRounds,
    recentDays,
  };
}

