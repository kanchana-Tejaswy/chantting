import type { DailySadhana } from "@/lib/domain/sadhana";
import { shiftIsoDate } from "./stats";

export type HeatmapCellStatus =
  | "future"
  | "missing_data"
  | "zero_activity"
  | "partial_low"
  | "partial_medium"
  | "partial_high"
  | "target_met";

export interface HeatmapDayCell {
  date: string;
  month: number; // 0..11
  dayOfMonth: number;
  dayOfWeek: number; // 0 (Sun)..6 (Sat)
  status: HeatmapCellStatus;
  hasRecord: boolean;
  completedRounds: number;
  effectiveTarget: number;
  originalTarget: number;
  pendingBalance: number;
  extraRounds: number;
  targetMet: boolean;
}

export interface HeatmapWeekColumn {
  weekIndex: number;
  days: (HeatmapDayCell | null)[]; // length 7 (Sun..Sat)
}

export interface MonthlyStats {
  monthIndex: number; // 0..11
  monthLabel: string;
  recordedDays: number;
  chantingDays: number;
  targetMetDays: number;
  totalRounds: number;
  averageRoundsPerActiveDay: number;
  achievementRatePct: number;
}

export interface YearlyStats {
  year: number;
  recordedDays: number;
  chantingDays: number;
  targetMetDays: number;
  totalRounds: number;
  averageRoundsPerActiveDay: number;
  achievementRatePct: number;
  longestStreakInYear: number;
}

export interface BestPersonalDay {
  date: string;
  completedRounds: number;
  effectiveTarget: number;
}

export interface ConsistencyMilestone {
  code: string;
  title: string;
  description: string;
  category: "consistency" | "practice";
  currentValue: number;
  thresholdValue: number;
  achieved: boolean;
}

export interface SadhanaAnalyticsSummary {
  todayDate: string;
  selectedYear: number;
  availableYears: number[];
  lifetimeRounds: number;
  totalChantingDays: number;
  recordedDays: number;
  targetMetDays: number;
  targetAchievementRatePct: number;
  averageRoundsPerActiveDay: number;
  currentStreak: number;
  longestStreak: number;
  bestPersonalDay: BestPersonalDay | null;
  yearlyStats: YearlyStats;
  monthlyStats: MonthlyStats[];
  weeks: HeatmapWeekColumn[];
  milestones: ConsistencyMilestone[];
}

const MONTH_LABELS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

function classifyDayStatus(params: {
  date: string;
  todayDate: string;
  row: DailySadhana | undefined;
}): HeatmapCellStatus {
  const { date, todayDate, row } = params;
  if (date > todayDate) return "future";
  if (!row) return "missing_data";
  if (row.completed_rounds === 0) return "zero_activity";
  if (row.completed_rounds >= row.effective_daily_target) return "target_met";

  const ratio = row.completed_rounds / Math.max(1, row.effective_daily_target);
  if (ratio >= 0.67) return "partial_high";
  if (ratio >= 0.34) return "partial_medium";
  return "partial_low";
}

function computeLongestStreak(rows: DailySadhana[]): number {
  const metDates = Array.from(
    new Set(
      rows
        .filter((r) => r.completed_rounds >= r.effective_daily_target)
        .map((r) => r.sadhana_date)
    )
  ).sort();

  let best = 0;
  let current = 0;
  let prevDate: string | null = null;

  for (const date of metDates) {
    if (prevDate && shiftIsoDate(prevDate, 1) === date) {
      current += 1;
    } else {
      current = 1;
    }
    if (current > best) best = current;
    prevDate = date;
  }

  return best;
}

