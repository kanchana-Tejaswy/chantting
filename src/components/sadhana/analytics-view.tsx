"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  Compass,
  Download,
  FileText,
  Flame,
  HelpCircle,
  History,
  Info,
  Layers,
  Minus,
  Moon,
  Printer,
  ShieldCheck,
  Sparkles,
  Sun,
  Sunrise,
  Sunset,
  Target,
  TrendingDown,
  TrendingUp,
  Trophy,
  X,
} from "lucide-react";
import type {
  DayTrendPoint,
  MonthTrendPoint,
  SadhanaAnalyticsSummary,
  SadhanaPersonalInsight,
  TimePatternBucket,
  ChantingTimeAnalysis,
  DailyReflectionData,
  SankalpaProjection,
} from "@/lib/sadhana/analytics";
import {
  generatePersonalInsights,
  analyzeChantingTimes,
  computeDailyReflection,
  computeSankalpaProjection,
} from "@/lib/sadhana/analytics";
import type { SadhanaDayDetailPayload } from "@/lib/sadhana/queries";
import type { SankalpaRecord } from "@/lib/sankalpa/types";
import { ConsistencyHeatmap } from "@/components/sadhana/consistency-heatmap";
import { LotusEmblem, ManuscriptDivider } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

export interface AnalyticsViewProps {
  displayName: string;
  timezone: string;
  analytics: SadhanaAnalyticsSummary;
  activeSankalpa?: SankalpaRecord | null;
  allSankalpas?: SankalpaRecord[];
  recentSessions?: { started_at: string; rounds_completed: number; method?: string }[];
  initialDayDetail: SadhanaDayDetailPayload;
}

