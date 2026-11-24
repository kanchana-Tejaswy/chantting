import type { DailySadhana } from "@/lib/domain/sadhana";
import { computeCurrentStreak, computeLongestStreak } from "./stats";

export { computeLongestStreak };

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

export interface PeriodComparison {
  currentTotal: number;
  previousTotal: number;
  absoluteChange: number;
  percentageChange: number | null;
  trend: "up" | "down" | "flat" | "new";
  label: string;
}

export interface DayTrendPoint {
  date: string;
  dayOfMonth: number;
  dayOfWeek: number;
  rounds: number;
  target: number;
  targetMet: boolean;
  status: HeatmapCellStatus;
}

export interface MonthTrendPoint {
  monthIndex: number;
  monthLabel: string;
  monthShort: string;
  totalRounds: number;
  chantingDays: number;
  targetMetDays: number;
  averageRoundsPerActiveDay: number;
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
  selectedMonth: number; // 0..11
  availableYears: number[];
  availableMonths: {
    monthIndex: number;
    monthLabel: string;
    monthShort: string;
    totalRounds: number;
  }[];
  todayCompletedRounds: number;
  selectedMonthCompletedRounds: number;
  selectedYearCompletedRounds: number;
  lifetimeRounds: number;
  totalChantingDays: number;
  recordedDays: number;
  targetMetDays: number;
  targetAchievementRatePct: number;
  averageRoundsPerActiveDay: number;
  selectedYearAverageRounds: number;
  selectedMonthAverageRounds: number;
  currentStreak: number;
  longestStreak: number;
  bestPersonalDay: BestPersonalDay | null; // All-time best
  bestDayInYear: BestPersonalDay | null;
  bestDayInMonth: BestPersonalDay | null;
  yearlyStats: YearlyStats;
  monthlyStats: MonthlyStats[];
  selectedMonthDailyTrends: DayTrendPoint[];
  monthlyTrends: MonthTrendPoint[];
  wowComparison: PeriodComparison;
  momComparison: PeriodComparison;
  yoyComparison: PeriodComparison;
  yesterdayRow: DailySadhana | null;
  recent7DayAverage: number;
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

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function daysInYear(year: number): number {
  return isLeapYear(year) ? 366 : 365;
}

function findBestDay(rows: DailySadhana[]): BestPersonalDay | null {
  let best: BestPersonalDay | null = null;
  for (const row of rows) {
    if (row.completed_rounds <= 0) continue;
    if (
      !best ||
      row.completed_rounds > best.completedRounds ||
      (row.completed_rounds === best.completedRounds &&
        row.sadhana_date > best.date)
    ) {
      best = {
        date: row.sadhana_date,
        completedRounds: row.completed_rounds,
        effectiveTarget: row.effective_daily_target,
      };
    }
  }
  return best;
}

/**
 * Builds annual heatmap grid (Sunday..Saturday columns), monthly & yearly
 * breakdowns, daily & monthly trend charts, MoM/YoY comparisons, and humble
 * consistency milestones while strictly distinguishing recorded zero-round days
 * from missing/unrecorded days.
 */
export function buildSadhanaAnalytics(params: {
  rows: DailySadhana[];
  todayDate: string;
  selectedYear?: number;
  selectedMonth?: number;
}): SadhanaAnalyticsSummary {
  const { rows, todayDate } = params;
  const currentYear = Number.parseInt(todayDate.slice(0, 4), 10);
  const currentMonthIdx = Number.parseInt(todayDate.slice(5, 7), 10) - 1;

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

  const currentStreak = computeCurrentStreak(uniqueRows, todayDate);
  const longestStreak = computeLongestStreak(uniqueRows);

  const bestPersonalDay = findBestDay(uniqueRows);

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

  // Determine selectedMonth (0..11)
  let selectedMonth: number;
  if (
    params.selectedMonth !== undefined &&
    Number.isInteger(params.selectedMonth) &&
    params.selectedMonth >= 0 &&
    params.selectedMonth <= 11
  ) {
    selectedMonth = params.selectedMonth;
  } else if (selectedYear === currentYear) {
    selectedMonth = currentMonthIdx;
  } else {
    // For historical years, default to the latest month that had activity, or December (11)
    const lastActiveMonth = monthBuckets
      .slice()
      .reverse()
      .find((b) => b.totalRounds > 0);
    selectedMonth = lastActiveMonth ? lastActiveMonth.monthIndex : 11;
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

  const availableMonths = monthBuckets.map((b) => ({
    monthIndex: b.monthIndex,
    monthLabel: b.monthLabel,
    monthShort: b.monthLabel.slice(0, 3),
    totalRounds: b.totalRounds,
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

  const bestDayInYear = findBestDay(yearRows);

  const selectedMonthPrefix = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}`;
  const monthRows = yearRows.filter((r) =>
    r.sadhana_date.startsWith(selectedMonthPrefix)
  );
  const bestDayInMonth = findBestDay(monthRows);

  const todayCompletedRounds = byDate.get(todayDate)?.completed_rounds ?? 0;
  const selectedYearCompletedRounds = yearTotalRounds;
  const selectedMonthCompletedRounds =
    monthBuckets[selectedMonth]?.totalRounds ?? 0;

  const selectedYearAverageRounds = yearlyStats.averageRoundsPerActiveDay;
  const selectedMonthChantingDays =
    monthBuckets[selectedMonth]?.chantingDays ?? 0;
  const selectedMonthAverageRounds =
    selectedMonthChantingDays > 0
      ? Number(
          (selectedMonthCompletedRounds / selectedMonthChantingDays).toFixed(1)
        )
      : 0;

  // Selected month daily trends (1..daysInMonth)
  const daysInSelectedMonth = new Date(
    Date.UTC(selectedYear, selectedMonth + 1, 0)
  ).getUTCDate();
  const selectedMonthDailyTrends: DayTrendPoint[] = [];
  for (let d = 1; d <= daysInSelectedMonth; d++) {
    const dt = new Date(Date.UTC(selectedYear, selectedMonth, d));
    const dateStr = dt.toISOString().slice(0, 10);
    const row = byDate.get(dateStr);
    const status = classifyDayStatus({ date: dateStr, todayDate, row });
    selectedMonthDailyTrends.push({
      date: dateStr,
      dayOfMonth: d,
      dayOfWeek: dt.getUTCDay(),
      rounds: row?.completed_rounds ?? 0,
      target: row?.effective_daily_target ?? 0,
      targetMet: Boolean(
        row &&
          row.completed_rounds >= row.effective_daily_target &&
          row.effective_daily_target > 0
      ),
      status,
    });
  }

  // Monthly trends across selectedYear
  const monthlyTrends: MonthTrendPoint[] = monthlyStats.map((m) => ({
    monthIndex: m.monthIndex,
    monthLabel: m.monthLabel,
    monthShort: m.monthLabel.slice(0, 3),
    totalRounds: m.totalRounds,
    chantingDays: m.chantingDays,
    targetMetDays: m.targetMetDays,
    averageRoundsPerActiveDay: m.averageRoundsPerActiveDay,
  }));

  // Month-over-Month (MoM) comparison
  const prevMonthIdx = selectedMonth === 0 ? 11 : selectedMonth - 1;
  const prevMonthYear = selectedMonth === 0 ? selectedYear - 1 : selectedYear;
  const prevMonthPrefix = `${prevMonthYear}-${String(prevMonthIdx + 1).padStart(2, "0")}`;
  const prevMonthTotal = uniqueRows
    .filter((r) => r.sadhana_date.startsWith(prevMonthPrefix))
    .reduce((s, r) => s + r.completed_rounds, 0);

  const momChange = selectedMonthCompletedRounds - prevMonthTotal;
  const momPct =
    prevMonthTotal > 0
      ? Math.round(
          ((selectedMonthCompletedRounds - prevMonthTotal) / prevMonthTotal) *
            100
        )
      : null;
  const momTrend: PeriodComparison["trend"] =
    selectedMonthCompletedRounds > prevMonthTotal
      ? "up"
      : selectedMonthCompletedRounds < prevMonthTotal
        ? "down"
        : prevMonthTotal === 0 && selectedMonthCompletedRounds === 0
          ? "flat"
          : "new";

  const momComparison: PeriodComparison = {
    currentTotal: selectedMonthCompletedRounds,
    previousTotal: prevMonthTotal,
    absoluteChange: momChange,
    percentageChange: momPct,
    trend: momTrend,
    label: `${MONTH_LABELS[selectedMonth]} vs ${MONTH_LABELS[prevMonthIdx]}${
      selectedMonth === 0 ? ` (${prevMonthYear})` : ""
    }`,
  };

  // Year-over-Year (YoY) comparison
  const prevYear = selectedYear - 1;
  const prevYearTotal = uniqueRows
    .filter(
      (r) => Number.parseInt(r.sadhana_date.slice(0, 4), 10) === prevYear
    )
    .reduce((s, r) => s + r.completed_rounds, 0);

  const yoyChange = yearTotalRounds - prevYearTotal;
  const yoyPct =
    prevYearTotal > 0
      ? Math.round(((yearTotalRounds - prevYearTotal) / prevYearTotal) * 100)
      : null;
  const yoyTrend: PeriodComparison["trend"] =
    yearTotalRounds > prevYearTotal
      ? "up"
      : yearTotalRounds < prevYearTotal
        ? "down"
        : prevYearTotal === 0 && yearTotalRounds === 0
          ? "flat"
          : "new";

  const yoyComparison: PeriodComparison = {
    currentTotal: yearTotalRounds,
    previousTotal: prevYearTotal,
    absoluteChange: yoyChange,
    percentageChange: yoyPct,
    trend: yoyTrend,
    label: `${selectedYear} vs ${prevYear}`,
  };

  // Helper for shifting calendar days
  function shiftDate(isoDate: string, daysBack: number): string {
    const [y, m, d] = isoDate.split("-").map(Number);
    const dt = new Date(Date.UTC(y!, m! - 1, d! - daysBack));
    return dt.toISOString().slice(0, 10);
  }

  const yesterdayDate = shiftDate(todayDate, 1);
  const yesterdayRow = byDate.get(yesterdayDate) ?? null;

  // Week-over-Week (WoW): Last 7 days vs Prior 7 days
  let thisWeekTotal = 0;
  let prevWeekTotal = 0;
  let thisWeekActiveDays = 0;
  for (let i = 0; i < 7; i++) {
    const dStr = shiftDate(todayDate, i);
    const r = byDate.get(dStr)?.completed_rounds ?? 0;
    thisWeekTotal += r;
    if (r > 0) thisWeekActiveDays += 1;
  }
  for (let i = 7; i < 14; i++) {
    const dStr = shiftDate(todayDate, i);
    const r = byDate.get(dStr)?.completed_rounds ?? 0;
    prevWeekTotal += r;
  }
  const wowChange = thisWeekTotal - prevWeekTotal;
  const wowPct =
    prevWeekTotal > 0
      ? Math.round(((thisWeekTotal - prevWeekTotal) / prevWeekTotal) * 100)
      : null;
  const wowTrend: PeriodComparison["trend"] =
    thisWeekTotal > prevWeekTotal
      ? "up"
      : thisWeekTotal < prevWeekTotal
        ? "down"
        : prevWeekTotal === 0 && thisWeekTotal === 0
          ? "flat"
          : "new";

  const wowComparison: PeriodComparison = {
    currentTotal: thisWeekTotal,
    previousTotal: prevWeekTotal,
    absoluteChange: wowChange,
    percentageChange: wowPct,
    trend: wowTrend,
    label: "Past 7 Days vs Prior 7 Days",
  };

  const recent7DayAverage =
    thisWeekActiveDays > 0
      ? Number((thisWeekTotal / thisWeekActiveDays).toFixed(1))
      : thisWeekTotal > 0
        ? Number((thisWeekTotal / 7).toFixed(1))
        : 0;

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
      code: "ten_rounds_dedication",
      title: "10 Rounds Dedicated",
      description: "Offered 10 initial rounds of devotional chanting (1,080 names).",
      category: "practice",
      currentValue: lifetimeRounds,
      thresholdValue: 10,
      achieved: lifetimeRounds >= 10,
    },
    {
      code: "fifty_rounds_offering",
      title: "50 Rounds Offered",
      description: "Dedicated 50 cumulative rounds (5,400 holy names).",
      category: "practice",
      currentValue: lifetimeRounds,
      thresholdValue: 50,
      achieved: lifetimeRounds >= 50,
    },
    {
      code: "one_hundred_rounds",
      title: "100 Rounds Completed",
      description: "Reached 100 cumulative rounds of holy remembrance.",
      category: "practice",
      currentValue: lifetimeRounds,
      thresholdValue: 100,
      achieved: lifetimeRounds >= 100,
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
      code: "five_hundred_rounds",
      title: "500 Rounds of Dedication",
      description: "Maintained devotion through 500 rounds (54,000 holy names).",
      category: "practice",
      currentValue: lifetimeRounds,
      thresholdValue: 500,
      achieved: lifetimeRounds >= 500,
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
    {
      code: "forty_day_tapasya",
      title: "Forty-Day Tapasya",
      description: "Maintained your sacred chanting vow for 40 consecutive days.",
      category: "consistency",
      currentValue: longestStreak,
      thresholdValue: 40,
      achieved: longestStreak >= 40,
    },
    {
      code: "one_hundred_eight_cycle",
      title: "108-Day Sacred Cycle",
      description: "Completed a full 108-day cycle of unbroken daily commitment.",
      category: "consistency",
      currentValue: longestStreak,
      thresholdValue: 108,
      achieved: longestStreak >= 108,
    },
    {
      code: "five_thousand_rounds",
      title: "5,000 Rounds of Remembrance",
      description: "Offered 5,000 cumulative rounds (540,000 holy names).",
      category: "practice",
      currentValue: lifetimeRounds,
      thresholdValue: 5000,
      achieved: lifetimeRounds >= 5000,
    },
    {
      code: "ten_thousand_rounds",
      title: "10,000 Rounds of Bhakti",
      description: "Reverently chanted 10,000 rounds (1,080,000 holy names).",
      category: "practice",
      currentValue: lifetimeRounds,
      thresholdValue: 10000,
      achieved: lifetimeRounds >= 10000,
    },
  ];

  return {
    todayDate,
    selectedYear,
    selectedMonth,
    availableYears,
    availableMonths,
    todayCompletedRounds,
    selectedMonthCompletedRounds,
    selectedYearCompletedRounds,
    lifetimeRounds,
    totalChantingDays,
    recordedDays,
    targetMetDays,
    targetAchievementRatePct,
    averageRoundsPerActiveDay,
    selectedYearAverageRounds,
    selectedMonthAverageRounds,
    currentStreak,
    longestStreak,
    bestPersonalDay,
    bestDayInYear,
    bestDayInMonth,
    yearlyStats,
    monthlyStats,
    selectedMonthDailyTrends,
    monthlyTrends,
    wowComparison,
    momComparison,
    yoyComparison,
    yesterdayRow,
    recent7DayAverage,
    weeks,
    milestones,
  };
}

export interface SadhanaPersonalInsight {
  id: string;
  category: "consistency" | "best_period" | "momentum" | "target" | "milestone";
  title: string;
  description: string;
  metric?: string;
  badge: string;
  trend?: "up" | "down" | "neutral" | "achievement";
}

/**
 * Derives genuine, non-fabricated personal insights grounded strictly in
 * the authoritative calculated summary values.
 */
export function generatePersonalInsights(
  analytics: SadhanaAnalyticsSummary,
  activeSankalpa?: {
    title: string;
    target_rounds: number;
    completed_rounds: number;
  } | null
): SadhanaPersonalInsight[] {
  const insights: SadhanaPersonalInsight[] = [];

  // 1. Consistency & Continuity Insight
  if (analytics.currentStreak > 0) {
    insights.push({
      id: "current-streak",
      category: "consistency",
      title: "Active Devotional Continuity",
      description: `You have met your daily commitment for ${analytics.currentStreak} consecutive ${
        analytics.currentStreak === 1 ? "day" : "days"
      }.${
        analytics.longestStreak > analytics.currentStreak
          ? ` Your all-time record is ${analytics.longestStreak} days.`
          : " This is your longest continuous streak to date!"
      }`,
      metric: `${analytics.currentStreak}d streak`,
      badge: "Continuity",
      trend: "achievement",
    });
  } else if (analytics.longestStreak > 0) {
    insights.push({
      id: "streak-history",
      category: "consistency",
      title: "Steadiness History",
      description: `Your highest unbroken practice spanned ${analytics.longestStreak} consecutive days. Steady japa returns with today's first bead.`,
      metric: `${analytics.longestStreak}d record`,
      badge: "Steadiness",
      trend: "neutral",
    });
  } else if (analytics.totalChantingDays > 0) {
    insights.push({
      id: "active-days",
      category: "consistency",
      title: "Days of Remembrance",
      description: `You have recorded devotion on ${analytics.totalChantingDays} calendar ${
        analytics.totalChantingDays === 1 ? "day" : "days"
      }, establishing roots of spiritual habit.`,
      metric: `${analytics.totalChantingDays} days`,
      badge: "Practice",
      trend: "neutral",
    });
  }

  // 2. Target Fulfillment Rate
  if (analytics.recordedDays > 0) {
    insights.push({
      id: "target-attainment",
      category: "target",
      title: "Target Fulfillment Consistency",
      description: `You fulfilled your full daily vow on ${analytics.targetMetDays} of ${
        analytics.recordedDays
      } recorded days (${analytics.targetAchievementRatePct}% attainment rate).`,
      metric: `${analytics.targetAchievementRatePct}%`,
      badge: "Target Rate",
      trend: analytics.targetAchievementRatePct >= 70 ? "up" : "neutral",
    });
  }

  // 3. Best Period Insight
  if (analytics.bestPersonalDay) {
    const holyNames = analytics.bestPersonalDay.completedRounds * 108;
    insights.push({
      id: "best-personal-day",
      category: "best_period",
      title: "Peak Offering of Devotion",
      description: `Your highest recorded day was on ${analytics.bestPersonalDay.date}, completing ${
        analytics.bestPersonalDay.completedRounds
      } rounds (${holyNames.toLocaleString()} holy names).`,
      metric: `${analytics.bestPersonalDay.completedRounds} rounds`,
      badge: "Personal Best",
      trend: "achievement",
    });
  }

  // 4. Period Momentum (Month-over-Month)
  if (analytics.momComparison.trend === "up") {
    insights.push({
      id: "mom-momentum",
      category: "momentum",
      title: "Expanding Monthly Practice",
      description: `Your practice expanded by +${analytics.momComparison.absoluteChange} rounds (${
        analytics.momComparison.percentageChange !== null
          ? `+${analytics.momComparison.percentageChange}%`
          : ""
      }) compared to preceding month.`,
      metric: `+${analytics.momComparison.absoluteChange}r`,
      badge: "Expanding",
      trend: "up",
    });
  } else if (
    analytics.momComparison.trend === "down" &&
    analytics.momComparison.currentTotal > 0
  ) {
    insights.push({
      id: "mom-steady",
      category: "momentum",
      title: "Gentle Recalibration",
      description: `You offered ${analytics.momComparison.currentTotal} rounds in this period. Sādhana flows in seasons—every single bead is received with love.`,
      metric: `${analytics.momComparison.currentTotal} rounds`,
      badge: "Pacing",
      trend: "neutral",
    });
  }

  // 5. Active Sankalpa Progress
  if (activeSankalpa) {
    const pct = Math.min(
      100,
      Math.round(
        (activeSankalpa.completed_rounds /
          Math.max(1, activeSankalpa.target_rounds)) *
          100
      )
    );
    const remaining = Math.max(
      0,
      activeSankalpa.target_rounds - activeSankalpa.completed_rounds
    );
    insights.push({
      id: "active-sankalpa-progress",
      category: "target",
      title: `Active Sankalpa: ${activeSankalpa.title}`,
      description: `${activeSankalpa.completed_rounds} of ${
        activeSankalpa.target_rounds
      } rounds dedicated (${pct}% fulfilled). ${
        remaining === 0
          ? "Sacred vow completed!"
          : `${remaining} rounds remaining to completion.`
      }`,
      metric: `${pct}%`,
      badge: "Active Vow",
      trend: pct >= 100 ? "achievement" : "up",
    });
  }

  // 6. Milestone Proximity
  const nextMilestone = analytics.milestones.find((m) => !m.achieved);
  if (nextMilestone) {
    const diff = Math.max(
      0,
      nextMilestone.thresholdValue - nextMilestone.currentValue
    );
    insights.push({
      id: "next-milestone",
      category: "milestone",
      title: `Next Milestone: ${nextMilestone.title}`,
      description: `${nextMilestone.description} Currently at ${nextMilestone.currentValue} / ${nextMilestone.thresholdValue} (${diff} remaining).`,
      metric: `${diff} left`,
      badge: "Next Step",
      trend: "neutral",
    });
  }

  return insights;
}

export interface TimePatternBucket {
  period: "morning" | "afternoon" | "evening" | "night";
  label: string;
  timeRange: string;
  traditionalName: string;
  rounds: number;
  sessionCount: number;
  percentage: number;
}

export interface ChantingTimeAnalysis {
  buckets: TimePatternBucket[];
  mostFrequentPeriod: TimePatternBucket | null;
  totalTimestampedSessions: number;
  totalTimestampedRounds: number;
  hasData: boolean;
}

/**
 * Analyzes chanting sessions by time of day (Prahara) using reliable timestamps.
 * Does not fabricate missing timestamps or infer activity from daily totals.
 */
export function analyzeChantingTimes(
  sessions: { started_at: string; rounds_completed: number }[],
  timezone = "Asia/Kolkata"
): ChantingTimeAnalysis {
  const counts = {
    morning: { rounds: 0, sessions: 0 },
    afternoon: { rounds: 0, sessions: 0 },
    evening: { rounds: 0, sessions: 0 },
    night: { rounds: 0, sessions: 0 },
  };

  let totalRounds = 0;
  let totalSessions = 0;

  for (const s of sessions) {
    if (!s.started_at) continue;
    let hour = 0;
    try {
      const dt = new Date(s.started_at);
      const str = new Intl.DateTimeFormat("en-US", {
        hour: "numeric",
        hourCycle: "h23",
        timeZone: timezone,
      }).format(dt);
      hour = Number.parseInt(str, 10);
    } catch {
      hour = new Date(s.started_at).getUTCHours();
    }

    const r = Math.max(0, s.rounds_completed);
    totalRounds += r;
    totalSessions += 1;

    if (hour >= 4 && hour < 12) {
      counts.morning.rounds += r;
      counts.morning.sessions += 1;
    } else if (hour >= 12 && hour < 17) {
      counts.afternoon.rounds += r;
      counts.afternoon.sessions += 1;
    } else if (hour >= 17 && hour < 21) {
      counts.evening.rounds += r;
      counts.evening.sessions += 1;
    } else {
      counts.night.rounds += r;
      counts.night.sessions += 1;
    }
  }

  const buckets: TimePatternBucket[] = [
    {
      period: "morning",
      label: "Morning (Brahma Muhūrta & Prātah)",
      timeRange: "04:00 – 12:00",
      traditionalName: "Prātah Kāla",
      rounds: counts.morning.rounds,
      sessionCount: counts.morning.sessions,
      percentage:
        totalRounds > 0
          ? Math.round((counts.morning.rounds / totalRounds) * 100)
          : 0,
    },
    {
      period: "afternoon",
      label: "Afternoon (Madhyāhna)",
      timeRange: "12:00 – 17:00",
      traditionalName: "Madhyāhna",
      rounds: counts.afternoon.rounds,
      sessionCount: counts.afternoon.sessions,
      percentage:
        totalRounds > 0
          ? Math.round((counts.afternoon.rounds / totalRounds) * 100)
          : 0,
    },
    {
      period: "evening",
      label: "Evening (Sandhyā)",
      timeRange: "17:00 – 21:00",
      traditionalName: "Sāyam Sandhyā",
      rounds: counts.evening.rounds,
      sessionCount: counts.evening.sessions,
      percentage:
        totalRounds > 0
          ? Math.round((counts.evening.rounds / totalRounds) * 100)
          : 0,
    },
    {
      period: "night",
      label: "Night (Rātri)",
      timeRange: "21:00 – 04:00",
      traditionalName: "Nishā / Rātri",
      rounds: counts.night.rounds,
      sessionCount: counts.night.sessions,
      percentage:
        totalRounds > 0
          ? Math.round((counts.night.rounds / totalRounds) * 100)
          : 0,
    },
  ];

  let mostFrequent: TimePatternBucket | null = null;
  for (const b of buckets) {
    if (b.rounds > 0 && (!mostFrequent || b.rounds > mostFrequent.rounds)) {
      mostFrequent = b;
    }
  }

  return {
    buckets,
    mostFrequentPeriod: mostFrequent,
    totalTimestampedSessions: totalSessions,
    totalTimestampedRounds: totalRounds,
    hasData: totalSessions > 0,
  };
}

export interface DailyReflectionData {
  todayDate: string;
  yesterdayDate: string;
  todayCompletedRounds: number;
  todayEffectiveTarget: number;
  todayRemaining: number;
  todayTargetMet: boolean;
  todayCompletionPct: number;
  yesterdayCompletedRounds: number;
  yesterdayEffectiveTarget: number;
  yesterdayTargetMet: boolean;
  roundsDiffFromYesterday: number;
  factualReflection: string;
}

export function computeDailyReflection(params: {
  todayDate: string;
  todayRow?: DailySadhana | null;
  yesterdayRow?: DailySadhana | null;
  todayTarget: number;
}): DailyReflectionData {
  const { todayDate, todayRow, yesterdayRow, todayTarget } = params;
  const [y, m, d] = todayDate.split("-").map(Number);
  const dt = new Date(Date.UTC(y!, m! - 1, d! - 1));
  const yesterdayDate = dt.toISOString().slice(0, 10);

  const todayCompleted = todayRow?.completed_rounds ?? 0;
  const effTarget = todayRow?.effective_daily_target ?? todayTarget;
  const todayRemaining = Math.max(0, effTarget - todayCompleted);
  const todayTargetMet = todayCompleted >= effTarget && effTarget > 0;
  const todayPct = Math.min(
    100,
    Math.round((todayCompleted / Math.max(1, effTarget)) * 100)
  );

  const yesterdayCompleted = yesterdayRow?.completed_rounds ?? 0;
  const yesterdayTarget = yesterdayRow?.effective_daily_target ?? effTarget;
  const yesterdayTargetMet =
    yesterdayCompleted >= yesterdayTarget && yesterdayTarget > 0;
  const diff = todayCompleted - yesterdayCompleted;

  let factualReflection = "";
  if (todayTargetMet) {
    factualReflection = `Full vow fulfilled for today (${todayCompleted} of ${effTarget} rounds). Yesterday you completed ${yesterdayCompleted} rounds (${
      diff >= 0 ? `+${diff}` : diff
    } round change).`;
  } else if (todayCompleted > 0) {
    factualReflection = `You have completed ${todayCompleted} rounds today with ${todayRemaining} remaining to meet your ${effTarget}-round vow. Yesterday you completed ${yesterdayCompleted} rounds.`;
  } else {
    factualReflection = `Today's vow of ${effTarget} rounds awaits your practice. Yesterday you recorded ${yesterdayCompleted} rounds.`;
  }

  return {
    todayDate,
    yesterdayDate,
    todayCompletedRounds: todayCompleted,
    todayEffectiveTarget: effTarget,
    todayRemaining,
    todayTargetMet,
    todayCompletionPct: todayPct,
    yesterdayCompletedRounds: yesterdayCompleted,
    yesterdayEffectiveTarget: yesterdayTarget,
    yesterdayTargetMet,
    roundsDiffFromYesterday: diff,
    factualReflection,
  };
}

export interface SankalpaProjection {
  sankalpaId: string;
  title: string;
  targetRounds: number;
  completedRounds: number;
  remainingRounds: number;
  completionPct: number;
  dailyAveragePace: number;
  estimatedDaysRemaining: number | null;
  estimatedCompletionDate: string | null;
  paceExplanation: string;
  isCompleted: boolean;
}

export function computeSankalpaProjection(
  sankalpa: {
    id: string;
    title: string;
    target_rounds: number;
    completed_rounds: number;
    completed_at?: string | null;
  },
  recentDailyAverage: number
): SankalpaProjection {
  const remaining = Math.max(
    0,
    sankalpa.target_rounds - sankalpa.completed_rounds
  );
  const completionPct = Math.min(
    100,
    Math.round((sankalpa.completed_rounds / Math.max(1, sankalpa.target_rounds)) * 100)
  );
  const isCompleted = sankalpa.completed_rounds >= sankalpa.target_rounds;

  if (isCompleted) {
    return {
      sankalpaId: sankalpa.id,
      title: sankalpa.title,
      targetRounds: sankalpa.target_rounds,
      completedRounds: sankalpa.completed_rounds,
      remainingRounds: 0,
      completionPct: 100,
      dailyAveragePace: recentDailyAverage,
      estimatedDaysRemaining: 0,
      estimatedCompletionDate: sankalpa.completed_at
        ? sankalpa.completed_at.slice(0, 10)
        : null,
      paceExplanation:
        "Vow successfully completed! All pledged rounds have been fulfilled.",
      isCompleted: true,
    };
  }

  if (recentDailyAverage <= 0) {
    return {
      sankalpaId: sankalpa.id,
      title: sankalpa.title,
      targetRounds: sankalpa.target_rounds,
      completedRounds: sankalpa.completed_rounds,
      remainingRounds: remaining,
      completionPct,
      dailyAveragePace: 0,
      estimatedDaysRemaining: null,
      estimatedCompletionDate: null,
      paceExplanation:
        "Pace projection unavailable: no recent daily chanting activity recorded yet.",
      isCompleted: false,
    };
  }

  const daysNeeded = Math.ceil(remaining / recentDailyAverage);
  const targetDate = new Date();
  targetDate.setUTCDate(targetDate.getUTCDate() + daysNeeded);
  const dateStr = targetDate.toISOString().slice(0, 10);

  return {
    sankalpaId: sankalpa.id,
    title: sankalpa.title,
    targetRounds: sankalpa.target_rounds,
    completedRounds: sankalpa.completed_rounds,
    remainingRounds: remaining,
    completionPct,
    dailyAveragePace: recentDailyAverage,
    estimatedDaysRemaining: daysNeeded,
    estimatedCompletionDate: dateStr,
    paceExplanation: `Estimated completion based on your recent active pace of ${recentDailyAverage} rounds/day. (Projection is a mathematical estimate and does not alter vow commitments).`,
    isCompleted: false,
  };
}