function computeCurrentStreakFromMap(
  byDate: Map<string, DailySadhana>,
  todayDate: string
): number {
  const todayRow = byDate.get(todayDate);
  const todayMet =
    Boolean(todayRow) &&
    todayRow!.completed_rounds >= todayRow!.effective_daily_target;

  let cursor = todayMet ? todayDate : shiftIsoDate(todayDate, -1);
  let streak = 0;
  while (true) {
    const row = byDate.get(cursor);
    if (!row || row.completed_rounds < row.effective_daily_target) break;
    streak += 1;
    cursor = shiftIsoDate(cursor, -1);
  }
  return streak;
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

/**
 * Builds annual heatmap grid (Sunday..Saturday columns), monthly & yearly
 * breakdowns, and humble consistency milestones while strictly distinguishing
 * recorded zero-round days from missing/unrecorded days.
 */
export function buildSadhanaAnalytics(params: {
  rows: DailySadhana[];
  todayDate: string;
  selectedYear?: number;
}): SadhanaAnalyticsSummary {
  const { rows, todayDate } = params;
  const currentYear = Number.parseInt(todayDate.slice(0, 4), 10);

  const byDate = new Map<string, DailySadhana>();
  const yearsSet = new Set<number>([currentYear]);
  for (const row of rows) {
    byDate.set(row.sadhana_date, row);
    const yr = Number.parseInt(row.sadhana_date.slice(0, 4), 10);
    if (!Number.isNaN(yr)) yearsSet.add(yr);
  }

  const availableYears = Array.from(yearsSet).sort((a, b) => b - a);
  const selectedYear =
    params.selectedYear &&
    Number.isInteger(params.selectedYear) &&
    params.selectedYear >= 2000 &&
    params.selectedYear <= currentYear
      ? params.selectedYear
      : currentYear;

  const uniqueRows = Array.from(byDate.values()).sort((a, b) =>
    a.sadhana_date.localeCompare(b.sadhana_date)
  );

  // Lifetime metrics
  const lifetimeRounds = uniqueRows.reduce(
    (sum, r) => sum + r.completed_rounds,
    0
  );
  const totalChantingDays = uniqueRows.filter(
    (r) => r.completed_rounds > 0
  ).length;
  const recordedDays = uniqueRows.length;
  const targetMetDays = uniqueRows.filter(
    (r) => r.completed_rounds >= r.effective_daily_target
  ).length;
  const targetAchievementRatePct =
    recordedDays > 0 ? Math.round((targetMetDays / recordedDays) * 100) : 0;
  const averageRoundsPerActiveDay =
    totalChantingDays > 0
      ? Number((lifetimeRounds / totalChantingDays).toFixed(1))
      : 0;

  const currentStreak = computeCurrentStreakFromMap(byDate, todayDate);
  const longestStreak = computeLongestStreak(uniqueRows);

  let bestPersonalDay: BestPersonalDay | null = null;
  for (const row of uniqueRows) {
    if (row.completed_rounds <= 0) continue;
    if (
      !bestPersonalDay ||
      row.completed_rounds > bestPersonalDay.completedRounds ||
      (row.completed_rounds === bestPersonalDay.completedRounds &&
        row.sadhana_date > bestPersonalDay.date)
    ) {
      bestPersonalDay = {
        date: row.sadhana_date,
        completedRounds: row.completed_rounds,
        effectiveTarget: row.effective_daily_target,
      };
    }
  }

  // Monthly & yearly breakdown for selectedYear
  const monthBuckets = Array.from({ length: 12 }, (_, idx) => ({
    monthIndex: idx,
    monthLabel: MONTH_LABELS[idx]!,
    recordedDays: 0,
    chantingDays: 0,
    targetMetDays: 0,
    totalRounds: 0,
  }));

  const yearRows: DailySadhana[] = [];
  for (const row of uniqueRows) {
    if (Number.parseInt(row.sadhana_date.slice(0, 4), 10) !== selectedYear) {
      continue;
    }
    yearRows.push(row);
    const monthIdx = Number.parseInt(row.sadhana_date.slice(5, 7), 10) - 1;
    const bucket = monthBuckets[monthIdx];
    if (!bucket) continue;
    bucket.recordedDays += 1;
    bucket.totalRounds += row.completed_rounds;
    if (row.completed_rounds > 0) bucket.chantingDays += 1;
    if (row.completed_rounds >= row.effective_daily_target) {
      bucket.targetMetDays += 1;
    }
  }

  const monthlyStats: MonthlyStats[] = monthBuckets.map((b) => ({
    monthIndex: b.monthIndex,
    monthLabel: b.monthLabel,
    recordedDays: b.recordedDays,
    chantingDays: b.chantingDays,
    targetMetDays: b.targetMetDays,
    totalRounds: b.totalRounds,
    averageRoundsPerActiveDay:
      b.chantingDays > 0
        ? Number((b.totalRounds / b.chantingDays).toFixed(1))
        : 0,
    achievementRatePct:
      b.recordedDays > 0
        ? Math.round((b.targetMetDays / b.recordedDays) * 100)
        : 0,
  }));

  const yearTotalRounds = yearRows.reduce((s, r) => s + r.completed_rounds, 0);
  const yearChantingDays = yearRows.filter((r) => r.completed_rounds > 0).length;
  const yearRecordedDays = yearRows.length;
  const yearTargetMetDays = yearRows.filter(
    (r) => r.completed_rounds >= r.effective_daily_target
  ).length;

  const yearlyStats: YearlyStats = {
    year: selectedYear,
    recordedDays: yearRecordedDays,
    chantingDays: yearChantingDays,
    targetMetDays: yearTargetMetDays,
    totalRounds: yearTotalRounds,
    averageRoundsPerActiveDay:
      yearChantingDays > 0
        ? Number((yearTotalRounds / yearChantingDays).toFixed(1))
        : 0,
    achievementRatePct:
      yearRecordedDays > 0
        ? Math.round((yearTargetMetDays / yearRecordedDays) * 100)
        : 0,
    longestStreakInYear: computeLongestStreak(yearRows),
  };

  // Build week columns for selectedYear (Jan 1 .. Dec 31)
  const totalDays = daysInYear(selectedYear);
  const jan1 = new Date(Date.UTC(selectedYear, 0, 1));
  const startOffset = jan1.getUTCDay(); // 0=Sun..6=Sat

  const weeks: HeatmapWeekColumn[] = [];
  let currentWeek: (HeatmapDayCell | null)[] = Array(startOffset).fill(null);

  for (let i = 0; i < totalDays; i++) {
    const dt = new Date(Date.UTC(selectedYear, 0, 1 + i));
    const dateStr = dt.toISOString().slice(0, 10);
    const row = byDate.get(dateStr);
    const status = classifyDayStatus({ date: dateStr, todayDate, row });

    const cell: HeatmapDayCell = {
      date: dateStr,
      month: dt.getUTCMonth(),
      dayOfMonth: dt.getUTCDate(),
      dayOfWeek: dt.getUTCDay(),
      status,
      hasRecord: Boolean(row),
      completedRounds: row?.completed_rounds ?? 0,
      effectiveTarget: row?.effective_daily_target ?? 0,
      originalTarget: row?.original_daily_target ?? 0,
      pendingBalance: row?.previous_pending_balance ?? 0,
      extraRounds: row?.extra_rounds ?? 0,
      targetMet: Boolean(
        row && row.completed_rounds >= row.effective_daily_target
      ),
    };

    currentWeek.push(cell);
    if (currentWeek.length === 7) {
      weeks.push({ weekIndex: weeks.length, days: currentWeek });
      currentWeek = [];
    }
  }

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push({ weekIndex: weeks.length, days: currentWeek });
  }

  // Personal consistency milestones (never imply spiritual superiority)
  const milestones: ConsistencyMilestone[] = [
    {
      code: "first_chanting_day",
      title: "First Day Offered",
      description: "Completed at least one round on a recorded day.",
      category: "practice",
      currentValue: totalChantingDays,
      thresholdValue: 1,
      achieved: totalChantingDays >= 1,
    },
    {
      code: "seven_day_rhythm",
      title: "Seven-Day Rhythm",
      description: "Met your personal daily commitment for 7 consecutive days.",
      category: "consistency",
      currentValue: longestStreak,
      thresholdValue: 7,
      achieved: longestStreak >= 7,
    },
    {
      code: "twenty_one_day_steadiness",
      title: "Twenty-One Day Steadiness",
      description: "Sustained your daily commitment across 21 consecutive days.",
      category: "consistency",
      currentValue: longestStreak,
      thresholdValue: 21,
      achieved: longestStreak >= 21,
    },
    {
      code: "thirty_chanting_days",
      title: "Thirty Days of Remembrance",
      description: "Chanted on at least 30 distinct calendar days.",
      category: "consistency",
      currentValue: totalChantingDays,
      thresholdValue: 30,
      achieved: totalChantingDays >= 30,
    },
    {
      code: "one_mala_lifetime",
      title: "108 Rounds Completed",
      description: "Recorded 108 total rounds across your personal journey.",
      category: "practice",
      currentValue: lifetimeRounds,
      thresholdValue: 108,
      achieved: lifetimeRounds >= 108,
    },
    {
      code: "thousand_eight_rounds",
      title: "1,008 Rounds Dedicated",
      description: "Maintained practice through 1,008 cumulative rounds.",
      category: "practice",
      currentValue: lifetimeRounds,
      thresholdValue: 1008,
      achieved: lifetimeRounds >= 1008,
    },
  ];

  return {
    todayDate,
    selectedYear,
    availableYears,
    lifetimeRounds,
    totalChantingDays,
    recordedDays,
    targetMetDays,
    targetAchievementRatePct,
    averageRoundsPerActiveDay,
    currentStreak,
    longestStreak,
    bestPersonalDay,
    yearlyStats,
    monthlyStats,
    weeks,
    milestones,
  };
}
