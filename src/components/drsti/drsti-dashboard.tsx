"use client";

import * as React from "react";
import Link from "next/link";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Flame,
  Minus,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import type { DailySadhana } from "@/lib/domain/sadhana";
import type {
  SadhanaAnalyticsSummary,
} from "@/lib/sadhana/analytics";
import type {
  PersonalDashboardMetrics,
  SadhanaDayDetailPayload,
} from "@/lib/sadhana/queries";
import type { SankalpaRecord } from "@/lib/sankalpa/types";
import { summarizeSankalpa } from "@/lib/sankalpa/queries";
import { ConsistencyHeatmap } from "@/components/sadhana/consistency-heatmap";
import {
  DailyTrendChart,
  MonthlyTrendChart,
} from "@/components/sadhana/analytics-view";
import { LotusEmblem, ManuscriptDivider } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProgressBar, SacredRingProgress } from "@/components/ui/progress";
import { cn } from "@/lib/cn";

export interface DrstiDashboardProps {
  displayName: string;
  timezone: string;
  todayDate: string;
  todaySadhana: DailySadhana;
  metrics: PersonalDashboardMetrics;
  analytics: SadhanaAnalyticsSummary;
  activeSankalpa: SankalpaRecord | null;
  sankalpas: SankalpaRecord[];
  initialDayDetail: SadhanaDayDetailPayload;
}

