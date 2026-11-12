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
    <div className="mx-auto max-w-5xl space-y-7 px-5 py-7 sm:px-8 sm:py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ChantingSectionTabs active="lakshya" />
        <p className="text-xs font-medium text-ink-muted">
          Track today&apos;s daily target, analytics, and recorded history
        </p>
      </div>

      {/* Friendly Hero Greeting & One-Tap Start Banner */}
      <header className="rounded-[20px] border border-sandalwood-border bg-paper p-5 shadow-sacred-sm sm:p-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2 text-xs text-ink-muted tabular-nums">
              <span>{metrics.todayDate}</span>
              <span aria-hidden="true">·</span>
              <span>{timezone}</span>
              <Badge variant="neutral" className="capitalize">
                {carryForwardPolicy.replace("_", " ")} rule
              </Badge>
            </div>

            <h1 className="font-display text-3xl font-semibold text-ink text-balance sm:text-4xl">
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
                "min-h-14 w-full justify-between rounded-[14px] px-6 text-base font-semibold sm:w-auto sm:justify-center",
            })}
          >
            <Flame className="size-5 shrink-0" strokeWidth={2} aria-hidden={true} />
            <span>{activeSession ? "Resume chanting" : "Start chanting"}</span>
            <ArrowRight
              className="size-4 shrink-0 transition-transform duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:translate-x-0.5"
              strokeWidth={2}
              aria-hidden={true}
            />
          </SadhanaGlowLink>
        </div>

        {/* 3 Clear Glowing Shortcut Cards */}
        <nav
          aria-label="Sadhana quick destinations"
          className="mt-6 grid gap-3 border-t border-sandalwood-border/80 pt-5 sm:grid-cols-3"
        >
          <SadhanaGlowLink
            href="/sadhana/analytics"
            tone="ivory"
            className="ks-glow-secondary flex min-h-14 w-full items-center rounded-[14px] border border-sandalwood-border bg-linen/70 px-4 py-3 text-left text-ink hover:bg-paper"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-paper text-peacock-deep shadow-sacred-sm">
              <CalendarDays className="size-5" strokeWidth={1.75} aria-hidden={true} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                Heatmap &amp; Analytics
              </span>
              <span className="block text-xs text-ink-muted">
                See your year calendar
              </span>
            </span>
          </SadhanaGlowLink>

          <SadhanaGlowLink
            href="/account?tab=milestones"
            tone="ivory"
            className="ks-glow-secondary flex min-h-14 w-full items-center rounded-[14px] border border-sandalwood-border bg-linen/70 px-4 py-3 text-left text-ink hover:bg-paper"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-paper text-gold-ink shadow-sacred-sm">
              <Award className="size-5" strokeWidth={1.75} aria-hidden={true} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                Milestones
              </span>
              <span className="block text-xs text-ink-muted">
                View your earned badges
              </span>
            </span>
          </SadhanaGlowLink>

          <SadhanaGlowLink
            href="/onboarding?edit=1"
            tone="ivory"
            className="ks-glow-secondary flex min-h-14 w-full items-center rounded-[14px] border border-sandalwood-border bg-linen/70 px-4 py-3 text-left text-ink hover:bg-paper"
          >
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] bg-paper text-peacock-deep shadow-sacred-sm">
              <Settings2 className="size-5" strokeWidth={1.75} aria-hidden={true} />
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-semibold text-ink">
                Edit commitment
              </span>
              <span className="block text-xs text-ink-muted tabular-nums">
                Currently {metrics.originalTarget} rounds / day
              </span>
            </span>
          </SadhanaGlowLink>
        </nav>
      </header>

      {/* Active Session Banner */}
      {activeSession && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-gold-border/50 bg-gold-wash px-5 py-3.5 text-sm text-ink shadow-sacred-sm">
          <div className="flex items-center gap-2.5">
            <Sparkles className="size-4 shrink-0 text-gold-ink" aria-hidden={true} />
            <span>
              You have an open{" "}
              <strong className="font-semibold">
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
            className={buttonStyles({ variant: "gold", size: "sm" })}
          >
            <span>Continue session</span>
            <ArrowRight className="size-3.5" aria-hidden={true} />
          </SadhanaGlowLink>
        </div>
      )}

      {/* Kid-Friendly 3-Step Guide */}
      <section
        aria-label="Quick guide to chanting rounds"
        className="grid gap-3 rounded-[16px] border border-sandalwood-border bg-linen/60 p-4 sm:grid-cols-3"
      >
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-peacock-deep text-xs font-semibold text-ink-on-dark tabular-nums">
            1
          </span>
          <div>
            <p className="text-xs font-semibold text-ink">
              Tap &ldquo;Start chanting&rdquo;
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Pick the 108-bead circle or the quick +1 round button.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-gold-antique text-xs font-semibold text-krishna-midnight tabular-nums">
            2
          </span>
          <div>
            <p className="text-xs font-semibold text-ink">
              108 beads = 1 full round
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Each gentle tap lights up a Tulsi bead around the circle.
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-peacock-green text-xs font-semibold text-ink-on-dark tabular-nums">
            3
          </span>
          <div>
            <p className="text-xs font-semibold text-ink">
              Saved automatically
            </p>
            <p className="mt-0.5 text-xs text-ink-muted">
              Even if you pause partway, your beads wait safely for you.
            </p>
          </div>
        </div>
      </section>

      {/* Today's Commitment & Visual Progress */}
      <section
        aria-labelledby="today-commitment-heading"
        className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]"
      >
        <Card surface="elevated">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle id="today-commitment-heading">
                Today&apos;s Sādhana
              </CardTitle>
              {isDoneToday ? (
                <Badge variant="peacock" className="gap-1">
                  <CheckCircle2 className="size-3.5" aria-hidden={true} />
                  <span>Daily target completed</span>
                </Badge>
              ) : hasCarriedBalance ? (
                <Badge variant="gold">
                  Includes {metrics.carriedForwardBalance} carried forward
                </Badge>
              ) : (
                <Badge variant="neutral">In progress</Badge>
              )}
            </div>
            <CardDescription>
              See what you have finished today, how many rounds remain, and how
              your daily goal adds up.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Big Clear Progress Metrics (Completed / Remaining / Extra) */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3">
              <div className="rounded-[14px] border border-peacock-green/35 bg-tulsi-wash/60 p-4">
                <p className="text-xs font-medium text-peacock-ink">
                  Completed rounds
                </p>
                <p className="mt-1 font-serif text-3xl font-semibold text-peacock-deep tabular-nums">
                  {metrics.completedRounds}
                </p>
                <p className="mt-0.5 text-[11px] text-ink-muted">Done today</p>
              </div>

              <div className="rounded-[14px] border border-sandalwood-border bg-paper p-4">
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

              <div className="col-span-2 rounded-[14px] border border-sandalwood-border bg-paper p-4 sm:col-span-1">
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
            <div className="grid gap-3 rounded-[12px] border border-sandalwood-border bg-linen p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-muted">
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
                <p className="text-xs text-ink-muted">
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
                <p className="text-xs text-ink-muted">Effective daily target</p>
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

        {/* Visual Ring & Lifetime Consistency Summary */}
        <Card surface="parchment" className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Completion &amp; Consistency</CardTitle>
            <CardDescription>
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
              <div className="rounded-[10px] bg-linen p-3">
                <dt className="text-xs text-ink-muted">Current streak</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                  {metrics.currentStreak}{" "}
                  <span className="text-xs font-normal text-ink-muted">
                    {metrics.currentStreak === 1 ? "day" : "days"}
                  </span>
                </dd>
              </div>

              <div className="rounded-[10px] bg-linen p-3">
                <dt className="text-xs text-ink-muted">Lifetime rounds</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                  {metrics.lifetimeRounds}
                </dd>
              </div>

              <div className="rounded-[10px] bg-linen p-3">
                <dt className="text-xs text-ink-muted">Target met days</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                  {metrics.targetMetDays}/{metrics.recordedDays}
                </dd>
              </div>

              <div className="rounded-[10px] bg-linen p-3">
                <dt className="text-xs text-ink-muted">Avg / recorded day</dt>
                <dd className="mt-0.5 font-serif text-xl font-semibold text-ink tabular-nums">
                  {metrics.averageDailyRounds}
                </dd>
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
      />

      {/* Recent Chanting Activity / New User Empty State */}
      <section aria-labelledby="activity-heading">
        {isNewUser ? (
          <Card surface="linen">
            <CardContent className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-[12px] bg-krishna-midnight text-gold-antique">
                  <LotusEmblem size={22} />
                </span>
                <div>
                  <h2
                    id="activity-heading"
                    className="font-serif text-xl font-semibold text-ink"
                  >
                    Your chanting journal begins gently
                  </h2>
                  <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-muted text-pretty">
                    No rounds have been recorded yet. Your daily target of{" "}
                    <span className="font-medium text-ink tabular-nums">
                      {metrics.originalTarget} rounds
                    </span>{" "}
                    is ready in{" "}
                    <span className="font-medium text-ink">{timezone}</span>. Tap
                    below to practice with the 108-bead Japa circle or count
                    rounds one by one.
                  </p>
                </div>
              </div>

              <SadhanaGlowLink
                href="/sadhana/chant"
                tone="peacock"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                <Sparkles
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden={true}
                />
                <span>Open Chanting Space</span>
              </SadhanaGlowLink>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card surface="parchment">
              <CardHeader>
                <CardTitle
                  id="activity-heading"
                  className="flex items-center gap-2"
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
                  <p className="rounded-[10px] border border-sandalwood-border bg-linen px-4 py-3 text-sm text-ink-muted">
                    No separate session entries yet. Completed rounds are still
                    reflected in your daily totals.
                  </p>
                ) : (
                  <ul className="divide-y divide-sandalwood-border">
                    {recentSessions.map((session) => (
                      <li
                        key={session.id}
                        className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                      >
                        <div>
                          <p className="text-sm font-medium text-ink">
                            {session.method === "japa_mala"
                              ? "Digital Japa Mala"
                              : "Manual Counter"}
                          </p>
                          <p className="text-xs text-ink-muted tabular-nums">
                            {session.sadhana_date} · Status: {session.status}
                          </p>
                        </div>
                        <Badge variant="peacock">
                          {session.rounds_completed}{" "}
                          {session.rounds_completed === 1 ? "round" : "rounds"}
                        </Badge>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            <Card surface="parchment">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
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
                      className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                    >
                      <div>
                        <p className="text-sm font-medium text-ink tabular-nums">
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
                        <Badge variant={day.targetMet ? "peacock" : "neutral"}>
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