export function DailyTrendChart({
  dailyTrends,
  monthLabel,
  year,
}: {
  dailyTrends: DayTrendPoint[];
  monthLabel: string;
  year: number;
}) {
  const maxRounds = Math.max(
    16,
    ...dailyTrends.map((d) => Math.max(d.rounds, d.target))
  );
  const chartHeight = 140;
  const chartWidth = 600;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 28;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const dayCount = dailyTrends.length;
  const colWidth = plotWidth / dayCount;
  const barWidth = Math.max(6, Math.floor(colWidth * 0.65));

  const sampleTarget =
    dailyTrends.find((d) => d.target > 0)?.target ?? 16;
  const targetY =
    paddingTop + plotHeight - (sampleTarget / maxRounds) * plotHeight;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-ink">
          {monthLabel} {year} · Daily Chanting Activity
        </span>
        <div className="flex items-center gap-3 text-ink-muted">
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-peacock-green" />
            <span>Target met</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] bg-gold-antique" />
            <span>Partial</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-[3px] border border-sandalwood-border bg-linen" />
            <span>Rest / 0</span>
          </span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-44 w-full min-w-[500px]"
          aria-label={`Daily chanting trend for ${monthLabel} ${year}`}
          role="img"
        >
          {/* Target reference line */}
          <line
            x1={paddingLeft}
            y1={targetY}
            x2={chartWidth - paddingRight}
            y2={targetY}
            stroke="#C49A45"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.6"
          />
          <text
            x={paddingLeft + 4}
            y={targetY - 4}
            fill="#8C6F2D"
            fontSize="9"
            fontFamily="sans-serif"
          >
            Target ({sampleTarget}r)
          </text>

          {/* Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + plotHeight}
            x2={chartWidth - paddingRight}
            y2={paddingTop + plotHeight}
            stroke="#D6CDBF"
            strokeWidth="1"
          />

          {/* Day columns */}
          {dailyTrends.map((d, idx) => {
            const xCenter = paddingLeft + idx * colWidth + colWidth / 2;
            const x = xCenter - barWidth / 2;
            const barH =
              d.rounds > 0
                ? Math.max(4, (d.rounds / maxRounds) * plotHeight)
                : 0;
            const y = paddingTop + plotHeight - barH;

            const isFuture = d.status === "future";
            const barFill = isFuture
              ? "transparent"
              : d.targetMet
                ? "#225A45"
                : d.rounds > 0
                  ? "#C49A45"
                  : "#DFD9CE";

            const showDayLabel =
              d.dayOfMonth === 1 ||
              d.dayOfMonth % 5 === 0 ||
              d.dayOfMonth === dayCount;

            return (
              <g key={d.date} tabIndex={0} className="focus:outline-hidden">
                <title>
                  {`${d.date}: ${d.rounds} rounds (Target: ${d.target}) · ${
                    d.targetMet
                      ? "Target met"
                      : d.rounds > 0
                        ? "Partial"
                        : isFuture
                          ? "Upcoming"
                          : "Rest day"
                  }`}
                </title>

                {d.rounds > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx="3"
                    fill={barFill}
                    className="transition-opacity duration-150 hover:opacity-80"
                  />
                ) : (
                  <circle
                    cx={xCenter}
                    cy={paddingTop + plotHeight - 2}
                    r={isFuture ? 1 : 1.5}
                    fill={isFuture ? "#D6CDBF" : "#A69B89"}
                    opacity={isFuture ? 0.35 : 0.7}
                  />
                )}

                {showDayLabel && (
                  <text
                    x={xCenter}
                    y={paddingTop + plotHeight + 16}
                    textAnchor="middle"
                    fill="#756D5C"
                    fontSize="10"
                    fontFamily="sans-serif"
                  >
                    {d.dayOfMonth}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export function MonthlyTrendChart({
  monthlyTrends,
  selectedMonth,
  year,
}: {
  monthlyTrends: MonthTrendPoint[];
  selectedMonth: number;
  year: number;
}) {
  const maxRounds = Math.max(1, ...monthlyTrends.map((m) => m.totalRounds));
  const chartHeight = 140;
  const chartWidth = 600;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 28;
  const plotWidth = chartWidth - paddingLeft - paddingRight;
  const plotHeight = chartHeight - paddingTop - paddingBottom;
  const colWidth = plotWidth / 12;
  const barWidth = Math.max(14, Math.floor(colWidth * 0.6));

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        <span className="font-medium text-ink">
          {year} Monthly Totals Trend
        </span>
        <span className="text-ink-muted">
          Selected month is highlighted in gold
        </span>
      </div>

      <div className="overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="h-44 w-full min-w-[500px]"
          aria-label={`Monthly chanting trend for ${year}`}
          role="img"
        >
          {/* Baseline */}
          <line
            x1={paddingLeft}
            y1={paddingTop + plotHeight}
            x2={chartWidth - paddingRight}
            y2={paddingTop + plotHeight}
            stroke="#D6CDBF"
            strokeWidth="1"
          />

          {monthlyTrends.map((m) => {
            const xCenter = paddingLeft + m.monthIndex * colWidth + colWidth / 2;
            const x = xCenter - barWidth / 2;
            const barH =
              m.totalRounds > 0
                ? Math.max(4, (m.totalRounds / maxRounds) * plotHeight)
                : 0;
            const y = paddingTop + plotHeight - barH;
            const isSelected = m.monthIndex === selectedMonth;

            return (
              <g key={m.monthIndex} tabIndex={0} className="focus:outline-hidden">
                <title>
                  {`${m.monthLabel}: ${m.totalRounds} rounds · ${m.chantingDays} chanting days · ${m.targetMetDays} targets met`}
                </title>

                {m.totalRounds > 0 ? (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={barH}
                    rx="4"
                    fill={isSelected ? "#C49A45" : "#225A45"}
                    stroke={isSelected ? "#8C6F2D" : "transparent"}
                    strokeWidth={isSelected ? 1.5 : 0}
                    className="transition-all duration-150 hover:opacity-80"
                  />
                ) : (
                  <circle
                    cx={xCenter}
                    cy={paddingTop + plotHeight - 2}
                    r={2}
                    fill="#A69B89"
                    opacity={0.6}
                  />
                )}

                <text
                  x={xCenter}
                  y={paddingTop + plotHeight + 16}
                  textAnchor="middle"
                  fill={isSelected ? "#111927" : "#756D5C"}
                  fontWeight={isSelected ? "600" : "400"}
                  fontSize="10"
                  fontFamily="sans-serif"
                >
                  {m.monthShort}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

function computeWeeklyBreakdown(dailyTrends: DayTrendPoint[]): {
  weekNumber: number;
  label: string;
  totalRounds: number;
  activeDays: number;
  targetMetDays: number;
  avgRounds: number;
}[] {
  const weeksMap = new Map<number, DayTrendPoint[]>();
  for (const point of dailyTrends) {
    const weekNum = Math.min(5, Math.ceil(point.dayOfMonth / 7));
    const current = weeksMap.get(weekNum) ?? [];
    current.push(point);
    weeksMap.set(weekNum, current);
  }

  return Array.from(weeksMap.entries()).map(([weekNumber, points]) => {
    const totalRounds = points.reduce((s, p) => s + p.rounds, 0);
    const activeDays = points.filter((p) => p.rounds > 0).length;
    const targetMetDays = points.filter((p) => p.targetMet).length;
    const avgRounds =
      activeDays > 0 ? Number((totalRounds / activeDays).toFixed(1)) : 0;
    const startDay = points[0]?.dayOfMonth ?? 1;
    const endDay = points[points.length - 1]?.dayOfMonth ?? points.length;

    return {
      weekNumber,
      label: `Week ${weekNumber} (Days ${startDay}–${endDay})`,
      totalRounds,
      activeDays,
      targetMetDays,
      avgRounds,
    };
  });
}

function exportAnalyticsCsv(analytics: SadhanaAnalyticsSummary) {
  const headers = [
    "Date",
    "Day_of_Month",
    "Rounds_Offered",
    "Daily_Target",
    "Holy_Names_Chanted",
    "Target_Met",
    "Status",
  ];
  const rows = analytics.selectedMonthDailyTrends.map((d) => [
    d.date,
    d.dayOfMonth,
    d.rounds,
    d.target,
    d.rounds * 108,
    d.targetMet ? "Yes" : "No",
    d.status,
  ]);

  const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute(
    "download",
    `smaran-analytics-${analytics.selectedYear}-${String(analytics.selectedMonth + 1).padStart(2, "0")}.csv`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function AnalyticsView({
  displayName,
  timezone,
  analytics,
  activeSankalpa,
  allSankalpas = [],
  recentSessions = [],
  initialDayDetail,
}: AnalyticsViewProps) {
  const [trendsView, setTrendsView] = React.useState<
    "all" | "daily" | "weekly" | "monthly" | "yearly"
  >("all");
  const [showTransparencyModal, setShowTransparencyModal] = React.useState(false);

  const currentYear = Number.parseInt(analytics.todayDate.slice(0, 4), 10);
  const currentMonthIdx =
    Number.parseInt(analytics.todayDate.slice(5, 7), 10) - 1;
  const isViewingHistorical =
    analytics.selectedYear !== currentYear ||
    analytics.selectedMonth !== currentMonthIdx;

  const maxMonthRounds = Math.max(
    1,
    ...analytics.monthlyStats.map((m) => m.totalRounds)
  );
  const hasAnyRounds = analytics.lifetimeRounds > 0;
  const selectedMonthLabel =
    analytics.availableMonths[analytics.selectedMonth]?.monthLabel ??
    "Selected Month";

  const todayEffectiveTarget =
    initialDayDetail.dailySadhana?.effective_daily_target ?? 16;
  const todayRemaining = Math.max(
    0,
    todayEffectiveTarget - analytics.todayCompletedRounds
  );
  const todayTargetMet =
    analytics.todayCompletedRounds >= todayEffectiveTarget;
  const todayCompletionPct = Math.min(
    100,
    Math.round((analytics.todayCompletedRounds / Math.max(1, todayEffectiveTarget)) * 100)
  );

  const totalHolyNamesChanted = analytics.lifetimeRounds * 108;
  const todayHolyNames = analytics.todayCompletedRounds * 108;

  // 1. Daily Reflection Computation
  const dailyReflection: DailyReflectionData = React.useMemo(() => {
    return computeDailyReflection({
      todayDate: analytics.todayDate,
      todayRow: initialDayDetail.dailySadhana,
      yesterdayRow: analytics.yesterdayRow,
      todayTarget: todayEffectiveTarget,
    });
  }, [analytics.todayDate, initialDayDetail.dailySadhana, analytics.yesterdayRow, todayEffectiveTarget]);

  // 2. Weekly Breakdown
  const weeklyBreakdown = React.useMemo(
    () => computeWeeklyBreakdown(analytics.selectedMonthDailyTrends),
    [analytics.selectedMonthDailyTrends]
  );

  // 3. Chanting Time Patterns (Prahara)
  const timeAnalysis: ChantingTimeAnalysis = React.useMemo(() => {
    return analyzeChantingTimes(recentSessions, timezone);
  }, [recentSessions, timezone]);

  // 4. Sankalpa Projection
  const sankalpaProjection: SankalpaProjection | null = React.useMemo(() => {
    if (!activeSankalpa) return null;
    return computeSankalpaProjection(activeSankalpa, analytics.recent7DayAverage);
  }, [activeSankalpa, analytics.recent7DayAverage]);

  // 5. Authentic Data-Driven Insights
  const personalInsights = React.useMemo(
    () => generatePersonalInsights(analytics, activeSankalpa),
    [analytics, activeSankalpa]
  );

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-6 sm:px-8 sm:py-10 text-ink">
      {/* Page Header */}
      <header className="flex flex-col gap-4 border-b border-sandalwood-border/70 pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="space-y-1">
          <Link
            href="/sadhana"
            className={buttonStyles({
              variant: "ghost",
              size: "sm",
              className: "-ml-3 mb-1 text-xs text-ink-muted hover:text-ink",
            })}
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden={true} />
            <span>Back to Dashboard</span>
          </Link>
          <div className="flex items-center gap-2.5">
            <h1 className="font-display text-3xl font-semibold tracking-tight text-ink sm:text-4xl">
              Consistency &amp; Personal Analytics
            </h1>
          </div>
          <p className="text-xs sm:text-sm text-ink-muted">
            {displayName} · Local devotional record in {timezone}
          </p>
        </div>

        {/* Global Actions: Export CSV, Print/PDF, Data Transparency, Chanting Space */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => exportAnalyticsCsv(analytics)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sandalwood-border/80 bg-paper px-3 py-2 text-xs font-semibold text-ink hover:bg-gold-wash/50 shadow-2xs transition-all cursor-pointer"
            title="Download CSV report of your chanting entries"
          >
            <Download className="size-3.5 text-gold-antique" />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-sandalwood-border/80 bg-paper px-3 py-2 text-xs font-semibold text-ink hover:bg-gold-wash/50 shadow-2xs transition-all cursor-pointer"
            title="Print or save as PDF"
          >
            <Printer className="size-3.5 text-ink-muted" />
            <span>Print Report</span>
          </button>

          <button
            type="button"
            onClick={() => setShowTransparencyModal(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gold-border/70 bg-gold-wash/60 px-3 py-2 text-xs font-semibold text-gold-ink hover:bg-gold-wash shadow-2xs transition-all cursor-pointer"
            title="Learn how calculations are derived"
          >
            <ShieldCheck className="size-3.5" />
            <span>Data Transparency</span>
          </button>

          <Link
            href="/sadhana/chant"
            className={buttonStyles({ variant: "primary", size: "md" })}
          >
            <Flame className="size-4" strokeWidth={1.75} aria-hidden={true} />
            <span>Open Chanting Space</span>
          </Link>
        </div>
      </header>

      {/* Empty State Banner for New Users */}
      {!hasAnyRounds && (
        <Card surface="linen" className="border-gold-border/80 shadow-2xs">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-krishna-midnight text-gold-antique shadow-2xs">
                <LotusEmblem size={22} />
              </span>
              <div>
                <p className="font-serif text-lg font-semibold text-ink">
                  Analytics grow naturally with your practice
                </p>
                <p className="mt-0.5 text-xs sm:text-sm text-ink-muted leading-relaxed">
                  No completed rounds are recorded yet. Once you complete a round via
                  the 108-bead Japa Mala or Manual Counter, your consistency calendar,
                  personal bests, and holy name totals will blossom here.
                </p>
              </div>
            </div>
            <Link
              href="/sadhana/chant"
              className={buttonStyles({ variant: "gold", size: "md" })}
            >
              Begin First Round
            </Link>
          </CardContent>
        </Card>
      )}

      {/* =========================================================================
          DAILY REFLECTION & COMPARISON BANNER
          Factual reflection comparing today and yesterday
         ========================================================================= */}
      <section
        aria-label="Daily Devotional Reflection"
        className="rounded-2xl border border-gold-border/70 bg-gradient-to-r from-paper via-gold-wash/20 to-paper p-4 sm:p-5 shadow-2xs"
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-gold-antique/15 text-gold-ink mt-0.5">
              <Sparkles className="size-4.5" />
            </div>
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-gold-ink">
                  Daily Reflection · {analytics.todayDate}
                </span>
                <Badge variant={dailyReflection.todayTargetMet ? "peacock" : "gold"} className="text-[10px]">
                  {dailyReflection.todayTargetMet ? "Target Met" : `${dailyReflection.todayRemaining} rounds remaining`}
                </Badge>
              </div>
              <p className="text-xs sm:text-sm text-ink leading-relaxed">
                {dailyReflection.factualReflection}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4 shrink-0 text-right self-end sm:self-center border-t sm:border-t-0 sm:border-l border-gold-border/50 pt-2 sm:pt-0 sm:pl-4">
            <div>
              <span className="text-[10px] text-ink-muted uppercase block">Yesterday</span>
              <span className="font-serif text-lg font-bold text-ink tabular-nums">
                {dailyReflection.yesterdayCompletedRounds}r
              </span>
            </div>
            <div>
              <span className="text-[10px] text-ink-muted uppercase block">Today</span>
              <span className="font-serif text-lg font-bold text-peacock-deep tabular-nums">
                {dailyReflection.todayCompletedRounds}r
              </span>
            </div>
            <div>
              <span className="text-[10px] text-ink-muted uppercase block">Change</span>
              <span
                className={cn(
                  "font-serif text-lg font-bold tabular-nums",
                  dailyReflection.roundsDiffFromYesterday >= 0 ? "text-peacock-deep" : "text-kumkum"
                )}
              >
                {dailyReflection.roundsDiffFromYesterday >= 0 ? `+${dailyReflection.roundsDiffFromYesterday}` : dailyReflection.roundsDiffFromYesterday}r
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================================
          SECTION A — PERSONAL OVERVIEW
          Lifetime rounds, total names chanted, today's progress, target, streak, active Sankalpa
         ========================================================================= */}
      <section aria-labelledby="section-overview-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sandalwood-border/40 pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="gold" className="text-xs">
              <LotusEmblem size={12} className="text-[#8C6F2D]" />
              <span>Section A</span>
            </Badge>
            <h2
              id="section-overview-heading"
              className="font-serif text-xl font-bold text-ink"
            >
              Personal Devotional Overview
            </h2>
          </div>
          <span className="text-xs text-ink-muted">
            108 holy names = 1 sacred round · Authoritative record
          </span>
        </div>

        {/* 4 Primary Hero Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {/* 1. Lifetime Rounds & Total Holy Names */}
          <Card
            surface="elevated"
            className="rounded-2xl border border-gold-border/60 bg-gradient-to-br from-paper via-paper to-gold-wash/30 p-4 sm:p-5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-ink">
                Lifetime Dedication
              </span>
              <LotusEmblem size={16} className="text-gold-antique" />
            </div>
            <div className="mt-2">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-ink tabular-nums">
                {analytics.lifetimeRounds.toLocaleString()}
              </span>
              <span className="text-xs font-medium text-ink-muted ml-1.5 font-sans">
                rounds
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-gold-border/40 flex items-center justify-between text-xs">
              <span className="text-ink-muted">Total Holy Names:</span>
              <span className="font-serif font-bold text-gold-ink tabular-nums">
                {totalHolyNamesChanted.toLocaleString()}
              </span>
            </div>
          </Card>

          {/* 2. Today's Completed vs Effective Target */}
          <Card
            surface="elevated"
            className={cn(
              "rounded-2xl border p-4 sm:p-5 shadow-2xs transition-all",
              todayTargetMet
                ? "border-peacock-green/40 bg-gradient-to-br from-paper to-tulsi-wash/50"
                : "border-sandalwood-border/80 bg-paper"
            )}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Today&apos;s Sādhana
              </span>
              <Badge variant={todayTargetMet ? "peacock" : "gold"} className="text-[10px]">
                {todayTargetMet ? "Target Met" : `${todayRemaining} left`}
              </Badge>
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-ink tabular-nums">
                {analytics.todayCompletedRounds}
                <span className="text-sm font-normal text-ink-muted ml-1 font-sans">
                  / {todayEffectiveTarget}r
                </span>
              </div>
              <span className="text-xs font-bold text-gold-ink tabular-nums">
                {todayCompletionPct}%
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-sandalwood-border/40">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-sandalwood-border/60">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    todayTargetMet ? "bg-peacock-green" : "bg-gold-antique"
                  )}
                  style={{ width: `${Math.min(100, Math.max(0, todayCompletionPct))}%` }}
                />
              </div>
              <p className="mt-1 text-[11px] text-ink-muted text-right">
                {todayHolyNames.toLocaleString()} names chanted today
              </p>
            </div>
          </Card>

          {/* 3. Effective Daily Target & Carry-Forward */}
          <Card
            surface="elevated"
            className="rounded-2xl border border-sandalwood-border/80 bg-paper p-4 sm:p-5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
                Daily Vow Commitment
              </span>
              <Target className="size-4 text-peacock-deep" />
            </div>
            <div className="mt-2">
              <span className="font-serif text-3xl sm:text-4xl font-bold text-ink tabular-nums">
                {todayEffectiveTarget}
              </span>
              <span className="text-xs font-medium text-ink-muted ml-1.5 font-sans">
                rounds target
              </span>
            </div>
            <div className="mt-2 pt-2 border-t border-sandalwood-border/40 flex items-center justify-between text-xs">
              <span className="text-ink-muted">
                Base: {initialDayDetail.dailySadhana?.original_daily_target ?? 16}r
              </span>
              <span className="text-ink-muted">
                Carry: +{initialDayDetail.dailySadhana?.previous_pending_balance ?? 0}r
              </span>
            </div>
          </Card>

          {/* 4. Current & Longest Chanting Streak */}
          <Card
            surface="elevated"
            className="rounded-2xl border border-gold-border/60 bg-gradient-to-br from-paper to-gold-wash/20 p-4 sm:p-5 shadow-2xs"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-gold-ink">
                Chanting Continuity
              </span>
              <Flame className="size-4 text-gold-antique" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <div className="font-serif text-3xl sm:text-4xl font-bold text-ink tabular-nums">
                {analytics.currentStreak}
                <span className="text-xs font-medium text-ink-muted ml-1 font-sans">
                  {analytics.currentStreak === 1 ? "day" : "days"}
                </span>
              </div>
              <Badge variant="neutral" className="text-[10px]">
                Active Streak
              </Badge>
            </div>
            <div className="mt-2 pt-2 border-t border-gold-border/40 flex items-center justify-between text-xs">
              <span className="text-ink-muted">Personal Record:</span>
              <span className="font-semibold text-ink tabular-nums">
                {analytics.longestStreak} consecutive {analytics.longestStreak === 1 ? "day" : "days"}
              </span>
            </div>
          </Card>
        </div>
      </section>

      <ManuscriptDivider />

      {/* =========================================================================
          SECTION B — CHANTING CONSISTENCY
          Interactive yearly activity heatmap, legend, and single-date inspection
         ========================================================================= */}
      <section aria-labelledby="section-consistency-heading" className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sandalwood-border/40 pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="gold" className="text-xs">
              <LotusEmblem size={12} className="text-[#8C6F2D]" />
              <span>Section B</span>
            </Badge>
            <h2
              id="section-consistency-heading"
              className="font-serif text-xl font-bold text-ink"
            >
              Chanting Consistency &amp; Annual Calendar
            </h2>
          </div>
          <div className="flex items-center gap-3 text-xs text-ink-muted">
            <span>
              Met: <strong className="text-peacock-deep font-semibold">{analytics.targetMetDays}</strong>/{analytics.recordedDays} days ({analytics.targetAchievementRatePct}%)
            </span>
            <span>·</span>
            <span>
              Best Streak: <strong className="text-ink font-semibold">{analytics.longestStreak}d</strong>
            </span>
          </div>
        </div>

        {/* Embedded Annual Heatmap with Date Detail Inspection */}
        <ConsistencyHeatmap
          selectedYear={analytics.selectedYear}
          currentYear={currentYear}
          todayDate={analytics.todayDate}
          weeks={analytics.weeks}
          initialDayDetail={initialDayDetail}
        />
      </section>

      <ManuscriptDivider />

      {/* =========================================================================
          SECTION C — CHANTING TRENDS & TIME RANGE ANALYSIS
          Daily trend, weekly summaries, monthly progress, period comparisons (WoW, MoM, YoY)
         ========================================================================= */}
      <section aria-labelledby="section-trends-heading" className="space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-sandalwood-border/40 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="gold" className="text-xs">
                <LotusEmblem size={12} className="text-[#8C6F2D]" />
                <span>Section C</span>
              </Badge>
              <h2
                id="section-trends-heading"
                className="font-serif text-xl font-bold text-ink"
              >
                Chanting Trends &amp; Time Range Analysis
              </h2>
            </div>
            <p className="text-xs text-ink-muted mt-0.5">
              Inspect your devotion across daily, weekly, monthly, and yearly rhythms without losing context.
            </p>
          </div>

          {/* Time Range Segmented Switcher */}
          <div className="flex flex-wrap items-center rounded-xl border border-sandalwood-border/80 bg-linen/70 p-1 shadow-2xs self-start sm:self-auto gap-0.5">
            <button
              type="button"
              onClick={() => setTrendsView("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                trendsView === "all"
                  ? "bg-krishna-midnight text-ink-on-dark shadow-2xs"
                  : "text-ink-muted hover:text-ink hover:bg-paper/60"
              )}
            >
              All Views
            </button>
            <button
              type="button"
              onClick={() => setTrendsView("daily")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                trendsView === "daily"
                  ? "bg-krishna-midnight text-ink-on-dark shadow-2xs"
                  : "text-ink-muted hover:text-ink hover:bg-paper/60"
              )}
            >
              Daily Trend
            </button>
            <button
              type="button"
              onClick={() => setTrendsView("weekly")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                trendsView === "weekly"
                  ? "bg-krishna-midnight text-ink-on-dark shadow-2xs"
                  : "text-ink-muted hover:text-ink hover:bg-paper/60"
              )}
            >
              Weekly Rhythm
            </button>
            <button
              type="button"
              onClick={() => setTrendsView("monthly")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                trendsView === "monthly"
                  ? "bg-krishna-midnight text-ink-on-dark shadow-2xs"
                  : "text-ink-muted hover:text-ink hover:bg-paper/60"
              )}
            >
              Monthly Progress
            </button>
            <button
              type="button"
              onClick={() => setTrendsView("yearly")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                trendsView === "yearly"
                  ? "bg-krishna-midnight text-ink-on-dark shadow-2xs"
                  : "text-ink-muted hover:text-ink hover:bg-paper/60"
              )}
            >
              Yearly &amp; Comparisons
            </button>
          </div>
        </div>

        {/* Historical Period Selector Strip */}
        <div className="rounded-2xl border border-sandalwood-border/80 bg-paper/95 p-4 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-peacock-deep" aria-hidden={true} />
              <span className="text-xs font-semibold text-ink">
                Inspect Historical Period:
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Year Selector Pills */}
              <div className="flex items-center gap-1 rounded-xl border border-sandalwood-border/70 bg-linen/70 p-1">
                {analytics.availableYears.map((yr) => (
                  <Link
                    key={yr}
                    href={`/sadhana/analytics?year=${yr}&month=${analytics.selectedMonth + 1}`}
                    className={cn(
                      "rounded-lg px-2.5 py-1 text-xs font-semibold tabular-nums transition-colors",
                      yr === analytics.selectedYear
                        ? "bg-krishna-midnight text-ink-on-dark shadow-2xs"
                        : "text-ink-muted hover:bg-paper hover:text-ink"
                    )}
                  >
                    {yr}
                  </Link>
                ))}
              </div>

              {isViewingHistorical && (
                <Link
                  href="/sadhana/analytics"
                  className={buttonStyles({
                    variant: "ghost",
                    size: "sm",
                    className: "text-xs font-medium text-peacock-deep",
                  })}
                >
                  Reset to Current
                </Link>
              )}
            </div>
          </div>

          {/* 12 Month Selector Strip */}
          <div className="mt-3 grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
            {analytics.availableMonths.map((m) => {
              const isSelected = m.monthIndex === analytics.selectedMonth;
              return (
                <Link
                  key={m.monthIndex}
                  href={`/sadhana/analytics?year=${analytics.selectedYear}&month=${m.monthIndex + 1}`}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl p-2 text-center transition-all",
                    isSelected
                      ? "bg-peacock-deep font-semibold text-ink-on-dark ring-1 ring-gold-antique/50 shadow-2xs"
                      : "border border-sandalwood-border/60 bg-linen/50 text-ink-muted hover:border-peacock-deep/30 hover:bg-linen hover:text-ink"
                  )}
                >
                  <span className="text-xs font-medium">{m.monthShort}</span>
                  <span
                    className={cn(
                      "text-[10px] tabular-nums",
                      isSelected ? "text-gold-antique" : "text-ink-muted/80"
                    )}
                  >
                    {m.totalRounds > 0 ? `${m.totalRounds}r` : "—"}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Dynamic View Panels */}
        {(trendsView === "all" || trendsView === "daily") && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Card surface="parchment" className="rounded-2xl p-5 shadow-2xs">
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-serif">
                  Daily Chanting Activity · {selectedMonthLabel} {analytics.selectedYear}
                </CardTitle>
                <CardDescription className="text-xs">
                  Exact completed rounds each day compared against your daily commitment line.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DailyTrendChart
                  dailyTrends={analytics.selectedMonthDailyTrends}
                  monthLabel={selectedMonthLabel}
                  year={analytics.selectedYear}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {(trendsView === "all" || trendsView === "weekly") && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <Card surface="parchment" className="rounded-2xl p-5 shadow-2xs">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-serif">
                  Weekly Devotional Summaries · {selectedMonthLabel} {analytics.selectedYear}
                </CardTitle>
                <CardDescription className="text-xs">
                  Aggregated totals, active chanting days, and target attainment broken down week-by-week.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {weeklyBreakdown.map((w) => (
                    <div
                      key={w.weekNumber}
                      className="rounded-xl border border-sandalwood-border/70 bg-paper p-4 space-y-2 shadow-2xs"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-semibold text-ink">{w.label}</span>
                        <Badge variant="gold" className="text-[10px]">
                          {w.totalRounds} rounds
                        </Badge>
                      </div>
                      <div className="text-xs text-ink-muted space-y-1 pt-1">
                        <div className="flex justify-between">
                          <span>Active days:</span>
                          <strong className="text-ink">{w.activeDays}/7</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Targets met:</span>
                          <strong className="text-peacock-deep">{w.targetMetDays} days</strong>
                        </div>
                        <div className="flex justify-between">
                          <span>Daily average:</span>
                          <strong className="text-gold-ink">{w.avgRounds}r / active day</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {(trendsView === "all" || trendsView === "monthly") && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            <div className="grid gap-6 lg:grid-cols-2">
              <Card surface="parchment" className="rounded-2xl p-5 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-lg font-serif">
                    Monthly Trend · {analytics.selectedYear}
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Cumulative rounds recorded each month across {analytics.selectedYear}.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <MonthlyTrendChart
                    monthlyTrends={analytics.monthlyTrends}
                    selectedMonth={analytics.selectedMonth}
                    year={analytics.selectedYear}
                  />
                </CardContent>
              </Card>

              <Card surface="parchment" className="rounded-2xl p-5 shadow-2xs">
                <CardHeader>
                  <CardTitle className="text-lg font-serif">
                    Monthly Progress Comparison ({analytics.selectedYear})
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Completed rounds, active chanting days, and target attainment across all 12 months.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {analytics.monthlyStats.map((m) => (
                    <div key={m.monthIndex} className="space-y-1">
                      <div className="flex items-baseline justify-between gap-2 text-xs">
                        <span className="font-medium text-ink">{m.monthLabel}</span>
                        <span className="text-ink-muted tabular-nums">
                          {m.totalRounds} rounds · {m.chantingDays} active days ·{" "}
                          {m.targetMetDays}/{m.recordedDays} met
                        </span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-linen">
                        <div
                          className="h-full origin-left rounded-full bg-peacock-green transition-transform duration-300"
                          style={{
                            transform: `scaleX(${
                              m.totalRounds > 0 ? m.totalRounds / maxMonthRounds : 0
                            })`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {(trendsView === "all" || trendsView === "yearly") && (
          <div className="space-y-4 animate-in fade-in-50 duration-200">
            {/* Period Comparisons: Week-over-Week, Month-over-Month & Year-over-Year */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* 1. WoW Comparison */}
              <Card surface="elevated" className="rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-serif font-bold text-ink">
                    Week-over-Week
                  </span>
                  <Badge
                    variant={
                      analytics.wowComparison.trend === "up"
                        ? "peacock"
                        : analytics.wowComparison.trend === "down"
                          ? "neutral"
                          : "gold"
                    }
                    className="gap-1 text-[10px]"
                  >
                    {analytics.wowComparison.trend === "up" ? (
                      <TrendingUp className="size-3" />
                    ) : analytics.wowComparison.trend === "down" ? (
                      <TrendingDown className="size-3" />
                    ) : (
                      <Minus className="size-3" />
                    )}
                    <span>
                      {analytics.wowComparison.percentageChange !== null
                        ? `${analytics.wowComparison.percentageChange >= 0 ? "+" : ""}${analytics.wowComparison.percentageChange}%`
                        : analytics.wowComparison.trend}
                    </span>
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-linen/70 p-2 rounded-xl">
                    <span className="text-[10px] text-ink-muted block">This 7d</span>
                    <strong className="font-serif text-lg text-peacock-deep block">
                      {analytics.wowComparison.currentTotal}r
                    </strong>
                  </div>
                  <div className="bg-linen/70 p-2 rounded-xl">
                    <span className="text-[10px] text-ink-muted block">Prior 7d</span>
                    <strong className="font-serif text-lg text-ink block">
                      {analytics.wowComparison.previousTotal}r
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-ink-muted text-center">
                  Difference:{" "}
                  <strong className="text-ink">
                    {analytics.wowComparison.absoluteChange >= 0
                      ? `+${analytics.wowComparison.absoluteChange}`
                      : analytics.wowComparison.absoluteChange}{" "}
                    rounds
                  </strong>
                </p>
              </Card>

              {/* 2. MoM Comparison */}
              <Card surface="elevated" className="rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-serif font-bold text-ink">
                    Month-over-Month
                  </span>
                  <Badge
                    variant={
                      analytics.momComparison.trend === "up"
                        ? "peacock"
                        : analytics.momComparison.trend === "down"
                          ? "neutral"
                          : "gold"
                    }
                    className="gap-1 text-[10px]"
                  >
                    {analytics.momComparison.trend === "up" ? (
                      <TrendingUp className="size-3" />
                    ) : analytics.momComparison.trend === "down" ? (
                      <TrendingDown className="size-3" />
                    ) : (
                      <Minus className="size-3" />
                    )}
                    <span>
                      {analytics.momComparison.percentageChange !== null
                        ? `${analytics.momComparison.percentageChange >= 0 ? "+" : ""}${analytics.momComparison.percentageChange}%`
                        : analytics.momComparison.trend}
                    </span>
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-linen/70 p-2 rounded-xl">
                    <span className="text-[10px] text-ink-muted block">Current Mo</span>
                    <strong className="font-serif text-lg text-peacock-deep block">
                      {analytics.momComparison.currentTotal}r
                    </strong>
                  </div>
                  <div className="bg-linen/70 p-2 rounded-xl">
                    <span className="text-[10px] text-ink-muted block">Prior Mo</span>
                    <strong className="font-serif text-lg text-ink block">
                      {analytics.momComparison.previousTotal}r
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-ink-muted text-center">
                  Difference:{" "}
                  <strong className="text-ink">
                    {analytics.momComparison.absoluteChange >= 0
                      ? `+${analytics.momComparison.absoluteChange}`
                      : analytics.momComparison.absoluteChange}{" "}
                    rounds
                  </strong>
                </p>
              </Card>

              {/* 3. YoY Comparison */}
              <Card surface="elevated" className="rounded-2xl p-4 shadow-2xs space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-serif font-bold text-ink">
                    Year-over-Year
                  </span>
                  <Badge
                    variant={
                      analytics.yoyComparison.trend === "up"
                        ? "peacock"
                        : analytics.yoyComparison.trend === "down"
                          ? "neutral"
                          : "gold"
                    }
                    className="gap-1 text-[10px]"
                  >
                    {analytics.yoyComparison.trend === "up" ? (
                      <TrendingUp className="size-3" />
                    ) : analytics.yoyComparison.trend === "down" ? (
                      <TrendingDown className="size-3" />
                    ) : (
                      <Minus className="size-3" />
                    )}
                    <span>
                      {analytics.yoyComparison.percentageChange !== null
                        ? `${analytics.yoyComparison.percentageChange >= 0 ? "+" : ""}${analytics.yoyComparison.percentageChange}%`
                        : analytics.yoyComparison.trend}
                    </span>
                  </Badge>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-linen/70 p-2 rounded-xl">
                    <span className="text-[10px] text-ink-muted block">{analytics.selectedYear}</span>
                    <strong className="font-serif text-lg text-gold-ink block">
                      {analytics.yoyComparison.currentTotal}r
                    </strong>
                  </div>
                  <div className="bg-linen/70 p-2 rounded-xl">
                    <span className="text-[10px] text-ink-muted block">{analytics.selectedYear - 1}</span>
                    <strong className="font-serif text-lg text-ink block">
                      {analytics.yoyComparison.previousTotal}r
                    </strong>
                  </div>
                </div>
                <p className="text-[11px] text-ink-muted text-center">
                  Difference:{" "}
                  <strong className="text-ink">
                    {analytics.yoyComparison.absoluteChange >= 0
                      ? `+${analytics.yoyComparison.absoluteChange}`
                      : analytics.yoyComparison.absoluteChange}{" "}
                    rounds
                  </strong>
                </p>
              </Card>
            </div>

            {/* Yearly Aggregate Summary */}
            <Card surface="sanctum" className="rounded-2xl p-5 shadow-2xs">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-lg font-serif flex items-center gap-2">
                    <TrendingUp className="size-4 text-gold-antique" />
                    <span>{analytics.yearlyStats.year} Yearly Summary</span>
                  </CardTitle>
                  <Badge variant="sanctum" className="tabular-nums">
                    {analytics.yearlyStats.totalRounds} rounds
                  </Badge>
                </div>
                <CardDescription className="text-xs text-ink-muted-dark opacity-100">
                  Aggregated strictly from your local calendar dates in {analytics.yearlyStats.year}.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <dl className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                  <div className="rounded-xl bg-krishna-elevated p-3">
                    <dt className="text-xs text-ink-muted-dark">Active days</dt>
                    <dd className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-ink-on-dark tabular-nums">
                      {analytics.yearlyStats.chantingDays}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-krishna-elevated p-3">
                    <dt className="text-xs text-ink-muted-dark">Targets met</dt>
                    <dd className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-ink-on-dark tabular-nums">
                      {analytics.yearlyStats.targetMetDays}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-krishna-elevated p-3">
                    <dt className="text-xs text-ink-muted-dark">Avg / active day</dt>
                    <dd className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-ink-on-dark tabular-nums">
                      {analytics.yearlyStats.averageRoundsPerActiveDay}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-krishna-elevated p-3">
                    <dt className="text-xs text-ink-muted-dark">Best streak in year</dt>
                    <dd className="mt-1 font-serif text-xl sm:text-2xl font-semibold text-gold-antique tabular-nums">
                      {analytics.yearlyStats.longestStreakInYear}d
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Best Chanting Days & Daily Averages Row */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted block">
            Devotional Averages &amp; Personal Bests
          </span>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-6">
            <Card surface="parchment" className="rounded-xl p-3">
              <p className="text-[11px] text-ink-muted font-medium">All-Time Best Day</p>
              <p className="mt-1 font-serif text-xl font-bold text-gold-ink tabular-nums">
                {analytics.bestPersonalDay
                  ? `${analytics.bestPersonalDay.completedRounds}r`
                  : "—"}
              </p>
              <p className="text-[10px] text-ink-muted truncate">
                {analytics.bestPersonalDay ? analytics.bestPersonalDay.date : "No records"}
              </p>
            </Card>

            <Card surface="parchment" className="rounded-xl p-3">
              <p className="text-[11px] text-ink-muted font-medium">Best Day in {analytics.selectedYear}</p>
              <p className="mt-1 font-serif text-xl font-bold text-peacock-deep tabular-nums">
                {analytics.bestDayInYear
                  ? `${analytics.bestDayInYear.completedRounds}r`
                  : "—"}
              </p>
              <p className="text-[10px] text-ink-muted truncate">
                {analytics.bestDayInYear ? analytics.bestDayInYear.date : "None in year"}
              </p>
            </Card>

            <Card surface="parchment" className="rounded-xl p-3">
              <p className="text-[11px] text-ink-muted font-medium">Best Day in {selectedMonthLabel}</p>
              <p className="mt-1 font-serif text-xl font-bold text-peacock-deep tabular-nums">
                {analytics.bestDayInMonth
                  ? `${analytics.bestDayInMonth.completedRounds}r`
                  : "—"}
              </p>
              <p className="text-[10px] text-ink-muted truncate">
                {analytics.bestDayInMonth ? analytics.bestDayInMonth.date : "None in month"}
              </p>
            </Card>

            <Card surface="parchment" className="rounded-xl p-3">
              <p className="text-[11px] text-ink-muted font-medium">Lifetime Daily Avg</p>
              <p className="mt-1 font-serif text-xl font-bold text-ink tabular-nums">
                {analytics.averageRoundsPerActiveDay}
              </p>
              <p className="text-[10px] text-ink-muted">rounds / active day</p>
            </Card>

            <Card surface="parchment" className="rounded-xl p-3">
              <p className="text-[11px] text-ink-muted font-medium">{analytics.selectedYear} Daily Avg</p>
              <p className="mt-1 font-serif text-xl font-bold text-ink tabular-nums">
                {analytics.selectedYearAverageRounds}
              </p>
              <p className="text-[10px] text-ink-muted">rounds / active day</p>
            </Card>

            <Card surface="parchment" className="rounded-xl p-3">
              <p className="text-[11px] text-ink-muted font-medium">{selectedMonthLabel} Daily Avg</p>
              <p className="mt-1 font-serif text-xl font-bold text-ink tabular-nums">
                {analytics.selectedMonthAverageRounds}
              </p>
              <p className="text-[10px] text-ink-muted">rounds / active day</p>
            </Card>
          </div>
        </div>
      </section>

      <ManuscriptDivider />

      {/* =========================================================================
          SECTION D — PERSONAL INSIGHTS & CHANTING TIME PATTERNS
          Authentic data-driven observations + Prahara time-of-day distribution
         ========================================================================= */}
      <section aria-labelledby="section-insights-heading" className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sandalwood-border/40 pb-2">
          <div className="flex items-center gap-2">
            <Badge variant="gold" className="text-xs">
              <LotusEmblem size={12} className="text-[#8C6F2D]" />
              <span>Section D</span>
            </Badge>
            <h2
              id="section-insights-heading"
              className="font-serif text-xl font-bold text-ink"
            >
              Devotional Insights &amp; Chanting Time Patterns
            </h2>
          </div>
          <span className="text-xs text-ink-muted">
            Derived strictly from recorded timestamps · No generic assumptions
          </span>
        </div>

        {/* 1. Chanting Time Patterns (Prahara Analysis) */}
        <Card surface="elevated" className="rounded-2xl border border-gold-border/70 p-5 shadow-2xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-peacock-deep" />
                <h3 className="font-serif text-base font-bold text-ink">
                  Chanting Time-of-Day Rhythm (Praharas)
                </h3>
              </div>
              <p className="text-xs text-ink-muted">
                Analysis based on {timeAnalysis.totalTimestampedSessions} timestamped chanting sessions in {timezone}.
              </p>
            </div>

            {timeAnalysis.mostFrequentPeriod && (
              <Badge variant="gold" className="self-start sm:self-auto text-xs">
                <Sun className="size-3.5 text-gold-antique mr-1" />
                <span>Primary Time: {timeAnalysis.mostFrequentPeriod.traditionalName}</span>
              </Badge>
            )}
          </div>

          {!timeAnalysis.hasData ? (
            <p className="text-xs text-ink-muted italic p-3 bg-linen/50 rounded-xl border border-dashed border-sandalwood-border/70">
              No timestamped sessions recorded yet. Complete sessions in the 108-bead Japa Mala or Manual Counter to reveal your time patterns.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {timeAnalysis.buckets.map((b) => (
                <div
                  key={b.period}
                  className={cn(
                    "rounded-xl border p-3.5 space-y-2 shadow-2xs transition-all",
                    timeAnalysis.mostFrequentPeriod?.period === b.period
                      ? "border-gold-border/80 bg-gradient-to-br from-paper to-gold-wash/40 ring-1 ring-gold-antique/30"
                      : "border-sandalwood-border/60 bg-paper/70"
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-ink flex items-center gap-1.5">
                      {b.period === "morning" && <Sunrise className="size-3.5 text-amber-600" />}
                      {b.period === "afternoon" && <Sun className="size-3.5 text-yellow-600" />}
                      {b.period === "evening" && <Sunset className="size-3.5 text-orange-600" />}
                      {b.period === "night" && <Moon className="size-3.5 text-indigo-600" />}
                      <span>{b.traditionalName}</span>
                    </span>
                    <span className="font-bold text-gold-ink tabular-nums">
                      {b.percentage}%
                    </span>
                  </div>

                  <span className="text-[11px] text-ink-muted block">
                    {b.timeRange}
                  </span>

                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-sandalwood-border/50">
                    <div
                      className={cn(
                        "h-full rounded-full transition-all duration-300",
                        timeAnalysis.mostFrequentPeriod?.period === b.period
                          ? "bg-gold-antique"
                          : "bg-peacock-green"
                      )}
                      style={{ width: `${Math.min(100, Math.max(0, b.percentage))}%` }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-ink-muted pt-0.5">
                    <span>{b.rounds} rounds</span>
                    <span>{b.sessionCount} sessions</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 2. Personal Insights Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {personalInsights.map((insight) => (
            <Card
              key={insight.id}
              surface="elevated"
              className="rounded-2xl border border-gold-border/60 bg-gradient-to-br from-paper via-paper to-gold-wash/20 p-4 sm:p-5 flex flex-col justify-between shadow-2xs hover:border-gold-antique transition-all"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="gold" className="text-[10px]">
                    {insight.badge}
                  </Badge>
                  {insight.metric && (
                    <span className="text-xs font-bold text-gold-ink font-serif tabular-nums">
                      {insight.metric}
                    </span>
                  )}
                </div>
                <h3 className="font-serif text-base font-bold text-ink">
                  {insight.title}
                </h3>
                <p className="text-xs text-ink-muted leading-relaxed">
                  {insight.description}
                </p>
              </div>

              <div className="mt-4 pt-2 border-t border-gold-border/30 flex items-center justify-between text-[11px] text-gold-ink">
                <span className="flex items-center gap-1">
                  <Sparkles className="size-3 text-gold-antique" />
                  <span>Personal Reflection</span>
                </span>
                <span className="text-[10px] text-ink-muted font-sans">
                  Faithful Sadhana
                </span>
              </div>
            </Card>
          ))}
        </div>
      </section>

      <ManuscriptDivider />

      {/* =========================================================================
          SECTION E — SANKALPA ANALYSIS & LIFETIME DEVOTIONAL JOURNEY
          Active vow progress, pace projection, lifetime rounds, names, and milestones
         ========================================================================= */}
      <section aria-labelledby="section-journey-heading" className="space-y-6">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-sandalwood-border/40 pb-2">
          <div>
            <div className="flex items-center gap-2">
              <Badge variant="gold" className="text-xs">
                <LotusEmblem size={12} className="text-[#8C6F2D]" />
                <span>Section E</span>
              </Badge>
              <h2
                id="section-journey-heading"
                className="font-serif text-xl font-bold text-ink"
              >
                Sankalpa Analysis &amp; Lifetime Devotional Journey
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-ink-muted">
              Personal Consistency Milestones — Private encouragement for steady daily practice, never a measure of comparison.
            </p>
          </div>
          <Badge variant="neutral" className="tabular-nums text-xs">
            {analytics.milestones.filter((m) => m.achieved).length} /{" "}
            {analytics.milestones.length} reached
          </Badge>
        </div>

        {/* Sankalpa Analysis & Pace Projection Card */}
        {activeSankalpa && sankalpaProjection ? (
          <Card surface="elevated" className="rounded-2xl border border-peacock-green/40 bg-gradient-to-br from-paper via-tulsi-wash/20 to-paper p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-peacock-deep text-gold-antique shadow-2xs">
                  <Award className="size-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-peacock-deep">
                      Active Sankalpa &amp; Goal Projection
                    </span>
                    <Badge variant="peacock" className="text-[10px]">
                      {sankalpaProjection.isCompleted ? "Completed" : "In Progress"}
                    </Badge>
                  </div>
                  <h3 className="font-serif text-lg font-bold text-ink mt-0.5">
                    {activeSankalpa.title}
                  </h3>
                  {activeSankalpa.description && (
                    <p className="text-xs text-ink-muted mt-0.5">
                      {activeSankalpa.description}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex sm:flex-col sm:items-end justify-between items-baseline text-xs text-ink-muted">
                <span className="font-serif text-xl font-bold text-peacock-deep tabular-nums">
                  {sankalpaProjection.completedRounds.toLocaleString()} /{" "}
                  {sankalpaProjection.targetRounds.toLocaleString()} rounds
                </span>
                <span className="text-xs font-semibold text-gold-ink">
                  {sankalpaProjection.completionPct}% fulfilled · {sankalpaProjection.remainingRounds} remaining
                </span>
              </div>
            </div>

            <ProgressBar
              value={sankalpaProjection.completedRounds}
              max={sankalpaProjection.targetRounds}
              tone="peacock"
              label={`Progress toward ${activeSankalpa.title}`}
            />

            {/* Factual Pace Projection & Estimated Completion Date */}
            <div className="rounded-xl border border-sandalwood-border/60 bg-paper/90 p-3.5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-xs">
              <div className="space-y-0.5">
                <span className="font-semibold text-ink flex items-center gap-1.5">
                  <Compass className="size-3.5 text-peacock-deep" />
                  <span>Devotional Completion Projection:</span>
                </span>
                <p className="text-ink-muted leading-relaxed">
                  {sankalpaProjection.paceExplanation}
                </p>
              </div>

              {sankalpaProjection.estimatedCompletionDate && !sankalpaProjection.isCompleted && (
                <div className="shrink-0 rounded-lg bg-gold-wash/80 border border-gold-border/70 px-3 py-1.5 text-center">
                  <span className="text-[10px] uppercase font-bold text-gold-ink block">
                    Estimated Date
                  </span>
                  <strong className="font-serif text-sm text-ink tabular-nums block">
                    {sankalpaProjection.estimatedCompletionDate}
                  </strong>
                </div>
              )}
            </div>
          </Card>
        ) : (
          <div className="rounded-2xl border border-sandalwood-border/60 bg-paper/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2.5 text-ink-muted">
              <Compass className="size-4 text-gold-antique shrink-0" />
              <span>
                <strong className="text-ink font-semibold">Devotional Sankalpa:</strong> Anchor your chanting with a dedicated multi-day vow to visualize pace projections and completion targets.
              </span>
            </div>
            <Link
              href="/sadhana#sankalpa"
              className="font-medium text-gold-ink hover:text-ink underline self-start sm:self-auto"
            >
              Set a Sacred Sankalpa →
            </Link>
          </div>
        )}

        {/* Historical Sankalpas Archive (if any) */}
        {allSankalpas.filter((s) => s.status === "completed").length > 0 && (
          <div className="rounded-xl border border-sandalwood-border/60 bg-paper p-4 space-y-2">
            <span className="text-xs font-semibold text-ink block">
              Fulfilled Devotional Vows Archive ({allSankalpas.filter((s) => s.status === "completed").length})
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {allSankalpas
                .filter((s) => s.status === "completed")
                .map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between rounded-lg border border-peacock-green/30 bg-tulsi-wash/40 p-2.5"
                  >
                    <div>
                      <span className="font-semibold text-ink block">{s.title}</span>
                      <span className="text-[10px] text-ink-muted">
                        Fulfilled: {s.completed_at ? s.completed_at.slice(0, 10) : "Completed"}
                      </span>
                    </div>
                    <Badge variant="peacock" className="text-[10px]">
                      {s.completed_rounds} rounds
                    </Badge>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Sacred Lifetime Totals Banner */}
        <div className="rounded-2xl border border-gold-border/80 bg-gradient-to-br from-paper via-gold-wash/30 to-paper p-5 sm:p-6 shadow-2xs">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center sm:text-left">
            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider block">
                Total Lifetime Rounds
              </span>
              <span className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-ink tabular-nums block">
                {analytics.lifetimeRounds.toLocaleString()}
              </span>
              <span className="text-[11px] text-ink-muted">rounds offered</span>
            </div>

            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider block">
                Holy Names Chanted
              </span>
              <span className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-gold-ink tabular-nums block">
                {totalHolyNamesChanted.toLocaleString()}
              </span>
              <span className="text-[11px] text-ink-muted">holy names uttered</span>
            </div>

            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider block">
                Chanting Days Dedicated
              </span>
              <span className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-peacock-deep tabular-nums block">
                {analytics.totalChantingDays}
              </span>
              <span className="text-[11px] text-ink-muted">calendar days with japa</span>
            </div>

            <div>
              <span className="text-xs text-ink-muted uppercase tracking-wider block">
                Longest Sacred Streak
              </span>
              <span className="mt-1 font-serif text-2xl sm:text-3xl font-bold text-ink tabular-nums block">
                {analytics.longestStreak}
              </span>
              <span className="text-[11px] text-ink-muted">consecutive days met</span>
            </div>
          </div>
        </div>

        {/* Milestones Progression Cards Grid (10, 50, 100, 500, 1k, 5k, 10k rounds + streaks) */}
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
          {analytics.milestones.map((m) => (
            <Card
              key={m.code}
              surface={m.achieved ? "elevated" : "linen"}
              className={cn(
                "rounded-2xl flex flex-col justify-between p-4 sm:p-5 shadow-2xs transition-all",
                m.achieved
                  ? "border-peacock-green/40 bg-gradient-to-br from-paper to-tulsi-wash/40"
                  : "border-sandalwood-border/70"
              )}
            >
              <CardHeader className="p-0">
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={m.achieved ? "peacock" : "neutral"} className="text-[10px]">
                    {m.achieved ? "Reached" : "In progress"}
                  </Badge>
                  <Sparkles
                    className={
                      m.achieved
                        ? "size-4 text-gold-antique"
                        : "size-4 text-ink-muted/50"
                    }
                    strokeWidth={1.75}
                    aria-hidden={true}
                  />
                </div>
                <CardTitle className="mt-2 text-base font-serif font-bold text-ink">
                  {m.title}
                </CardTitle>
                <CardDescription className="text-xs text-ink-muted opacity-100 mt-1 leading-relaxed">
                  {m.description}
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 mt-4">
                <div className="flex justify-between text-[11px] text-ink-muted mb-1">
                  <span>Progress</span>
                  <span className="font-semibold text-ink tabular-nums">
                    {Math.min(m.currentValue, m.thresholdValue).toLocaleString()} /{" "}
                    {m.thresholdValue.toLocaleString()}
                  </span>
                </div>
                <ProgressBar
                  value={Math.min(m.currentValue, m.thresholdValue)}
                  max={m.thresholdValue}
                  label="Personal progress"
                  tone={m.achieved ? "peacock" : "gold"}
                />
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Respectful Devotional Closing Note */}
        <div className="rounded-2xl border border-sandalwood-border/60 bg-paper/60 p-4 sm:p-5 text-center space-y-1">
          <p className="font-serif text-sm font-semibold text-ink">
            “In this endeavour there is no loss or diminution, and a little advancement upon this path can protect one from the most dangerous type of fear.”
          </p>
          <p className="text-[11px] text-ink-muted">
            — Bhagavad Gītā 2.40 · Every round offered in love remains eternally preserved.
          </p>
        </div>
      </section>

      {/* =========================================================================
          DATA TRANSPARENCY MODAL
          Explains exact mathematical derivation, remainder rules, and idempotency
         ========================================================================= */}
      {showTransparencyModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="transparency-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70 backdrop-blur-xs animate-in fade-in duration-200"
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-sandalwood-border/90 bg-paper p-5 sm:p-6 shadow-sacred-lg text-ink space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-sandalwood-border/60">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-peacock-deep" />
                <h3 id="transparency-modal-title" className="font-serif text-lg font-bold text-ink">
                  Smaran Data Transparency &amp; Counting Rules
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowTransparencyModal(false)}
                className="p-1 rounded-md text-ink-muted hover:text-ink hover:bg-gold-wash/50 transition-colors cursor-pointer"
                aria-label="Close transparency modal"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs leading-relaxed text-ink-muted">
              <div className="rounded-xl border border-sandalwood-border/50 bg-linen/50 p-3 space-y-1">
                <strong className="text-ink font-semibold block text-sm">
                  1. Canonical Counting Standard
                </strong>
                <p>
                  Exactly <strong>108 sacred names</strong> equal 1 completed round. There are no fractional rounds recorded in lifetime or streak calculations.
                </p>
              </div>

              <div className="rounded-xl border border-sandalwood-border/50 bg-linen/50 p-3 space-y-1">
                <strong className="text-ink font-semibold block text-sm">
                  2. Manual Counter &amp; Persistent Remainder
                </strong>
                <p>
                  When chanting via the Manual Counter, names are entered in numerical increments. Full 108 multiples immediately credit completed rounds, while remaining beads (1–107) are safely stored in your persistent profile balance for subsequent sessions.
                </p>
              </div>

              <div className="rounded-xl border border-sandalwood-border/50 bg-linen/50 p-3 space-y-1">
                <strong className="text-ink font-semibold block text-sm">
                  3. Reverted Records &amp; Corrections
                </strong>
                <p>
                  Any submission undone or corrected in the workspace is marked with <code>is_reverted = true</code>. Reverted entries are strictly excluded from daily sadhana, streak, monthly, and lifetime aggregations.
                </p>
              </div>

              <div className="rounded-xl border border-sandalwood-border/50 bg-linen/50 p-3 space-y-1">
                <strong className="text-ink font-semibold block text-sm">
                  4. Transactional Idempotency
                </strong>
                <p>
                  All database operations execute through PostgreSQL transactional RPCs with unique idempotency keys, guaranteeing that network retries never double-count rounds.
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowTransparencyModal(false)}
                className="rounded-xl border border-gold-border/80 bg-gold-wash/80 px-4 py-2 text-xs font-semibold text-gold-ink hover:bg-gold-wash shadow-2xs transition-all cursor-pointer"
              >
                Understood &amp; Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
