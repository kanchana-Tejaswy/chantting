import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Calendar,
  Flame,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type {
  DayTrendPoint,
  MonthTrendPoint,
  SadhanaAnalyticsSummary,
} from "@/lib/sadhana/analytics";
import type { SadhanaDayDetailPayload } from "@/lib/sadhana/queries";
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
                  : "#EFE8DA";

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

export function AnalyticsView({
  displayName,
  timezone,
  analytics,
  initialDayDetail,
}: AnalyticsViewProps) {
  const currentYear = Number.parseInt(analytics.todayDate.slice(0, 4), 10);
  const currentMonthIdx = Number.parseInt(analytics.todayDate.slice(5, 7), 10) - 1;
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

  return (
    <div className="mx-auto max-w-6xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      {/* Header */}
      <header className="flex flex-col gap-4 border-b border-sandalwood-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <Link
            href="/sadhana"
            className={buttonStyles({
              variant: "ghost",
              size: "sm",
              className: "-ml-3 mb-1",
            })}
          >
            <ArrowLeft className="size-4" strokeWidth={1.75} aria-hidden={true} />
            <span>Back to Dashboard</span>
          </Link>
          <h1 className="font-display text-3xl font-semibold text-ink text-balance sm:text-4xl">
            Consistency &amp; Personal Analytics
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {displayName} · Local calendar in {timezone}
          </p>
        </div>

        <Link
          href="/sadhana/chant"
          className={buttonStyles({ variant: "primary", size: "md" })}
        >
          <Flame className="size-4" strokeWidth={1.75} aria-hidden={true} />
          <span>Open Chanting Space</span>
        </Link>
      </header>

      {/* Empty State Banner for New Users */}
      {!hasAnyRounds && (
        <Card surface="linen">
          <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-krishna-midnight text-gold-antique">
                <LotusEmblem size={20} />
              </span>
              <div>
                <p className="font-serif text-lg font-semibold text-ink">
                  Analytics grow naturally with your practice
                </p>
                <p className="mt-0.5 text-sm text-ink-muted">
                  No completed rounds are recorded yet. Once you complete a
                  round via manual counter or 108-bead Japa Mala, monthly trends,
                  personal bests, and heatmap intensity will populate here.
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

      {/* Four Primary Statistics Cards */}
      <section
        aria-labelledby="primary-analytics-milestones-heading"
        className="space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LotusEmblem size={16} className="text-gold-antique" />
            <h2
              id="primary-analytics-milestones-heading"
              className="font-serif text-lg font-semibold text-ink"
            >
              Chanting Statistics &amp; Milestones
            </h2>
          </div>
          <span className="text-xs text-ink-muted">
            Authoritative completed rounds · {timezone}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          <Card
            surface="elevated"
            className="rounded-[16px] border border-peacock-green/30 bg-tulsi-wash/60 p-4"
          >
            <p className="text-xs font-medium text-peacock-ink">Today</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-peacock-deep tabular-nums sm:text-3xl">
              {analytics.todayCompletedRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">Today&apos;s rounds</p>
          </Card>

          <Card
            surface="elevated"
            className="rounded-[16px] border border-sandalwood-border/80 bg-paper p-4"
          >
            <p className="text-xs font-medium text-ink-muted">
              {selectedMonthLabel}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums sm:text-3xl">
              {analytics.selectedMonthCompletedRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Monthly total ({analytics.selectedYear})
            </p>
          </Card>

          <Card
            surface="elevated"
            className="rounded-[16px] border border-sandalwood-border/80 bg-paper p-4"
          >
            <p className="text-xs font-medium text-ink-muted">
              {analytics.selectedYear} Total
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums sm:text-3xl">
              {analytics.selectedYearCompletedRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">Yearly total</p>
          </Card>

          <Card
            surface="elevated"
            className="rounded-[16px] border border-gold-border/50 bg-gold-wash/50 p-4"
          >
            <p className="text-xs font-medium text-gold-ink">Lifetime</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-gold-ink tabular-nums sm:text-3xl">
              {analytics.lifetimeRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Total rounds offered
            </p>
          </Card>
        </div>
      </section>

      {/* Historical Period Selector */}
      <section
        aria-label="Historical period selection"
        className="rounded-[18px] border border-sandalwood-border/90 bg-paper/95 p-4 shadow-sacred-xs sm:p-5"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-peacock-deep" aria-hidden={true} />
              <h2 className="font-serif text-base font-semibold text-ink">
                Select Historical Period
              </h2>
            </div>
            <p className="text-xs text-ink-muted">
              Choose any previous month or year to inspect historical analytics.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Year Selector Pills */}
            <div className="flex items-center gap-1.5 rounded-[12px] border border-sandalwood-border bg-linen/70 p-1">
              {analytics.availableYears.map((yr) => (
                <Link
                  key={yr}
                  href={`/sadhana/analytics?year=${yr}&month=${analytics.selectedMonth + 1}`}
                  className={cn(
                    "rounded-[8px] px-3 py-1 text-xs font-semibold tabular-nums transition-colors",
                    yr === analytics.selectedYear
                      ? "bg-krishna-midnight text-ink-on-dark shadow-xs"
                      : "text-ink-muted hover:bg-paper hover:text-ink"
                  )}
                >
                  {yr}
                </Link>
              ))}
            </div>

            {/* Quick jump to Current Period */}
            {isViewingHistorical && (
              <Link
                href="/sadhana/analytics"
                className={buttonStyles({
                  variant: "ghost",
                  size: "sm",
                  className: "text-xs font-medium text-peacock-deep",
                })}
              >
                Jump to Current
              </Link>
            )}
          </div>
        </div>

        {/* 12 Month Selector Strip */}
        <div className="mt-4 grid grid-cols-3 gap-1.5 sm:grid-cols-6 lg:grid-cols-12">
          {analytics.availableMonths.map((m) => {
            const isSelected = m.monthIndex === analytics.selectedMonth;
            return (
              <Link
                key={m.monthIndex}
                href={`/sadhana/analytics?year=${analytics.selectedYear}&month=${m.monthIndex + 1}`}
                className={cn(
                  "flex flex-col items-center justify-center rounded-[10px] p-2 text-center transition-all",
                  isSelected
                    ? "bg-peacock-deep font-semibold text-ink-on-dark ring-1 ring-gold-antique/50 shadow-xs"
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
      </section>

      {/* Period Comparisons: Month-over-Month & Year-over-Year */}
      <section
        aria-labelledby="comparisons-heading"
        className="grid gap-6 md:grid-cols-2"
      >
        <Card surface="elevated" className="rounded-[20px] p-5 sm:p-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle id="comparisons-heading" className="text-lg font-serif">
                Month-over-Month Comparison
              </CardTitle>
              <Badge
                variant={
                  analytics.momComparison.trend === "up"
                    ? "peacock"
                    : analytics.momComparison.trend === "down"
                      ? "neutral"
                      : "gold"
                }
                className="gap-1 shadow-xs"
              >
                {analytics.momComparison.trend === "up" ? (
                  <TrendingUp className="size-3" aria-hidden={true} />
                ) : analytics.momComparison.trend === "down" ? (
                  <TrendingDown className="size-3" aria-hidden={true} />
                ) : (
                  <Minus className="size-3" aria-hidden={true} />
                )}
                <span>
                  {analytics.momComparison.percentageChange !== null
                    ? `${analytics.momComparison.percentageChange >= 0 ? "+" : ""}${analytics.momComparison.percentageChange}%`
                    : analytics.momComparison.trend}
                </span>
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {analytics.momComparison.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-linen/80 p-3.5">
                <p className="text-xs text-ink-muted">Selected month</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-peacock-deep tabular-nums">
                  {analytics.momComparison.currentTotal}
                </p>
                <p className="text-[11px] text-ink-muted">rounds completed</p>
              </div>
              <div className="rounded-[12px] bg-linen/80 p-3.5">
                <p className="text-xs text-ink-muted">Prior month</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
                  {analytics.momComparison.previousTotal}
                </p>
                <p className="text-[11px] text-ink-muted">rounds completed</p>
              </div>
            </div>
            <div className="rounded-[12px] border border-sandalwood-border/80 bg-paper p-3 text-xs text-ink-muted">
              Difference:{" "}
              <strong className="font-semibold text-ink tabular-nums">
                {analytics.momComparison.absoluteChange >= 0
                  ? `+${analytics.momComparison.absoluteChange}`
                  : analytics.momComparison.absoluteChange}{" "}
                rounds
              </strong>{" "}
              from the preceding month.
            </div>
          </CardContent>
        </Card>

        <Card surface="elevated" className="rounded-[20px] p-5 sm:p-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-lg font-serif">
                Year-over-Year Comparison
              </CardTitle>
              <Badge
                variant={
                  analytics.yoyComparison.trend === "up"
                    ? "peacock"
                    : analytics.yoyComparison.trend === "down"
                      ? "neutral"
                      : "gold"
                }
                className="gap-1 shadow-xs"
              >
                {analytics.yoyComparison.trend === "up" ? (
                  <TrendingUp className="size-3" aria-hidden={true} />
                ) : analytics.yoyComparison.trend === "down" ? (
                  <TrendingDown className="size-3" aria-hidden={true} />
                ) : (
                  <Minus className="size-3" aria-hidden={true} />
                )}
                <span>
                  {analytics.yoyComparison.percentageChange !== null
                    ? `${analytics.yoyComparison.percentageChange >= 0 ? "+" : ""}${analytics.yoyComparison.percentageChange}%`
                    : analytics.yoyComparison.trend}
                </span>
              </Badge>
            </div>
            <CardDescription className="text-xs">
              {analytics.yoyComparison.label}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[12px] bg-linen/80 p-3.5">
                <p className="text-xs text-ink-muted">{analytics.selectedYear} total</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-gold-ink tabular-nums">
                  {analytics.yoyComparison.currentTotal}
                </p>
                <p className="text-[11px] text-ink-muted">rounds completed</p>
              </div>
              <div className="rounded-[12px] bg-linen/80 p-3.5">
                <p className="text-xs text-ink-muted">{analytics.selectedYear - 1} total</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
                  {analytics.yoyComparison.previousTotal}
                </p>
                <p className="text-[11px] text-ink-muted">rounds completed</p>
              </div>
            </div>
            <div className="rounded-[12px] border border-sandalwood-border/80 bg-paper p-3 text-xs text-ink-muted">
              Difference:{" "}
              <strong className="font-semibold text-ink tabular-nums">
                {analytics.yoyComparison.absoluteChange >= 0
                  ? `+${analytics.yoyComparison.absoluteChange}`
                  : analytics.yoyComparison.absoluteChange}{" "}
                rounds
              </strong>{" "}
              compared to prior year.
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Daily & Monthly Trend Charts */}
      <section
        aria-labelledby="trend-charts-heading"
        className="grid gap-6 lg:grid-cols-2"
      >
        <Card surface="parchment" className="rounded-[20px] p-5 sm:p-6">
          <CardHeader>
            <CardTitle id="trend-charts-heading" className="text-xl font-serif">
              Daily Trend · {selectedMonthLabel} {analytics.selectedYear}
            </CardTitle>
            <CardDescription>
              Completed rounds per day versus your daily target.
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

        <Card surface="parchment" className="rounded-[20px] p-5 sm:p-6">
          <CardHeader>
            <CardTitle className="text-xl font-serif">
              Monthly Trend · {analytics.selectedYear}
            </CardTitle>
            <CardDescription>
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
      </section>

      {/* Best Chanting Days & Daily Averages */}
      <section
        aria-labelledby="best-days-averages-heading"
        className="space-y-4"
      >
        <h2
          id="best-days-averages-heading"
          className="font-serif text-xl font-semibold text-ink"
        >
          Best Chanting Days &amp; Daily Averages
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Card surface="parchment" className="rounded-[16px] p-4">
            <p className="text-xs text-ink-muted">All-Time Best Day</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-gold-ink tabular-nums">
              {analytics.bestPersonalDay
                ? `${analytics.bestPersonalDay.completedRounds} rounds`
                : "—"}
            </p>
            <p className="text-[11px] text-ink-muted">
              {analytics.bestPersonalDay
                ? analytics.bestPersonalDay.date
                : "No records yet"}
            </p>
          </Card>

          <Card surface="parchment" className="rounded-[16px] p-4">
            <p className="text-xs text-ink-muted">
              Best Day in {analytics.selectedYear}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-peacock-deep tabular-nums">
              {analytics.bestDayInYear
                ? `${analytics.bestDayInYear.completedRounds} rounds`
                : "—"}
            </p>
            <p className="text-[11px] text-ink-muted">
              {analytics.bestDayInYear
                ? analytics.bestDayInYear.date
                : "No records in year"}
            </p>
          </Card>

          <Card surface="parchment" className="rounded-[16px] p-4">
            <p className="text-xs text-ink-muted">
              Best Day in {selectedMonthLabel}
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-peacock-deep tabular-nums">
              {analytics.bestDayInMonth
                ? `${analytics.bestDayInMonth.completedRounds} rounds`
                : "—"}
            </p>
            <p className="text-[11px] text-ink-muted">
              {analytics.bestDayInMonth
                ? analytics.bestDayInMonth.date
                : "No records in month"}
            </p>
          </Card>

          <Card surface="parchment" className="rounded-[16px] p-4">
            <p className="text-xs text-ink-muted">Lifetime Daily Average</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
              {analytics.averageRoundsPerActiveDay}
            </p>
            <p className="text-[11px] text-ink-muted">
              rounds per active day
            </p>
          </Card>

          <Card surface="parchment" className="rounded-[16px] p-4">
            <p className="text-xs text-ink-muted">
              {analytics.selectedYear} Daily Average
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
              {analytics.selectedYearAverageRounds}
            </p>
            <p className="text-[11px] text-ink-muted">
              rounds per active day in {analytics.selectedYear}
            </p>
          </Card>

          <Card surface="parchment" className="rounded-[16px] p-4">
            <p className="text-xs text-ink-muted">
              {selectedMonthLabel} Daily Average
            </p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
              {analytics.selectedMonthAverageRounds}
            </p>
            <p className="text-[11px] text-ink-muted">
              rounds per active day in {selectedMonthLabel}
            </p>
          </Card>
        </div>
      </section>

      {/* Annual Consistency Heatmap + Selected Date Detail */}
      <ConsistencyHeatmap
        selectedYear={analytics.selectedYear}
        currentYear={currentYear}
        todayDate={analytics.todayDate}
        weeks={analytics.weeks}
        initialDayDetail={initialDayDetail}
      />

      <ManuscriptDivider />

      {/* Yearly & Monthly Breakdown */}
      <section
        aria-labelledby="yearly-monthly-heading"
        className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]"
      >
        <Card surface="sanctum">
          <CardHeader>
            <div className="flex items-center justify-between gap-2">
              <CardTitle
                id="yearly-monthly-heading"
                className="flex items-center gap-2"
              >
                <TrendingUp
                  className="size-4 text-gold-antique"
                  strokeWidth={1.75}
                  aria-hidden={true}
                />
                <span>{analytics.yearlyStats.year} Yearly Summary</span>
              </CardTitle>
              <Badge variant="sanctum" className="tabular-nums">
                {analytics.yearlyStats.totalRounds} rounds
              </Badge>
            </div>
            <CardDescription className="text-ink-muted-dark opacity-100">
              Aggregated strictly from your local calendar dates in{" "}
              {analytics.yearlyStats.year}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-[12px] bg-krishna-elevated p-3.5">
                <dt className="text-xs text-ink-muted-dark">Active days</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-ink-on-dark tabular-nums">
                  {analytics.yearlyStats.chantingDays}
                </dd>
              </div>
              <div className="rounded-[12px] bg-krishna-elevated p-3.5">
                <dt className="text-xs text-ink-muted-dark">Targets met</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-ink-on-dark tabular-nums">
                  {analytics.yearlyStats.targetMetDays}
                </dd>
              </div>
              <div className="rounded-[12px] bg-krishna-elevated p-3.5">
                <dt className="text-xs text-ink-muted-dark">Avg / active day</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-ink-on-dark tabular-nums">
                  {analytics.yearlyStats.averageRoundsPerActiveDay}
                </dd>
              </div>
              <div className="rounded-[12px] bg-krishna-elevated p-3.5">
                <dt className="text-xs text-ink-muted-dark">Best streak in year</dt>
                <dd className="mt-1 font-serif text-2xl font-semibold text-gold-antique tabular-nums">
                  {analytics.yearlyStats.longestStreakInYear}d
                </dd>
              </div>
            </dl>

            <ProgressBar
              value={analytics.yearlyStats.achievementRatePct}
              max={100}
              label="Yearly target achievement rate"
              tone="sanctum"
              className="mt-5"
            />
          </CardContent>
        </Card>

        <Card surface="parchment">
          <CardHeader>
            <CardTitle>
              Monthly Progress Comparison ({analytics.selectedYear})
            </CardTitle>
            <CardDescription>
              Completed rounds, active chanting days, and target attainment across
              all 12 months.
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
      </section>

      <ManuscriptDivider />

      {/* Personal Consistency Milestones */}
      <section aria-labelledby="milestones-heading" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <h2
              id="milestones-heading"
              className="flex items-center gap-2 font-serif text-2xl font-semibold text-ink"
            >
              <Award
                className="size-5 text-gold-antique"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Personal Consistency Milestones</span>
            </h2>
            <p className="mt-1 text-sm text-ink-muted">
              Private encouragement for steady daily practice—never a measure of
              spiritual comparison.
            </p>
          </div>
          <Badge variant="neutral" className="tabular-nums">
            {analytics.milestones.filter((m) => m.achieved).length} /{" "}
            {analytics.milestones.length} reached
          </Badge>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {analytics.milestones.map((m) => (
            <Card
              key={m.code}
              surface={m.achieved ? "elevated" : "linen"}
              className="flex flex-col justify-between"
            >
              <CardHeader>
                <div className="flex items-center justify-between gap-2">
                  <Badge variant={m.achieved ? "peacock" : "neutral"}>
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
                <CardTitle className="mt-2 text-lg">{m.title}</CardTitle>
                <CardDescription className="text-ink-muted opacity-100">
                  {m.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
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
      </section>
    </div>
  );
}
