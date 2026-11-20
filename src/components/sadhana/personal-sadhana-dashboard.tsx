import {
  ArrowRight,
  Award,
  Calendar,
  CalendarDays,
  CheckCircle2,
  Clock,
  Flame,
  Settings2,
  Sparkles,
  Compass,
} from "lucide-react";
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
import { ProgressBar, SacredRingProgress } from "@/components/ui/progress";
import { BEADS_PER_ROUND } from "@/lib/domain/sadhana";
import type { ChantingSessionRecord } from "@/lib/chant/types";
import type {
  CarryForwardLedgerEntry,
  PendingOptionalCarryOffer,
  UnappliedPendingNotice,
} from "@/lib/sadhana/carry-forward";
import { CarryForwardPanel } from "@/components/sadhana/carry-forward-panel";
import { ChantingSectionTabs } from "@/components/sadhana/chanting-section-tabs";
import { SadhanaGlowLink } from "@/components/sadhana/sadhana-glow-link";
import { SankalpaSection } from "@/components/sadhana/sankalpa-section";
import type { SankalpaRecord } from "@/lib/sankalpa/types";
import type {
  ChantingSessionSummary,
  PersonalDashboardMetrics,
} from "@/lib/sadhana/stats";

export interface PersonalSadhanaDashboardProps {
  displayName: string;
  timezone: string;
  carryForwardPolicy: "automatic" | "optional" | "fresh_daily" | "custom";
  maxCarryCap?: number;
  metrics: PersonalDashboardMetrics;
  recentSessions: ChantingSessionSummary[];
  activeSession?: ChantingSessionRecord | null;
  carryForwardLedger?: CarryForwardLedgerEntry[];
  pendingOptionalOffer?: PendingOptionalCarryOffer | null;
  unappliedPendingNotice?: UnappliedPendingNotice | null;
  sankalpas?: SankalpaRecord[];
  activeSankalpa?: SankalpaRecord | null;
}

