import Link from "next/link";
import { Calendar, CalendarDays, Clock, Flame, Settings2, Sparkles } from "lucide-react";
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

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-5 py-8 sm:px-8 sm:py-10">
      {/* Header Greeting & Primary Chanting CTA */}
      <header className="flex flex-col gap-4 border-b border-sandalwood-border pb-6 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium text-ink-muted tabular-nums">
            {metrics.todayDate} · {timezone}
          </p>
          <h1 className="mt-1 font-display text-3xl font-semibold text-ink text-balance sm:text-4xl">
            Hare Krishna, {displayName}
          </h1>
          <p className="mt-1.5 text-sm text-ink-muted">
            Policy:{" "}
            <span className="font-medium capitalize text-ink">
              {carryForwardPolicy.replace("_", " ")}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/sadhana/analytics"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            <CalendarDays
              className="size-4"
              strokeWidth={1.75}
              aria-hidden={true}
            />
            <span>Heatmap &amp; Analytics</span>
          </Link>
          <Link
            href="/account?tab=milestones"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            <Sparkles
              className="size-4"
              strokeWidth={1.75}
              aria-hidden={true}
            />
            <span>Milestones</span>
          </Link>
          <Link
            href="/onboarding?edit=1"
            className={buttonStyles({ variant: "secondary", size: "md" })}
          >
            <Settings2
              className="size-4"
              strokeWidth={1.75}
              aria-hidden={true}
            />
            <span>Edit commitment</span>
          </Link>
          <Link
            href="/sadhana/chant"
            className={buttonStyles({ variant: "primary", size: "lg" })}
          >
            <Flame className="size-4" strokeWidth={1.75} aria-hidden={true} />
            <span>{activeSession ? "Resume chanting" : "Start chanting"}</span>
          </Link>
        </div>
      </header>

      {activeSession && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-[12px] border border-gold-border/40 bg-gold-wash px-4 py-3 text-sm text-ink">
          <span>
            Active{" "}
            <strong className="font-medium">
              {activeSession.method === "japa_mala"
                ? "Digital Japa Mala"
                : "Manual Counter"}
            </strong>{" "}
            session ({activeSession.status}
            {activeSession.method === "japa_mala"
              ? ` · ${activeSession.current_bead_count}/${BEADS_PER_ROUND} beads`
              : ""}
            ).
          </span>
          <Link
            href="/sadhana/chant"
            className={buttonStyles({ variant: "gold", size: "sm" })}
          >
            Continue session
          </Link>
        </div>
      )}

      {/* Today's Commitment & Target Breakdown */}
      <section aria-labelledby="today-commitment-heading" className="grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
        <Card surface="elevated">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle id="today-commitment-heading">
                Today&apos;s Sādhana
              </CardTitle>
              {metrics.pendingRounds === 0 ? (
                <Badge variant="peacock">Daily target completed</Badge>
              ) : hasCarriedBalance ? (
                <Badge variant="gold">
                  Includes {metrics.carriedForwardBalance} carried forward
                </Badge>
              ) : (
                <Badge variant="neutral">In progress</Badge>
              )}
            </div>
            <CardDescription>
              Original commitment, previous pending balance, and today&apos;s
              effective target are tracked separately.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Explicit Target Formula Strip */}
            <div className="grid gap-3 rounded-[12px] border border-sandalwood-border bg-linen p-4 sm:grid-cols-3">
              <div>
                <p className="text-xs text-ink-muted">Today&apos;s original target</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
                  {metrics.originalTarget}
                </p>
                <p className="text-[11px] text-ink-muted">Committed daily base</p>
              </div>

              <div
                className={
                  hasCarriedBalance
                    ? "rounded-[10px] border border-gold-border/40 bg-gold-wash px-3 py-2 sm:-my-2 sm:py-2"
                    : ""
                }
              >
                <p className="text-xs text-ink-muted">Previous pending balance</p>
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
                    ? "Carried from prior day"
                    : "No pending carry-forward"}
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

            {/* Completed vs Remaining */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              <div className="rounded-[12px] border border-sandalwood-border bg-paper p-3.5">
                <p className="text-xs text-ink-muted">Completed rounds</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-peacock-ink tabular-nums">
                  {metrics.completedRounds}
                </p>
              </div>

              <div className="rounded-[12px] border border-sandalwood-border bg-paper p-3.5">
                <p className="text-xs text-ink-muted">Remaining rounds</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-ink tabular-nums">
                  {metrics.pendingRounds}
                </p>
              </div>

              <div className="col-span-2 rounded-[12px] border border-sandalwood-border bg-paper p-3.5 sm:col-span-1">
                <p className="text-xs text-ink-muted">Extra beyond target</p>
                <p className="mt-1 font-serif text-2xl font-semibold text-gold-ink tabular-nums">
                  {metrics.extraRounds}
                </p>
              </div>
            </div>

            <ProgressBar
              value={metrics.completedRounds}
              max={metrics.effectiveTarget}
              label="Today's completion"
              tone={metrics.pendingRounds === 0 ? "peacock" : "gold"}
            />
          </CardContent>
        </Card>

        {/* Visual Ring & Lifetime Consistency Summary */}
        <Card surface="parchment" className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle>Completion &amp; Consistency</CardTitle>
            <CardDescription>
              Personal steady rhythm without competition.
            </CardDescription>
          </CardHeader>

          <CardContent className="flex flex-col items-center gap-5">
            <SacredRingProgress
              value={metrics.completedRounds}
              max={metrics.effectiveTarget}
              label="Today's completion percentage"
              size={132}
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
                    is initialized in{" "}
                    <span className="font-medium text-ink">{timezone}</span>.
                    Open Chanting Space to count rounds manually or practice
                    bead-by-bead with the 108-bead Digital Japa Mala.
                  </p>
                </div>
              </div>

              <Link
                href="/sadhana/chant"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                <Sparkles
                  className="size-4"
                  strokeWidth={1.75}
                  aria-hidden={true}
                />
                <span>Open Chanting Space</span>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card surface="parchment">
              <CardHeader>
                <CardTitle id="activity-heading" className="flex items-center gap-2">
                  <Clock className="size-4 text-peacock-deep" strokeWidth={1.75} aria-hidden={true} />
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
                  <Calendar className="size-4 text-peacock-deep" strokeWidth={1.75} aria-hidden={true} />
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

