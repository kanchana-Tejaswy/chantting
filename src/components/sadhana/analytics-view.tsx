import Link from "next/link";
import { ArrowLeft, Award, Flame, Sparkles, TrendingUp } from "lucide-react";
import type { SadhanaAnalyticsSummary } from "@/lib/sadhana/analytics";
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

export interface AnalyticsViewProps {
  displayName: string;
  timezone: string;
  analytics: SadhanaAnalyticsSummary;
  initialDayDetail: SadhanaDayDetailPayload;
}

export function AnalyticsView({
  displayName,
  timezone,
  analytics,
  initialDayDetail,
}: AnalyticsViewProps) {
  const currentYear = Number.parseInt(analytics.todayDate.slice(0, 4), 10);
  const maxMonthRounds = Math.max(
    1,
    ...analytics.monthlyStats.map((m) => m.totalRounds)
  );
  const hasAnyRounds = analytics.lifetimeRounds > 0;

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

      {/* Lifetime Metrics Grid */}
      <section aria-labelledby="lifetime-stats-heading" className="space-y-4">
        <h2
          id="lifetime-stats-heading"
          className="font-serif text-xl font-semibold text-ink"
        >
          Lifetime Practice Summary
        </h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          <Card surface="parchment" className="p-4">
            <p className="text-xs text-ink-muted">Lifetime rounds</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
              {analytics.lifetimeRounds}
            </p>
          </Card>

          <Card surface="parchment" className="p-4">
            <p className="text-xs text-ink-muted">Active chanting days</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-peacock-ink tabular-nums">
              {analytics.totalChantingDays}
            </p>
            <p className="text-[11px] text-ink-muted tabular-nums">
              of {analytics.recordedDays} recorded days
            </p>
          </Card>

          <Card surface="parchment" className="p-4">
            <p className="text-xs text-ink-muted">Current streak</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
              {analytics.currentStreak}d
            </p>
            <p className="text-[11px] text-ink-muted tabular-nums">
              Longest: {analytics.longestStreak}d
            </p>
          </Card>

          <Card surface="parchment" className="p-4">
            <p className="text-xs text-ink-muted">Avg / active day</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
              {analytics.averageRoundsPerActiveDay}
            </p>
          </Card>

          <Card surface="parchment" className="p-4">
            <p className="text-xs text-ink-muted">Target achievement</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-peacock-ink tabular-nums">
              {analytics.targetAchievementRatePct}%
            </p>
            <p className="text-[11px] text-ink-muted tabular-nums">
              {analytics.targetMetDays} / {analytics.recordedDays} days met
            </p>
          </Card>

          <Card surface="parchment" className="p-4">
            <p className="text-xs text-ink-muted">Best personal day</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-gold-ink tabular-nums">
              {analytics.bestPersonalDay
                ? analytics.bestPersonalDay.completedRounds
                : "—"}
            </p>
            <p className="text-[11px] text-ink-muted tabular-nums">
              {analytics.bestPersonalDay
                ? analytics.bestPersonalDay.date
                : "No rounds yet"}
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
      <section aria-labelledby="yearly-monthly-heading" className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
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
            <CardTitle>Monthly Progress Comparison ({analytics.selectedYear})</CardTitle>
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