export function PersonalSadhanaDashboard({
  displayName,
  timezone,
  carryForwardPolicy,
  maxCarryCap,
  metrics,
  recentSessions,
  activeSession,
  carryForwardLedger = [],
  pendingOptionalOffer = null,
  unappliedPendingNotice = null,
  sankalpas = [],
  activeSankalpa = null,
}: PersonalSadhanaDashboardProps) {
  const isNewUser =
    metrics.lifetimeRounds === 0 && recentSessions.length === 0;
  const hasCarriedBalance = metrics.carriedForwardBalance > 0;
  const isDoneToday = metrics.pendingRounds === 0;

  const friendlyNextPrompt = isDoneToday
    ? `Wonderful! You finished all ${metrics.effectiveTarget} rounds for today.`
    : metrics.completedRounds === 0
      ? `Ready to begin? You have ${metrics.effectiveTarget} rounds planned for today.`
      : `Great progress! ${metrics.completedRounds} done, only ${metrics.pendingRounds} more to finish today's goal.`;

  return (
    <div className="mx-auto max-w-5xl space-y-7 px-4 py-6 sm:px-8 sm:py-9">
      {/* Top Segmented Navigation & Page Context */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <ChantingSectionTabs active="lakshya" />
        <div className="flex items-center gap-2 text-xs font-medium text-ink-muted">
          <Compass className="size-3.5 text-peacock-deep" aria-hidden="true" />
          <span>Track today&apos;s daily target, analytics, and recorded history</span>
        </div>
      </div>

      {/* Atmospheric Sacred Header with Lakshya Panorama Artwork */}
      <header className="group relative overflow-hidden rounded-[24px] border border-sandalwood-border/80 bg-paper shadow-sacred-md transition-shadow duration-200">
        {/* Sacred Vrindavan Landscape Ambient Artwork */}
        <div className="relative h-36 w-full overflow-hidden border-b border-sandalwood-border/60 sm:h-44 md:h-52">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/media/nav-lakshya.jpg"
            alt="Sri Krishna and devotees on the Vrindavan hilltop — Lakshya Sacred Vow"
            className="h-full w-full object-cover object-[center_32%] filter brightness-[0.95] contrast-[1.05] transition-transform duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:scale-[1.015]"
          />
          {/* Vignette gradients for smooth blending into parchment surface */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-t from-paper via-paper/50 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-r from-ink/15 via-transparent to-ink/5"
          />

          {/* Sanskrit & English Sacred Badge */}
          <div className="absolute bottom-3.5 left-4 z-10 flex items-center gap-2 rounded-full border border-sandalwood-border/80 bg-paper px-3 py-1 shadow-sacred-xs sm:left-7">
            <LotusEmblem size={14} className="text-gold-antique" />
            <span className="font-devanagari text-xs font-semibold text-ink">लक्ष्य</span>
            <span className="text-[10px] text-ink-muted">·</span>
            <span className="text-[11px] font-semibold tracking-wider text-peacock-deep uppercase">
              LAKSHYA
            </span>
          </div>
        </div>

        {/* Devotee Greeting & Primary Action Row */}
        <div className="p-5 sm:p-7">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted tabular-nums">
                <span className="font-medium text-ink">{metrics.todayDate}</span>
                <span aria-hidden="true">·</span>
                <span>{timezone}</span>
                <Badge variant="neutral" className="capitalize">
                  {carryForwardPolicy.replace("_", " ")} rule
                </Badge>
                {isDoneToday ? (
                  <Badge variant="peacock" className="gap-1 shadow-xs">
                    <CheckCircle2 className="size-3" aria-hidden={true} />
                    <span>Daily target completed</span>
                  </Badge>
                ) : hasCarriedBalance ? (
                  <Badge variant="gold" className="shadow-xs">
                    Includes {metrics.carriedForwardBalance} carried forward
                  </Badge>
                ) : (
                  <Badge variant="neutral">In progress</Badge>
                )}
              </div>

              <h1 className="font-display text-3xl font-semibold tracking-tight text-ink text-balance sm:text-4xl">
                Hare Krishna, {displayName}
              </h1>

              <p className="max-w-xl text-sm leading-relaxed text-ink-muted text-pretty sm:text-base">
                {friendlyNextPrompt}
              </p>
            </div>

            <SadhanaGlowLink
              href="/sadhana/chant"
              tone="gold"
              className={buttonStyles({
                variant: "gold",
                size: "lg",
                className:
                  "min-h-14 w-full justify-between rounded-[14px] px-6 text-base font-semibold shadow-sacred-sm sm:w-auto sm:justify-center active:scale-[0.96]",
              })}
            >
              <Flame className="size-5 shrink-0 text-krishna-midnight" strokeWidth={2} aria-hidden={true} />
              <span>{activeSession ? "Resume chanting" : "Start chanting"}</span>
              <ArrowRight
                className="size-4 shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-1"
                strokeWidth={2}
                aria-hidden={true}
              />
            </SadhanaGlowLink>
          </div>

          {/* 3 Clear Shortcut Cards */}
          <nav
            aria-label="Sadhana quick destinations"
            className="mt-6 grid gap-3 border-t border-sandalwood-border/60 pt-5 sm:grid-cols-3"
          >
            <SadhanaGlowLink
              href="/sadhana/analytics"
              tone="ivory"
              className="group flex min-h-14 w-full items-center gap-3.5 rounded-xl border border-sandalwood-border/80 bg-paper px-4 py-3 text-left text-ink hover:border-peacock-deep/40 hover:shadow-xs transition-all duration-150"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sandalwood-border/70 bg-linen/60 text-peacock-deep">
                <CalendarDays className="size-4" strokeWidth={1.75} aria-hidden={true} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Heatmap &amp; Analytics
                </span>
                <span className="block text-xs text-ink-muted">
                  See your year calendar
                </span>
              </span>
              <ArrowRight className="size-3.5 text-ink-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            </SadhanaGlowLink>

            <SadhanaGlowLink
              href="/account?tab=milestones"
              tone="ivory"
              className="group flex min-h-14 w-full items-center gap-3.5 rounded-xl border border-sandalwood-border/80 bg-paper px-4 py-3 text-left text-ink hover:border-gold-border/60 hover:shadow-xs transition-all duration-150"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sandalwood-border/70 bg-linen/60 text-gold-ink">
                <Award className="size-4" strokeWidth={1.75} aria-hidden={true} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Milestones
                </span>
                <span className="block text-xs text-ink-muted">
                  View your earned badges
                </span>
              </span>
              <ArrowRight className="size-3.5 text-ink-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            </SadhanaGlowLink>

            <SadhanaGlowLink
              href="/onboarding?edit=1"
              tone="ivory"
              className="group flex min-h-14 w-full items-center gap-3.5 rounded-xl border border-sandalwood-border/80 bg-paper px-4 py-3 text-left text-ink hover:border-peacock-deep/40 hover:shadow-xs transition-all duration-150"
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-sandalwood-border/70 bg-linen/60 text-peacock-deep">
                <Settings2 className="size-4" strokeWidth={1.75} aria-hidden={true} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-ink">
                  Edit commitment
                </span>
                <span className="block text-xs text-ink-muted tabular-nums">
                  Currently {metrics.originalTarget} rounds / day
                </span>
              </span>
              <ArrowRight className="size-3.5 text-ink-muted opacity-0 transition-opacity duration-150 group-hover:opacity-100" />
            </SadhanaGlowLink>
          </nav>
        </div>
      </header>

      {/* Active Session Banner */}
      {activeSession && (
        <div className="flex flex-wrap items-center justify-between gap-3.5 rounded-2xl border border-gold-border/60 bg-gold-wash px-5 py-3.5 text-sm text-ink shadow-sacred-xs">
          <div className="flex items-center gap-3">
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-antique/20 text-gold-ink shadow-2xs">
              <Sparkles className="size-4" aria-hidden={true} />
            </span>
            <span>
              You have an open{" "}
              <strong className="font-semibold text-ink">
                {activeSession.method === "japa_mala"
                  ? "Digital Japa Mala"
                  : "Manual Counter"}
              </strong>{" "}
              session ({activeSession.status}
              {activeSession.method === "japa_mala"
                ? ` · ${activeSession.current_bead_count}/${BEADS_PER_ROUND} beads saved`
                : ""}
              ).
            </span>
          </div>
          <SadhanaGlowLink
            href="/sadhana/chant"
            tone="gold"
            className={buttonStyles({ variant: "gold", size: "sm", className: "rounded-xl" })}
          >
            <span>Continue session</span>
            <ArrowRight className="size-3.5" aria-hidden={true} />
          </SadhanaGlowLink>
        </div>
      )}

      {/* The Sacred Rhythm of Sādhana — 3-Step Contemplative Guide */}
      <section
        aria-label="Quick guide to chanting rounds"
        className="rounded-2xl border border-sandalwood-border/80 bg-paper p-4 shadow-sacred-xs sm:p-5"
      >
        <div className="mb-3.5 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-peacock-deep">
          <LotusEmblem size={15} />
          <span>The Sacred Rhythm of Sādhana</span>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="flex items-start gap-3 rounded-xl border border-sandalwood-border/60 bg-linen/50 p-3.5 transition-colors hover:bg-linen/80">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-peacock-deep text-xs font-semibold text-paper tabular-nums shadow-2xs">
              1
            </span>
            <div>
              <p className="text-xs font-semibold text-ink">
                Tap &ldquo;Start chanting&rdquo;
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                Pick the 108-bead circle or the quick +1 round button.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-sandalwood-border/60 bg-linen/50 p-3.5 transition-colors hover:bg-linen/80">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold-antique text-xs font-semibold text-paper tabular-nums shadow-2xs">
              2
            </span>
            <div>
              <p className="text-xs font-semibold text-ink">
                108 beads = 1 full round
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                Each gentle tap lights up a Tulsi bead around the circle.
              </p>
            </div>
          </div>
          <div className="flex items-start gap-3 rounded-xl border border-sandalwood-border/60 bg-linen/50 p-3.5 transition-colors hover:bg-linen/80">
            <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-peacock-green text-xs font-semibold text-paper tabular-nums shadow-2xs">
              3
            </span>
            <div>
              <p className="text-xs font-semibold text-ink">
                Saved automatically
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-ink-muted">
                Even if you pause partway, your beads wait safely for you.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Dedicated Sacred Sankalpa Management Experience */}
      <SankalpaSection
        sankalpas={sankalpas}
        activeSankalpa={activeSankalpa}
        todayDate={metrics.todayDate}
        lifetimeRounds={metrics.lifetimeRounds}
      />

      {/* Primary Chanting Statistics & Milestones */}
      <section
        aria-labelledby="primary-chanting-milestones-heading"
        className="space-y-3.5"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LotusEmblem size={16} className="text-gold-antique" />
            <h2
              id="primary-chanting-milestones-heading"
              className="font-serif text-lg font-semibold text-ink"
            >
              Chanting Statistics &amp; Milestones
            </h2>
          </div>
          <span className="text-xs text-ink-muted">
            Authoritative completed rounds · {timezone}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5">
          <Card
            surface="elevated"
            className="rounded-[16px] border border-peacock-green/30 bg-tulsi-wash/60 p-4 transition-transform duration-150 hover:-translate-y-0.5"
          >
            <p className="text-xs font-medium text-peacock-ink">Today Completed</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-peacock-deep tabular-nums sm:text-3xl">
              {metrics.completedRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {isDoneToday ? "Daily target completed" : "Rounds finished today"}
            </p>
          </Card>

          <Card
            surface="elevated"
            className="rounded-[16px] border border-sandalwood-border/80 bg-paper p-4 transition-transform duration-150 hover:-translate-y-0.5"
          >
            <p className="text-xs font-medium text-ink-muted">Today Remaining</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums sm:text-3xl">
              {metrics.pendingRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              {isDoneToday ? "All rounds finished" : "Left to finish"}
            </p>
          </Card>

          <Card
            surface="elevated"
            className="rounded-[16px] border border-sandalwood-border/80 bg-paper p-4 transition-transform duration-150 hover:-translate-y-0.5"
          >
            <p className="text-xs font-medium text-ink-muted">This Month</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums sm:text-3xl">
              {metrics.monthCompletedRounds ?? metrics.completedRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Monthly completed
            </p>
          </Card>

          <Card
            surface="elevated"
            className="rounded-[16px] border border-sandalwood-border/80 bg-paper p-4 transition-transform duration-150 hover:-translate-y-0.5"
          >
            <p className="text-xs font-medium text-ink-muted">This Year</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums sm:text-3xl">
              {metrics.yearCompletedRounds ?? metrics.completedRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Yearly completed
            </p>
          </Card>

          <Card
            surface="elevated"
            className="col-span-2 rounded-[16px] border border-gold-border/50 bg-gold-wash/50 p-4 transition-transform duration-150 hover:-translate-y-0.5 sm:col-span-1"
          >
            <p className="text-xs font-medium text-gold-ink">Lifetime</p>
            <p className="mt-1 font-serif text-2xl font-semibold text-gold-ink tabular-nums sm:text-3xl">
              {metrics.lifetimeRounds}
            </p>
            <p className="mt-0.5 text-[11px] text-ink-muted">
              Total rounds offered
            </p>
          </Card>
        </div>
      </section>

      {/* Today's Commitment & Visual Progress Command Center */}
      <section
        aria-labelledby="today-commitment-heading"
        className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"
      >
        {/* Left: Today's Sacred Offering */}
        <Card surface="elevated" className="rounded-[20px] p-5 sm:p-7">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle id="today-commitment-heading" className="text-2xl font-serif">
                Today&apos;s Sādhana
              </CardTitle>
              {isDoneToday ? (
                <Badge variant="peacock" className="gap-1 shadow-xs">
                  <CheckCircle2 className="size-3.5" aria-hidden={true} />
                  <span>Daily target completed</span>
                </Badge>
              ) : hasCarriedBalance ? (
                <Badge variant="gold" className="shadow-xs">
                  Includes {metrics.carriedForwardBalance} carried forward
                </Badge>
              ) : (
                <Badge variant="neutral">In progress</Badge>
              )}
            </div>
            <CardDescription className="text-sm">
              See what you have finished today, how many rounds remain, and how
              your daily goal adds up.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Big Clear Progress Metrics (Completed / Remaining / Extra) */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <div className="rounded-[14px] border border-peacock-green/35 bg-tulsi-wash/70 p-4 transition-colors hover:bg-tulsi-wash">
                <p className="text-xs font-medium text-peacock-ink">
                  Completed rounds
                </p>
                <p className="mt-1 font-serif text-3xl font-semibold text-peacock-deep tabular-nums">
                  {metrics.completedRounds}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Done today</p>
              </div>

              <div className="rounded-[14px] border border-sandalwood-border bg-paper p-4 transition-colors hover:border-sandalwood-strong">
                <p className="text-xs font-medium text-ink-muted">
                  Remaining rounds
                </p>
                <p className="mt-1 font-serif text-3xl font-semibold text-ink tabular-nums">
                  {metrics.pendingRounds}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">
                  {isDoneToday ? "All done!" : "Left to finish"}
                </p>
              </div>

              <div className="col-span-2 rounded-[14px] border border-sandalwood-border bg-paper p-4 sm:col-span-1 transition-colors hover:border-gold-border/40">
                <p className="text-xs font-medium text-ink-muted">
                  Extra beyond target
                </p>
                <p className="mt-1 font-serif text-3xl font-semibold text-gold-ink tabular-nums">
                  {metrics.extraRounds}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Bonus rounds</p>
              </div>
            </div>

            <ProgressBar
              value={metrics.completedRounds}
              max={metrics.effectiveTarget}
              label="Today's completion"
              tone={isDoneToday ? "peacock" : "gold"}
            />

            {/* Simple Goal Breakdown Strip */}
            <div className="grid gap-3.5 rounded-[14px] border border-sandalwood-border/90 bg-linen/85 p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-medium text-ink-muted">
                  Today&apos;s original target
                </p>
                <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
                  {metrics.originalTarget}
                </p>
                <p className="text-[11px] text-ink-muted">Your daily goal</p>
              </div>

              <div
                className={
                  hasCarriedBalance
                    ? "rounded-[10px] border border-gold-border/40 bg-gold-wash px-3 py-2 sm:-my-2 sm:py-2"
                    : ""
                }
              >
                <p className="text-xs font-medium text-ink-muted">
                  Previous pending balance
                </p>
                <p
                  className={
                    hasCarriedBalance
                      ? "mt-1 font-serif text-2xl font-semibold text-gold-ink tabular-nums"
                      : "mt-1 font-serif text-2xl font-semibold text-ink tabular-nums"
                  }
                >
                  +{metrics.carriedForwardBalance}
                </p>
                <p className="text-[11px] text-ink-muted">
                  {hasCarriedBalance
                    ? "Carried from earlier day"
                    : "None carried over"}
                </p>
              </div>

              <div className="sm:border-l sm:border-sandalwood-border sm:pl-4">
                <p className="text-xs font-medium text-ink-muted">Effective daily target</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-peacock-deep tabular-nums">
                  {metrics.effectiveTarget}
                </p>
                <p className="text-[11px] text-ink-muted tabular-nums">
                  {metrics.originalTarget} + {metrics.carriedForwardBalance} ={" "}
                  {metrics.effectiveTarget} rounds
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Right: Visual Ring & Lifetime Consistency Summary */}
        <Card surface="parchment" className="flex flex-col justify-between rounded-[20px] p-5 sm:p-7">
          <CardHeader>
            <CardTitle className="text-xl font-serif">Completion &amp; Consistency</CardTitle>
            <CardDescription className="text-sm">
              Your own calm rhythm — no competition.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-5">
            <SacredRingProgress
              value={metrics.completedRounds}
              max={metrics.effectiveTarget}
              label="Today's completion percentage"
              size={136}
              strokeWidth={8}
            />

            <dl className="grid w-full grid-cols-2 gap-3 border-t border-sandalwood-border pt-4">
              <div className="rounded-[12px] bg-linen/90 p-3 transition-colors hover:bg-linen">
                <dt className="text-xs font-medium text-ink-muted">Current streak</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                  {metrics.currentStreak}{" "}
                  <span className="text-xs font-normal text-ink-muted">
                    {metrics.currentStreak === 1 ? "day" : "days"}
                  </span>
                </dd>
              </div>

              <div className="rounded-[12px] bg-linen/90 p-3 transition-colors hover:bg-linen">
                <dt className="text-xs font-medium text-ink-muted">Total chanting days</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                  {metrics.totalChantingDays ?? metrics.recordedDays}{" "}
                  <span className="text-xs font-normal text-ink-muted">
                    {(metrics.totalChantingDays ?? metrics.recordedDays) === 1 ? "day" : "days"}
                  </span>
                </dd>
              </div>

              <div className="rounded-[12px] bg-linen/90 p-3 transition-colors hover:bg-linen">
                <dt className="text-xs font-medium text-ink-muted">Avg / chanting day</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                  {metrics.averageRoundsPerChantingDay ?? metrics.averageDailyRounds}
                </dd>
              </div>

              <div className="rounded-[12px] bg-linen/90 p-3 transition-colors hover:bg-linen">
                <dt className="text-xs font-medium text-ink-muted">Best chanting day</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold text-gold-ink tabular-nums">
                  {metrics.bestDay ? (
                    <span>
                      {metrics.bestDay.rounds}{" "}
                      <span className="text-[11px] font-sans font-normal text-ink-muted">
                        ({metrics.bestDay.date})
                      </span>
                    </span>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>

              <div className="col-span-2 rounded-[12px] bg-linen/90 p-3 transition-colors hover:bg-linen">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-ink-muted">Total target-met days</span>
                  <span className="font-serif text-base font-semibold text-peacock-deep tabular-nums">
                    {metrics.targetMetDays} / {metrics.recordedDays} days met ({metrics.consistencyRatePct}%)
                  </span>
                </div>
              </div>
            </dl>
          </CardContent>
        </Card>
      </section>

      <ManuscriptDivider />

      <CarryForwardPanel
        todayDate={metrics.todayDate}
        currentPolicy={carryForwardPolicy}
        todayPolicyApplied={metrics.todayPolicyApplied}
        currentMaxCarryCap={maxCarryCap}
        todayCompletedRounds={metrics.completedRounds}
        pendingOptionalOffer={pendingOptionalOffer}
        unappliedPendingNotice={unappliedPendingNotice}
        ledger={carryForwardLedger}
        originalDailyTarget={metrics.originalTarget}
        previousPendingBalance={metrics.carriedForwardBalance}
        effectiveDailyTarget={metrics.effectiveTarget}
        remainingBalance={metrics.pendingRounds}
      />

      {/* Recent Chanting Activity / New User Empty State */}
      <section aria-labelledby="activity-heading">
        {isNewUser ? (
          <Card surface="linen" className="rounded-[20px] p-6 sm:p-8">
            <CardContent className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-linen border border-sandalwood-border text-gold-ink shadow-2xs">
                  <LotusEmblem size={24} />
                </span>
                <div>
                  <h2
                    id="activity-heading"
                    className="font-serif text-2xl font-semibold text-ink"
                  >
                    Your chanting journal begins gently
                  </h2>
                  <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-ink-muted text-pretty">
                    No rounds have been recorded yet. Your daily target of{" "}
                    <span className="font-semibold text-ink tabular-nums">
                      {metrics.originalTarget} rounds
                    </span>{" "}
                    is ready in{" "}
                    <span className="font-semibold text-ink">{timezone}</span>. Tap
                    below to practice with the 108-bead Japa circle or count
                    rounds one by one.
                  </p>
                </div>
              </div>

              <SadhanaGlowLink
                href="/sadhana/chant"
                tone="peacock"
                className={buttonStyles({ variant: "primary", size: "md", className: "rounded-[12px] px-5 py-2.5 min-h-11" })}
              >
                <Sparkles
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden={true}
                />
                <span>Start chanting</span>
              </SadhanaGlowLink>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card surface="parchment" className="rounded-[20px] p-5 sm:p-6">
              <CardHeader>
                <CardTitle
                  id="activity-heading"
                  className="flex items-center gap-2 font-serif text-xl"
                >
                  <Clock
                    className="size-4 text-peacock-deep"
                    strokeWidth={1.75}
                    aria-hidden={true}
                  />
                  <span>Recent Chanting Sessions</span>
                </CardTitle>
                <CardDescription>
                  Latest sessions recorded across manual and Japa Mala modes.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {recentSessions.length === 0 ? (
                  <p className="rounded-[12px] border border-sandalwood-border bg-linen px-4 py-3 text-sm text-ink-muted">
                    No separate session entries yet. Completed rounds are still
                    reflected in your daily totals.
                  </p>
                ) : (
                  <ul className="divide-y divide-sandalwood-border">
                    {recentSessions.map((session) => (
                      <li
                        key={session.id}
                        className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                      >
                        <div className="space-y-0.5">
                          <p className="text-sm font-semibold text-ink">
                            {session.method === "japa_mala"
                              ? "Digital Japa Mala"
                              : "Manual Counter"}
                          </p>
                          <p className="text-xs text-ink-muted tabular-nums">
                            {session.sadhana_date} · Status: {session.status}
                          </p>
                        </div>
                        <Badge variant="peacock" className="shadow-xs">
                          {session.rounds_completed}{" "}
                          {session.rounds_completed === 1 ? "round" : "rounds"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card surface="parchment" className="rounded-[20px] p-5 sm:p-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-serif text-xl">
                  <Calendar
                    className="size-4 text-peacock-deep"
                    strokeWidth={1.75}
                    aria-hidden={true}
                  />
                  <span>Recent Daily History</span>
                </CardTitle>
                <CardDescription>
                  Up to 7 most recent recorded Sādhana days.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="divide-y divide-sandalwood-border">
                  {metrics.recentDays.map((day) => (
                    <li
                      key={day.date}
                      className="flex items-center justify-between gap-3 py-3.5 first:pt-0 last:pb-0"
                    >
                      <div className="space-y-0.5">
                        <p className="text-sm font-semibold text-ink tabular-nums">
                          {day.date}
                        </p>
                        <p className="text-xs text-ink-muted tabular-nums">
                          Base {day.originalTarget}
                          {day.pendingBalance > 0
                            ? ` + ${day.pendingBalance} carried`
                            : ""}
                        </p>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-semibold text-ink tabular-nums">
                          {day.completedRounds}/{day.effectiveTarget}
                        </span>
                        <Badge variant={day.targetMet ? "peacock" : "neutral"} className="shadow-xs">
                          {day.targetMet ? "Met" : "Active"}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        )}
      </section>
    </div>
  );
}