function formatDevotionalDate(isoDate: string, timezone: string): string {
  try {
    const [year, month, day] = isoDate.split("-").map(Number);
    const d = new Date(Date.UTC(year!, month! - 1, day!));
    return new Intl.DateTimeFormat("en-US", {
      timeZone: timezone,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(d);
  } catch {
    return isoDate;
  }
}

export function DrstiDashboard({
  displayName,
  timezone,
  todayDate,
  todaySadhana,
  metrics,
  analytics,
  activeSankalpa,
  initialDayDetail,
}: DrstiDashboardProps) {
  const [activeTrendTab, setActiveTrendTab] = React.useState<"daily" | "monthly">("daily");

  const formattedDate = React.useMemo(
    () => formatDevotionalDate(todayDate, timezone),
    [todayDate, timezone]
  );

  const sankalpaSummary = React.useMemo(
    () => (activeSankalpa ? summarizeSankalpa(activeSankalpa) : null),
    [activeSankalpa]
  );

  const currentYear = new Date().getFullYear();
  const selectedMonthObj = analytics.availableMonths.find(
    (m) => m.monthIndex === analytics.selectedMonth
  );
  const selectedMonthLabel = selectedMonthObj?.monthLabel ?? "Selected Month";

  const isTodayComplete = todaySadhana.completed_rounds >= todaySadhana.effective_daily_target;
  const carryForwardAmount = todaySadhana.previous_pending_balance;

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
      {/* =========================================================================
          SECTION A: Welcome & Overview Hero
         ========================================================================= */}
      <section aria-label="Welcome and Daily Sādhana Overview" className="space-y-6">
        {/* Sacred DṚṢṬI Jharokha Hero Sanctuary */}
        <div className="relative overflow-hidden rounded-3xl border border-gold-border/70 bg-gradient-to-br from-paper via-paper to-gold-wash/30 p-6 sm:p-8 shadow-xs">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Content (7 cols): Devotional Vision & Gita Shloka */}
            <div className="lg:col-span-7 space-y-4 text-left">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="gold" className="text-xs">
                  <LotusEmblem size={13} className="text-[#8C6F2D]" />
                  <span>DṚṢṬI · दृष्टि · Spiritual Vision</span>
                </Badge>
                <span className="text-xs text-ink-muted">({timezone})</span>
              </div>

              <div>
                <h1 className="font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  Hare Krishna, {displayName}
                </h1>
                <p className="mt-1 font-serif text-sm text-ink-muted sm:text-base">
                  {formattedDate} · Look through the sacred window of divine remembrance.
                </p>
              </div>

              {/* Sacred Bhagavad Gītā 6.30 Darshan Inscription */}
              <div className="rounded-2xl border border-gold-border/60 bg-gold-wash/50 p-4 text-ink shadow-2xs">
                <p className="font-devanagari text-xs sm:text-sm font-semibold text-gold-ink leading-relaxed">
                  यो मां पश्यति सर्वत्र सर्वं च मयि पश्यति ।<br className="hidden sm:inline" />
                  तस्याहं न प्रणश्यामि स च मे न प्रणश्यति ॥
                </p>
                <p className="mt-1.5 font-serif text-xs text-ink-muted italic leading-relaxed">
                  “For one who sees Me everywhere and sees everything in Me, I am never lost to him, nor is he ever lost to Me.”
                </p>
                <span className="mt-1 block text-[10px] font-semibold uppercase tracking-wider text-gold-ink">
                  — Bhagavad Gītā 6.30 · DṚṢṬI Darśana
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/sadhana/chant"
                  className={buttonStyles({
                    variant: "primary",
                    size: "md",
                    className: "shadow-xs active:scale-[0.98]",
                  })}
                >
                  <Flame className="size-4" aria-hidden="true" />
                  <span>Continue Chanting</span>
                </Link>

                <Dialog>
                  <DialogTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sandalwood-border/80 bg-paper hover:bg-linen px-3.5 py-2 text-xs font-semibold text-ink transition-all shadow-2xs cursor-pointer active:scale-[0.97]"
                    >
                      <Sparkles className="size-3.5 text-gold-antique" />
                      <span>View Sacred Darśana</span>
                    </button>
                  </DialogTrigger>
                  <DialogContent
                    title="DṚṢṬI — Sri Krishna at the Jharokha"
                    description="Sacred contemplation on divine vision and remembrance"
                    className="max-w-md p-6"
                  >
                    <div className="space-y-4 pt-2">
                      <div className="overflow-hidden rounded-2xl border border-gold-border/80 shadow-md">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src="/media/krishna-jharokha-drsti.jpg"
                          alt="Sri Krishna gazing upon holy Vrindavan from the palace jharokha"
                          className="h-auto w-full object-cover"
                        />
                      </div>
                      <div className="rounded-xl bg-gold-wash/60 p-3 text-xs text-ink-muted space-y-1">
                        <p className="font-semibold text-gold-ink">The Vision of DṚṢṬI</p>
                        <p>
                          Standing in the arched jharokha of royal Vrindavan, Sri Krishna gazes with affectionate grace upon every sincere devotee. Every round chanted is a window connecting the heart directly to His lotus feet.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>

            {/* Right Side (5 cols): The Arched Jharokha Window Artwork */}
            <div className="lg:col-span-5 flex justify-center">
              <Dialog>
                <DialogTrigger asChild>
                  <div
                    role="button"
                    tabIndex={0}
                    className="group relative cursor-pointer overflow-hidden rounded-t-[3.5rem] rounded-b-2xl border-2 border-gold-border/80 bg-paper p-1.5 shadow-sacred-md ring-1 ring-gold-border/30 transition-all duration-300 hover:shadow-sacred-lg hover:border-gold-antique focus:outline-none focus:ring-2 focus:ring-gold-antique max-w-[280px] sm:max-w-[320px] w-full active:scale-[0.99]"
                    title="Click to view full sacred Darśana"
                  >
                    {/* Arched Window Image Container */}
                    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-[3.2rem] rounded-b-xl bg-linen">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/media/krishna-jharokha-drsti.jpg"
                        alt="Sri Krishna gazing upon holy Vrindavan from the palace jharokha"
                        className="h-full w-full object-cover object-center filter brightness-[0.98] contrast-[1.03] transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.04]"
                      />
                      {/* Subtle ambient lighting vignette */}
                      <div
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-ink/75 via-transparent to-ink/20"
                      />
                      {/* Golden Plaque Label at Base of Jharokha */}
                      <div className="absolute inset-x-2 bottom-2 z-10 flex items-center justify-between rounded-lg bg-paper/90 px-3 py-1.5 backdrop-blur-xs border border-gold-border/50 shadow-2xs">
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-ink">
                          <LotusEmblem size={12} className="text-gold-antique" />
                          <span>Vrindavan Darśana</span>
                        </div>
                        <span className="text-[10px] text-gold-ink font-medium">Click to expand</span>
                      </div>
                    </div>
                  </div>
                </DialogTrigger>
                <DialogContent
                  title="DṚṢṬI — Sri Krishna at the Jharokha"
                  description="Sacred contemplation on divine vision and remembrance"
                  className="max-w-md p-6"
                >
                  <div className="space-y-4 pt-2">
                    <div className="overflow-hidden rounded-2xl border border-gold-border/80 shadow-md">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src="/media/krishna-jharokha-drsti.jpg"
                        alt="Sri Krishna gazing upon holy Vrindavan from the palace jharokha"
                        className="h-auto w-full object-cover"
                      />
                    </div>
                    <div className="rounded-xl bg-gold-wash/60 p-3 text-xs text-ink-muted space-y-1">
                      <p className="font-semibold text-gold-ink">The Vision of DṚṢṬI</p>
                      <p>
                        Standing in the arched jharokha of royal Vrindavan, Sri Krishna gazes with affectionate grace upon every sincere devotee. Every round chanted is a window connecting the heart directly to His lotus feet.
                      </p>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Glanceable Overview Card */}
        <Card surface="parchment" className="relative overflow-hidden border-[#E5DDD0] shadow-sm">
          <CardContent className="p-6 sm:p-8">
            <div className="grid gap-8 lg:grid-cols-[auto_1fr_auto] lg:items-center">
              {/* Circular Progress Ring */}
              <div className="flex flex-col items-center justify-center border-b border-sandalwood-border/60 pb-6 lg:border-b-0 lg:border-r lg:pr-8 lg:pb-0">
                <SacredRingProgress
                  value={todaySadhana.completed_rounds}
                  max={todaySadhana.effective_daily_target}
                  size={124}
                  strokeWidth={8}
                  label="Today's Japa Progress"
                />
                <span className="mt-2 text-xs font-semibold uppercase tracking-wider text-ink-muted">
                  Daily Round Target
                </span>
              </div>

              {/* Central Key Metrics */}
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2">
                    {isTodayComplete ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-peacock-green/10 px-2.5 py-0.5 text-xs font-semibold text-peacock-green">
                        <CheckCircle2 className="size-3.5" />
                        Daily Target Fulfilled
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-[#8C6F2D]/10 px-2.5 py-0.5 text-xs font-semibold text-[#8C6F2D]">
                        <Sparkles className="size-3.5" />
                        Japa In Progress
                      </span>
                    )}
                    {todaySadhana.extra_rounds > 0 && (
                      <span className="text-xs text-peacock-deep font-medium">
                        +{todaySadhana.extra_rounds} bonus rounds offered
                      </span>
                    )}
                  </div>
                  <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
                    {todaySadhana.completed_rounds} of {todaySadhana.effective_daily_target} Rounds
                  </h2>
                  <p className="mt-1 text-sm text-ink-muted">
                    {isTodayComplete ? (
                      <span>Wonderful consistency! You have met your daily commitment.</span>
                    ) : (
                      <span>
                        <strong className="text-ink font-semibold">
                          {todaySadhana.remaining_balance}
                        </strong>{" "}
                        {todaySadhana.remaining_balance === 1 ? "round" : "rounds"} remaining to reach
                        today&apos;s goal.
                      </span>
                    )}
                  </p>
                </div>

                {/* Sub-metrics breakdown */}
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-sandalwood-border/80 bg-paper/60 p-3">
                    <span className="block text-[11px] font-medium text-ink-muted uppercase">
                      Effective Target
                    </span>
                    <span className="mt-0.5 block text-lg font-bold text-ink tabular-nums">
                      {todaySadhana.effective_daily_target}
                    </span>
                    {carryForwardAmount > 0 && (
                      <span className="text-[10px] text-[#8C6F2D] font-medium">
                        +{carryForwardAmount} carried over
                      </span>
                    )}
                  </div>

                  <div className="rounded-xl border border-sandalwood-border/80 bg-paper/60 p-3">
                    <span className="block text-[11px] font-medium text-ink-muted uppercase">
                      Completed Today
                    </span>
                    <span className="mt-0.5 block text-lg font-bold text-peacock-green tabular-nums">
                      {todaySadhana.completed_rounds}
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      {Math.round(
                        (todaySadhana.completed_rounds /
                          Math.max(1, todaySadhana.effective_daily_target)) *
                        100
                      )}
                      % achieved
                    </span>
                  </div>

                  <div className="col-span-2 rounded-xl border border-sandalwood-border/80 bg-paper/60 p-3 sm:col-span-1">
                    <span className="block text-[11px] font-medium text-ink-muted uppercase">
                      Remaining
                    </span>
                    <span className="mt-0.5 block text-lg font-bold text-ink tabular-nums">
                      {todaySadhana.remaining_balance}
                    </span>
                    <span className="text-[10px] text-ink-muted">
                      {todaySadhana.remaining_balance === 0 ? "Target met" : "Rounds left"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right: Streak & Lifetime Stats */}
              <div className="flex flex-row gap-3 border-t border-sandalwood-border/60 pt-6 sm:grid sm:grid-cols-2 lg:flex-col lg:border-t-0 lg:border-l lg:pt-0 lg:pl-8">
                {/* Streak Badge Card */}
                <div className="flex-1 rounded-2xl border border-[#7A2638]/20 bg-[#FAF3F5] p-4 text-center lg:min-w-[140px]">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-[#7A2638]/10 text-[#7A2638]">
                    <Flame className="size-5" />
                  </span>
                  <div className="mt-2">
                    <span className="block text-2xl font-bold text-[#7A2638] tabular-nums font-serif">
                      {metrics.currentStreak}
                    </span>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-[#7A2638]/80">
                      Day Streak
                    </span>
                  </div>
                </div>

                {/* Lifetime Rounds Card */}
                <div className="flex-1 rounded-2xl border border-gold-border/60 bg-gold-wash/50 p-4 text-center lg:min-w-[140px]">
                  <span className="inline-flex size-9 items-center justify-center rounded-xl bg-gold-antique/15 text-[#8C6F2D]">
                    <Award className="size-5" />
                  </span>
                  <div className="mt-2">
                    <span className="block text-2xl font-bold text-ink tabular-nums font-serif">
                      {metrics.lifetimeRounds.toLocaleString()}
                    </span>
                    <span className="block text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Lifetime Rounds
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* =========================================================================
          SECTION B: Sankalpa Spotlight
         ========================================================================= */}
      <section aria-label="Sacred Sankalpa Spotlight">
        {sankalpaSummary ? (
          <Card surface="parchment" className="border-[#C29438]/40 bg-gradient-to-br from-paper via-paper to-gold-wash/20 shadow-sm">
            <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Badge variant="gold" className="text-xs">
                    <Flame className="size-3 text-[#8C6F2D]" />
                    <span>Active Sankalpa</span>
                  </Badge>
                  <span className="text-xs text-ink-muted">
                    {sankalpaSummary.status === "active" ? "In Progress" : "Completed"}
                  </span>
                </div>
                <CardTitle className="mt-1.5 font-display text-xl sm:text-2xl text-ink">
                  {sankalpaSummary.title}
                </CardTitle>
                {sankalpaSummary.description && (
                  <CardDescription className="text-xs sm:text-sm text-ink-muted mt-0.5">
                    {sankalpaSummary.description}
                  </CardDescription>
                )}
              </div>

              <Link
                href="/sadhana#sankalpa"
                className={buttonStyles({
                  variant: "secondary",
                  size: "sm",
                  className: "shrink-0",
                })}
              >
                <span>Manage Vows</span>
                <ChevronRight className="size-4" />
              </Link>
            </CardHeader>

            <CardContent className="space-y-4 pt-1">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-ink">
                    Vow Completion: {sankalpaSummary.completedRounds.toLocaleString()} of{" "}
                    {sankalpaSummary.targetRounds.toLocaleString()} Pledged Rounds
                  </span>
                  <span className="font-bold text-[#7A2638] tabular-nums font-serif text-sm sm:text-base">
                    {sankalpaSummary.progressPercentage}%
                  </span>
                </div>
                <ProgressBar
                  value={sankalpaSummary.completedRounds}
                  max={sankalpaSummary.targetRounds}
                  label="Vow completion"
                  showValueLabel={false}
                  tone="gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 pt-1">
                <div className="rounded-xl border border-sandalwood-border/70 bg-paper/80 p-3">
                  <span className="block text-[11px] font-medium text-ink-muted uppercase">
                    Pledged Rounds
                  </span>
                  <span className="mt-0.5 block text-base font-bold text-ink tabular-nums">
                    {sankalpaSummary.targetRounds.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-sandalwood-border/70 bg-paper/80 p-3">
                  <span className="block text-[11px] font-medium text-ink-muted uppercase">
                    Completed Rounds
                  </span>
                  <span className="mt-0.5 block text-base font-bold text-peacock-green tabular-nums">
                    {sankalpaSummary.completedRounds.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-sandalwood-border/70 bg-paper/80 p-3">
                  <span className="block text-[11px] font-medium text-ink-muted uppercase">
                    Remaining Commitment
                  </span>
                  <span className="mt-0.5 block text-base font-bold text-[#7A2638] tabular-nums">
                    {sankalpaSummary.remainingRounds.toLocaleString()}
                  </span>
                </div>
                <div className="rounded-xl border border-sandalwood-border/70 bg-paper/80 p-3">
                  <span className="block text-[11px] font-medium text-ink-muted uppercase">
                    Status
                  </span>
                  <span className="mt-0.5 block text-base font-bold text-ink capitalize">
                    {sankalpaSummary.isCompleted ? "Accomplished" : "Active Flow"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          /* Graceful Empty State for Devotees without an Active Sankalpa */
          <Card surface="parchment" className="border-dashed border-sandalwood-border bg-paper/50">
            <CardContent className="flex flex-col items-center justify-between gap-5 p-6 text-center sm:flex-row sm:text-left">
              <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-start">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-gold-border/70 bg-gold-wash text-[#8C6F2D]">
                  <Flame className="size-6" />
                </span>
                <div>
                  <h3 className="font-display text-lg font-semibold text-ink">
                    Begin a Sacred Sankalpa Vow
                  </h3>
                  <p className="mt-1 max-w-xl text-xs sm:text-sm text-ink-muted">
                    Establish a formal devotional pledge—such as a holy month Kartik vrata,
                    Ekadashi vow, or 1 Lakh Holy Names commitment. Every round offered
                    simultaneously honors your vow and satisfies your daily target.
                  </p>
                </div>
              </div>

              <Link
                href="/sadhana#sankalpa"
                className={buttonStyles({
                  variant: "secondary",
                  size: "md",
                  className: "shrink-0",
                })}
              >
                <span>Establish Sankalpa</span>
                <ChevronRight className="size-4" />
              </Link>
            </CardContent>
          </Card>
        )}
      </section>

      {/* =========================================================================
          SECTION C: Chanting Trends & Visualizations
         ========================================================================= */}
      <section aria-label="Chanting Trends and Comparisons" className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-display text-xl font-bold text-ink sm:text-2xl flex items-center gap-2">
              <TrendingUp className="size-5 text-[#8C6F2D]" />
              <span>Chanting Trends & Rhythm</span>
            </h2>
            <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
              Review daily round consistency and period-over-period rhythm.
            </p>
          </div>

          {/* View Toggle Tabs */}
          <div className="flex items-center gap-1 rounded-xl border border-sandalwood-border bg-linen p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTrendTab("daily")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition-all duration-150",
                activeTrendTab === "daily"
                  ? "bg-paper text-ink shadow-xs"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              Daily ({selectedMonthLabel})
            </button>
            <button
              type="button"
              onClick={() => setActiveTrendTab("monthly")}
              className={cn(
                "rounded-lg px-3 py-1.5 font-medium transition-all duration-150",
                activeTrendTab === "monthly"
                  ? "bg-paper text-ink shadow-xs"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              Monthly ({analytics.selectedYear})
            </button>
          </div>
        </div>

        <Card surface="parchment" className="p-6">
          {/* Month selector chips */}
          <div className="mb-6 flex flex-wrap items-center gap-1.5 border-b border-sandalwood-border/60 pb-4">
            <span className="text-xs font-semibold text-ink-muted uppercase mr-1">
              Month:
            </span>
            {analytics.availableMonths.map((m) => {
              const isSelected = m.monthIndex === analytics.selectedMonth;
              return (
                <Link
                  key={m.monthIndex}
                  href={`/drsti?year=${analytics.selectedYear}&month=${m.monthIndex + 1}`}
                  className={cn(
                    "rounded-lg px-2.5 py-1 text-xs font-medium transition-colors",
                    isSelected
                      ? "bg-gold-antique text-white font-semibold"
                      : "bg-paper text-ink-muted hover:bg-linen hover:text-ink border border-sandalwood-border/60"
                  )}
                >
                  {m.monthShort} ({m.totalRounds})
                </Link>
              );
            })}
          </div>

          {/* Trend Chart Render */}
          {activeTrendTab === "daily" ? (
            <DailyTrendChart
              dailyTrends={analytics.selectedMonthDailyTrends}
              monthLabel={selectedMonthLabel}
              year={analytics.selectedYear}
            />
          ) : (
            <MonthlyTrendChart
              monthlyTrends={analytics.monthlyTrends}
              selectedMonth={analytics.selectedMonth}
              year={analytics.selectedYear}
            />
          )}

          {/* Previous-Period Comparison Footnote */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-sandalwood-border/60 pt-4 text-xs text-ink-muted">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-ink">Month-over-Month Comparison:</span>
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-semibold tabular-nums",
                  analytics.momComparison.trend === "up" && "bg-peacock-green/10 text-peacock-green",
                  analytics.momComparison.trend === "down" && "bg-[#7A2638]/10 text-[#7A2638]",
                  analytics.momComparison.trend === "flat" && "bg-sandalwood-border text-ink-muted"
                )}
              >
                {analytics.momComparison.trend === "up" && <TrendingUp className="size-3" />}
                {analytics.momComparison.trend === "down" && <TrendingDown className="size-3" />}
                {analytics.momComparison.trend === "flat" && <Minus className="size-3" />}
                <span>
                  {analytics.momComparison.absoluteChange >= 0 ? "+" : ""}
                  {analytics.momComparison.absoluteChange} rounds
                </span>
                {analytics.momComparison.percentageChange !== null && (
                  <span>
                    ({analytics.momComparison.percentageChange >= 0 ? "+" : ""}
                    {analytics.momComparison.percentageChange}%)
                  </span>
                )}
              </span>
            </div>

            <span>{analytics.momComparison.label}</span>
          </div>
        </Card>
      </section>

      {/* =========================================================================
          SECTION D: Consistency Calendar (365-Day Heatmap)
         ========================================================================= */}
      <section aria-label="365-Day Japa Consistency Calendar">
        <ConsistencyHeatmap
          selectedYear={analytics.selectedYear}
          currentYear={currentYear}
          todayDate={todayDate}
          weeks={analytics.weeks}
          initialDayDetail={initialDayDetail}
          baseHref="/drsti"
        />
      </section>

      {/* =========================================================================
          SECTION E: Personal Insights Grid
         ========================================================================= */}
      <section aria-label="Personal Devotional Insights" className="space-y-4">
        <div>
          <h2 className="font-display text-xl font-bold text-ink sm:text-2xl flex items-center gap-2">
            <Sparkles className="size-5 text-[#8C6F2D]" />
            <span>Personal Devotional Insights</span>
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Key indicators of your steady discipline, sacred endurance, and progress.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {/* 1. Average Daily Rhythm */}
          <Card surface="parchment" className="p-4 text-center border-sandalwood-border/80">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Average Rhythm
            </span>
            <span className="mt-2 block text-2xl font-bold text-ink tabular-nums font-serif">
              {analytics.averageRoundsPerActiveDay.toFixed(1)}
            </span>
            <span className="mt-1 block text-[11px] text-ink-muted">
              Rounds / Active Day
            </span>
          </Card>

          {/* 2. Total Chanting Days */}
          <Card surface="parchment" className="p-4 text-center border-sandalwood-border/80">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Chanting Days
            </span>
            <span className="mt-2 block text-2xl font-bold text-peacock-green tabular-nums font-serif">
              {analytics.totalChantingDays}
            </span>
            <span className="mt-1 block text-[11px] text-ink-muted">
              Days with recorded Japa
            </span>
          </Card>

          {/* 3. Best Chanting Day */}
          <Card surface="parchment" className="p-4 text-center border-sandalwood-border/80">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Personal Best
            </span>
            <span className="mt-2 block text-2xl font-bold text-[#8C6F2D] tabular-nums font-serif">
              {analytics.bestPersonalDay ? analytics.bestPersonalDay.completedRounds : 0}
            </span>
            <span className="mt-1 block text-[11px] text-ink-muted truncate">
              {analytics.bestPersonalDay ? analytics.bestPersonalDay.date : "No records yet"}
            </span>
          </Card>

          {/* 4. Current & Longest Streak */}
          <Card surface="parchment" className="p-4 text-center border-sandalwood-border/80">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Longest Streak
            </span>
            <span className="mt-2 block text-2xl font-bold text-[#7A2638] tabular-nums font-serif">
              {analytics.longestStreak}
            </span>
            <span className="mt-1 block text-[11px] text-ink-muted">
              Days unbroken practice
            </span>
          </Card>

          {/* 5. Target Achievement Rate */}
          <Card surface="parchment" className="p-4 text-center border-sandalwood-border/80">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              Target Success
            </span>
            <span className="mt-2 block text-2xl font-bold text-ink tabular-nums font-serif">
              {analytics.targetAchievementRatePct}%
            </span>
            <span className="mt-1 block text-[11px] text-ink-muted">
              {analytics.targetMetDays} of {analytics.recordedDays} days met
            </span>
          </Card>

          {/* 6. Selected Year Total */}
          <Card surface="parchment" className="p-4 text-center border-sandalwood-border/80">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-ink-muted">
              {analytics.selectedYear} Total
            </span>
            <span className="mt-2 block text-2xl font-bold text-ink tabular-nums font-serif">
              {analytics.selectedYearCompletedRounds.toLocaleString()}
            </span>
            <span className="mt-1 block text-[11px] text-ink-muted">
              Rounds this year
            </span>
          </Card>
        </div>
      </section>

      {/* =========================================================================
          SECTION F: Lifetime Spiritual Journey & Milestones
         ========================================================================= */}
      <section aria-label="Lifetime Journey and Devotional Milestones" className="space-y-6">
        <div>
          <h2 className="font-display text-xl font-bold text-ink sm:text-2xl flex items-center gap-2">
            <Award className="size-5 text-[#8C6F2D]" />
            <span>Lifetime Spiritual Journey</span>
          </h2>
          <p className="text-xs sm:text-sm text-ink-muted mt-0.5">
            Milestones earned through quiet, honest devotional repetition.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Year-by-Year Journey Breakdown */}
          <Card surface="parchment" className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-semibold text-ink">
                Annual Progress Summary
              </span>
              <span className="text-xs text-ink-muted font-medium">
                Lifetime: {analytics.lifetimeRounds.toLocaleString()} Rounds
              </span>
            </div>

            <div className="space-y-3">
              {analytics.availableYears.map((yr) => {
                const isSelected = yr === analytics.selectedYear;
                const yearRounds =
                  yr === analytics.selectedYear
                    ? analytics.selectedYearCompletedRounds
                    : 0; // The query has accurate row aggregates for all-time
                return (
                  <div
                    key={yr}
                    className={cn(
                      "flex items-center justify-between rounded-xl p-3 border transition-colors",
                      isSelected
                        ? "border-[#C29438]/50 bg-gold-wash/30 font-medium"
                        : "border-sandalwood-border/70 bg-paper/60"
                    )}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="flex size-7 items-center justify-center rounded-lg bg-linen text-xs font-bold text-ink">
                        {yr}
                      </span>
                      <span className="text-xs text-ink-muted">
                        {isSelected ? "Currently Inspected Year" : "Historical Record"}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-bold text-ink tabular-nums">
                        {isSelected
                          ? `${yearRounds.toLocaleString()} rounds`
                          : "View Year"}
                      </span>
                      {!isSelected && (
                        <Link
                          href={`/drsti?year=${yr}`}
                          className="text-xs text-[#7A2638] font-semibold hover:underline"
                        >
                          Explore →
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>

          {/* Devotional Consistency Milestones */}
          <Card surface="parchment" className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-display text-base font-semibold text-ink">
                Devotional Milestones
              </span>
              <span className="text-xs text-peacock-green font-semibold">
                {analytics.milestones.filter((m) => m.achieved).length} of{" "}
                {analytics.milestones.length} Achieved
              </span>
            </div>

            <div className="space-y-3">
              {analytics.milestones.slice(0, 5).map((m) => (
                <div
                  key={m.code}
                  className={cn(
                    "flex items-center gap-3.5 rounded-xl border p-3 transition-colors",
                    m.achieved
                      ? "border-peacock-ink/30 bg-peacock-green/5"
                      : "border-sandalwood-border/70 bg-paper/40 opacity-75"
                  )}
                >
                  <span
                    className={cn(
                      "flex size-9 shrink-0 items-center justify-center rounded-xl",
                      m.achieved
                        ? "bg-peacock-green text-white"
                        : "border border-sandalwood-border bg-linen text-ink-muted"
                    )}
                  >
                    {m.achieved ? (
                      <CheckCircle2 className="size-4" />
                    ) : (
                      <Award className="size-4" />
                    )}
                  </span>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-ink truncate">
                        {m.title}
                      </span>
                      <span className="text-[11px] font-medium tabular-nums text-ink-muted">
                        {m.currentValue} / {m.thresholdValue}
                      </span>
                    </div>
                    <p className="text-[11px] text-ink-muted truncate mt-0.5">
                      {m.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </section>

      {/* Devotional Ornament Footer */}
      <div className="pt-6">
        <ManuscriptDivider className="mx-auto" />
        <p className="mt-4 text-center font-serif text-xs text-ink-muted">
          SMARAN · Non-profit devotional sanctuary · Preserving sacred remembrance
        </p>
      </div>
    </div>
  );
}
