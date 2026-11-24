"use client";

import * as React from "react";
import Link from "next/link";
import {
  BarChart3,
  CheckCircle2,
  Clock,
  ExternalLink,
  Flame,
  History,
  RotateCcw,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { LotusEmblem } from "@/components/sacred/ornaments";
import type { DailySadhana } from "@/lib/domain/sadhana";
import type { ChantingRoundRecord, ChantingSessionRecord } from "@/lib/chant/types";
import type { MantraHistoricalStat } from "@/lib/mantra/types";

interface InWorkspaceAnalyticsProps {
  isOpen: boolean;
  onClose: () => void;
  dailySadhana: DailySadhana;
  todaySessions: ChantingSessionRecord[];
  todayRecords: ChantingRoundRecord[];
  mantraStats: MantraHistoricalStat[];
  currentStreak?: number;
  longestStreak?: number;
  lifetimeRounds?: number;
  todayDate?: string;
  onUpdateDailySadhana?: (sadhana: DailySadhana) => void;
}

export function InWorkspaceAnalytics({
  isOpen,
  onClose,
  dailySadhana,
  todaySessions,
  todayRecords,
  mantraStats,
  currentStreak = 0,
  longestStreak = 0,
  lifetimeRounds,
  todayDate,
  onUpdateDailySadhana,
}: InWorkspaceAnalyticsProps) {
  const [isForgivingCarry, setIsForgivingCarry] = React.useState(false);
  const [forgiveFeedback, setForgiveFeedback] = React.useState<string | null>(null);

  // Close on Escape key
  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const completed = dailySadhana.completed_rounds;
  const target = dailySadhana.effective_daily_target;
  const baseTarget = dailySadhana.original_daily_target;
  const carried = dailySadhana.previous_pending_balance;
  const remaining = dailySadhana.remaining_balance;
  const extra = dailySadhana.extra_rounds;

  const completionPct = Math.min(100, Math.round((completed / Math.max(1, target)) * 100));
  const basePct = Math.min(100, Math.round((completed / Math.max(1, baseTarget)) * 100));

  // Compute session duration if ended_at is present
  const computeSessionDurationMinutes = (session: ChantingSessionRecord): number | null => {
    if (!session.ended_at || !session.started_at) return null;
    const start = new Date(session.started_at).getTime();
    const end = new Date(session.ended_at).getTime();
    const diffSec = Math.max(0, Math.round((end - start) / 1000));
    return Math.max(1, Math.round(diffSec / 60));
  };

  const totalDurationMinutes = todaySessions.reduce((acc, s) => {
    const d = computeSessionDurationMinutes(s);
    return acc + (d ?? 0);
  }, 0);

  const handleForgiveCarriedBalance = async () => {
    if (isForgivingCarry) return;
    setIsForgivingCarry(true);
    setForgiveFeedback(null);
    try {
      const res = await fetch("/api/sadhana/carry-forward/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: "fresh_daily",
          applyToToday: true,
          todayDate: todayDate ?? new Date().toISOString().slice(0, 10),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error ?? "Failed to update carry-forward policy.");
      }
      if (json.daily_sadhana && onUpdateDailySadhana) {
        onUpdateDailySadhana(json.daily_sadhana);
      }
      setForgiveFeedback("Carried balance forgiven! Today starts fresh with your pure daily vow.");
    } catch (err) {
      setForgiveFeedback(err instanceof Error ? err.message : "Failed to forgive balance.");
    } finally {
      setIsForgivingCarry(false);
    }
  };

  // Compute lifetime sum if not provided
  const computedLifetime =
    lifetimeRounds ??
    mantraStats.reduce((acc, m) => acc + m.completedRounds, 0);

  const activeRecordsCount = todayRecords.filter((r) => !r.is_reverted).length;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="analytics-dialog-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-ink/75 backdrop-blur-md animate-in fade-in-0 duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl border border-sandalwood-border/90 bg-paper p-5 sm:p-7 shadow-sacred-xl text-ink transition-all">
        {/* Subtle Sacred Header Accent */}
        <div className="flex items-center justify-between pb-4 border-b border-sandalwood-border/70">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-2xl border border-gold-border/80 bg-gold-wash/90 text-gold-ink shadow-2xs">
              <LotusEmblem size={22} className="text-gold-antique" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 id="analytics-dialog-title" className="font-serif text-xl sm:text-2xl font-bold tracking-tight text-ink">
                  Sādhana Progress &amp; Insights
                </h2>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-tulsi-wash text-peacock-ink border border-peacock-green/30">
                  <span className="size-1.5 rounded-full bg-peacock-green animate-pulse" />
                  Active
                </span>
              </div>
              <p className="text-xs text-ink/75 font-medium mt-0.5">
                Sacred offering, daily consistency &amp; rollover balance
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-full border border-sandalwood-border/70 bg-linen/50 text-ink/70 hover:text-ink hover:bg-linen transition-colors cursor-pointer shadow-2xs"
            aria-label="Close dialog"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="mt-5 space-y-5">
          {/* Today's Target Fulfillment Card (Apple/Linear High Craft Design) */}
          <div className="p-5 sm:p-6 rounded-2xl border border-sandalwood-border/90 bg-gradient-to-b from-linen/60 via-paper to-linen/40 shadow-sacred-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-ink/80">
                  Today&apos;s Effective Target
                </span>
                {carried > 0 && (
                  <span className="text-[11px] font-medium text-gold-ink bg-gold-wash px-2 py-0.5 rounded-full border border-gold-border/40">
                    Includes Rollover
                  </span>
                )}
              </div>
              <Badge variant={completed >= target ? "peacock" : "gold"}>
                {completed >= target
                  ? "Target Fulfilled"
                  : `${remaining} ${remaining === 1 ? "round" : "rounds"} left`}
              </Badge>
            </div>

            {/* Hero Main Numbers */}
            <div className="flex items-baseline justify-between gap-2">
              <div className="flex items-baseline">
                <span className="font-serif text-4xl sm:text-5xl font-extrabold text-ink tabular-nums tracking-tight">
                  {completed}
                </span>
                <span className="text-base sm:text-xl font-semibold text-ink/80 font-sans ml-2">
                  / {target} rounds
                </span>
              </div>
              <div className="text-right">
                <span className="inline-block text-sm sm:text-base font-bold text-gold-ink tabular-nums font-serif px-2.5 py-0.5 rounded-full bg-gold-wash/80 border border-gold-border/40 shadow-2xs">
                  {completionPct}% fulfilled
                </span>
              </div>
            </div>

            {/* Sacred High-Contrast Dual Progress Bar */}
            <div className="space-y-1.5">
              <div
                role="progressbar"
                aria-valuenow={completed}
                aria-valuemin={0}
                aria-valuemax={target}
                aria-label="Today's Sadhana Progress"
                className="h-3.5 w-full overflow-hidden rounded-full bg-sandalwood-border/70 p-0.5 border border-sandalwood-border/80 shadow-inner"
              >
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out shadow-xs ${
                    completed >= target
                      ? "bg-peacock-green"
                      : "bg-gradient-to-r from-peacock-deep via-[#9E364C] to-gold-antique"
                  }`}
                  style={{ width: `${Math.min(100, Math.max(0, completionPct))}%` }}
                />
              </div>

              {/* Devotional Holy Names Count Context */}
              <div className="flex items-center justify-between text-[11px] font-medium text-ink/80 pt-0.5">
                <span>
                  ✨ <strong className="text-ink font-semibold">{(completed * 108).toLocaleString()}</strong> Holy Names offered
                </span>
                <span>
                  {remaining > 0 ? (
                    <>
                      <strong className="text-gold-ink font-semibold">{(remaining * 108).toLocaleString()}</strong> names to fulfill vow
                    </>
                  ) : (
                    <span className="text-peacock-ink font-semibold">Daily vow complete 🙏</span>
                  )}
                </span>
              </div>
            </div>

            {/* 3-Column Breakdown: Base Target, Carried Pending, Extra Rounds */}
            <div className="grid grid-cols-3 gap-2.5 pt-1 text-center">
              {/* Base Vow */}
              <div className="p-3 rounded-xl border border-sandalwood-border/90 bg-paper shadow-2xs transition-all hover:border-gold-border/50">
                <span className="block text-[10px] font-bold text-ink/75 uppercase tracking-wider">
                  Base Target
                </span>
                <span className="block font-serif text-lg sm:text-xl font-bold text-ink mt-0.5 tabular-nums">
                  {baseTarget}
                </span>
                <span className="text-[10px] font-medium text-ink/70">daily vow</span>
              </div>

              {/* Carried Rollover */}
              <div className="p-3 rounded-xl border border-gold-border/60 bg-gold-wash/80 shadow-2xs transition-all">
                <span className="block text-[10px] font-bold text-gold-ink uppercase tracking-wider">
                  Carried Pending
                </span>
                <span className="block font-serif text-lg sm:text-xl font-bold text-gold-ink mt-0.5 tabular-nums">
                  +{carried}
                </span>
                <span className="text-[10px] font-medium text-gold-ink/80">from rollover</span>
              </div>

              {/* Extra Rounds */}
              <div className="p-3 rounded-xl border border-peacock-green/30 bg-tulsi-wash/80 shadow-2xs transition-all">
                <span className="block text-[10px] font-bold text-peacock-ink uppercase tracking-wider">
                  Extra / Over-Target
                </span>
                <span className="block font-serif text-lg sm:text-xl font-bold text-peacock-ink mt-0.5 tabular-nums">
                  +{extra}
                </span>
                <span className="text-[10px] font-medium text-peacock-ink/80">bonus rounds</span>
              </div>
            </div>

            {/* Compassionate Forgive Accumulated Carry-Forward Card */}
            {carried > 0 && (
              <div className="rounded-2xl border border-gold-border/80 bg-gradient-to-br from-gold-wash via-paper to-gold-wash/60 p-4 sm:p-4.5 space-y-3 text-left shadow-sacred-sm">
                <div className="flex items-start gap-3">
                  <div className="size-8 rounded-xl bg-gold-wash border border-gold-border/70 flex items-center justify-center shrink-0 mt-0.5">
                    <Sparkles className="size-4.5 text-gold-ink" aria-hidden="true" />
                  </div>
                  <div className="space-y-1.5 text-xs flex-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-serif text-sm font-bold text-ink">
                        Accumulated Balance: +{carried} carried rounds
                      </span>
                      <Badge variant="gold" className="text-[10px] font-semibold">
                        Rollover Backlog
                      </Badge>
                    </div>
                    <p className="text-ink/80 text-[11.5px] leading-relaxed">
                      Spiritual discipline without artificial guilt. An accumulated balance of unchanted rounds from previous days has rolled over. Starting fresh today forgives this carried backlog and sets your ongoing carry-forward policy to <strong>Fresh Daily</strong>. For devotees who prefer to carry forward a limited balance in the future, you can configure a custom rollover cap in Settings.
                    </p>
                  </div>
                </div>

                {forgiveFeedback && (
                  <div className="rounded-xl bg-peacock-green/10 border border-peacock-green/30 p-2.5 text-xs text-peacock-ink font-semibold flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-peacock-green shrink-0" />
                    <span>{forgiveFeedback}</span>
                  </div>
                )}

                <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-gold-border/30">
                  <button
                    type="button"
                    disabled={isForgivingCarry}
                    onClick={() => void handleForgiveCarriedBalance()}
                    className="inline-flex items-center gap-2 rounded-xl border border-gold-border bg-paper px-4 py-2 text-xs font-bold text-gold-ink hover:bg-gold-wash/90 shadow-xs transition-all active:scale-[0.98] cursor-pointer disabled:opacity-50"
                  >
                    <RotateCcw className={`size-3.5 ${isForgivingCarry ? "animate-spin" : ""}`} />
                    {isForgivingCarry ? "Forgiving..." : `🌱 Start Fresh Today (Forgive +${carried} Carried)`}
                  </button>
                  <Link
                    href="/account"
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold text-gold-ink hover:text-ink hover:bg-gold-wash/40 transition-colors"
                  >
                    <span>Configure Custom Rollover Cap in Account Settings</span>
                    <span aria-hidden="true">&rarr;</span>
                  </Link>
                </div>
              </div>
            )}

            {/* Submissions & Sessions Counts Row */}
            <div className="flex items-center justify-between text-xs text-ink/80 pt-3 border-t border-sandalwood-border/70 font-medium">
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-peacock-green shrink-0" aria-hidden="true" />
                <span>
                  Logged submissions: <strong className="text-ink font-bold">{activeRecordsCount}</strong>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <Clock className="size-4 text-gold-antique shrink-0" aria-hidden="true" />
                <span>
                  Today&apos;s sessions: <strong className="text-ink font-bold">{todaySessions.length}</strong>
                  {totalDurationMinutes > 0 && ` (${totalDurationMinutes}m)`}
                </span>
              </span>
            </div>
          </div>

          {/* Consistency & Sacred Vitals Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {/* Current Streak */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-sandalwood-border/90 bg-paper shadow-2xs flex items-center gap-3 transition-all hover:border-kumkum/40">
              <div className="size-10 rounded-2xl border border-kumkum/25 bg-kumkum-wash text-kumkum flex items-center justify-center shrink-0 shadow-2xs">
                <Flame className="size-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-ink/75 uppercase tracking-wider block">
                  Current Streak
                </span>
                <span className="font-serif text-lg sm:text-xl font-bold text-ink tabular-nums">
                  {currentStreak} {currentStreak === 1 ? "day" : "days"}
                </span>
                <span className="text-[10px] text-ink/65 block">consecutive</span>
              </div>
            </div>

            {/* Longest Streak */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-sandalwood-border/90 bg-paper shadow-2xs flex items-center gap-3 transition-all hover:border-gold-border/40">
              <div className="size-10 rounded-2xl border border-gold-border/40 bg-gold-wash text-gold-ink flex items-center justify-center shrink-0 shadow-2xs">
                <Trophy className="size-5" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-ink/75 uppercase tracking-wider block">
                  Longest Streak
                </span>
                <span className="font-serif text-lg sm:text-xl font-bold text-ink tabular-nums">
                  {longestStreak} {longestStreak === 1 ? "day" : "days"}
                </span>
                <span className="text-[10px] text-ink/65 block">personal record</span>
              </div>
            </div>

            {/* Lifetime Rounds */}
            <div className="p-3.5 sm:p-4 rounded-2xl border border-sandalwood-border/90 bg-paper shadow-2xs flex items-center gap-3 col-span-2 sm:col-span-1 transition-all hover:border-peacock-green/40">
              <div className="size-10 rounded-2xl border border-peacock-green/25 bg-tulsi-wash text-peacock-ink flex items-center justify-center shrink-0 shadow-2xs">
                <Sparkles className="size-5 text-peacock-green" aria-hidden="true" />
              </div>
              <div>
                <span className="text-[10px] font-bold text-ink/75 uppercase tracking-wider block">
                  Lifetime Rounds
                </span>
                <span className="font-serif text-lg sm:text-xl font-bold text-ink tabular-nums">
                  {computedLifetime.toLocaleString()}
                </span>
                <span className="text-[10px] text-ink/65 block">
                  {(computedLifetime * 108).toLocaleString()} Holy Names
                </span>
              </div>
            </div>
          </div>

          {/* Mantra Breakdown */}
          {mantraStats.length > 0 && (
            <div className="space-y-3">
              <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-ink/80 flex items-center gap-2">
                <LotusEmblem size={14} className="text-gold-antique" />
                <span>Mantra Breakdown</span>
              </h3>
              <div className="space-y-2">
                {mantraStats.map((stat, idx) => (
                  <div
                    key={stat.mantraId ?? `legacy-${idx}`}
                    className="p-3 sm:p-3.5 rounded-xl border border-sandalwood-border/80 bg-linen/40 flex items-center justify-between transition-colors hover:bg-linen/60"
                  >
                    <div>
                      <span className="text-xs font-bold text-ink block">
                        {stat.mantraName}
                      </span>
                      <span className="text-[10px] text-ink/70">
                        {(stat.completedRounds * 108).toLocaleString()} Holy Names offered
                      </span>
                    </div>
                    <Badge variant="gold" className="text-xs font-bold tabular-nums">
                      {stat.completedRounds} {stat.completedRounds === 1 ? "round" : "rounds"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Recent Sessions History */}
          <div className="space-y-3">
            <h3 className="font-serif text-xs font-bold uppercase tracking-wider text-ink/80 flex items-center gap-2">
              <History className="size-3.5 text-gold-antique" aria-hidden="true" />
              <span>Today&apos;s Completed Sessions</span>
            </h3>
            {todaySessions.length === 0 ? (
              <p className="text-xs text-ink/70 italic p-4 text-center border border-dashed border-sandalwood-border rounded-2xl bg-linen/20">
                No completed sessions yet today. Begin your beads or manual counter to start recording.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {todaySessions.map((s) => {
                  const durationMin = computeSessionDurationMinutes(s);
                  return (
                    <div
                      key={s.id}
                      className="p-3 rounded-xl border border-sandalwood-border/80 bg-linen/30 flex items-center justify-between text-xs transition-colors hover:bg-linen/50"
                    >
                      <div className="space-y-0.5">
                        <span className="font-bold text-ink block">
                          {s.method === "japa_mala" ? "108-Bead Mala" : "Manual Counter"}
                        </span>
                        <span className="text-[10px] text-ink/70 block">
                          Started at {new Date(s.started_at).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          {durationMin ? ` · ${durationMin} min` : ""}
                        </span>
                      </div>
                      <Badge variant="neutral" className="text-xs font-semibold tabular-nums">
                        {s.rounds_completed} {s.rounds_completed === 1 ? "round" : "rounds"}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Deep Devotional Analytics Link Banner */}
          <div className="rounded-2xl border border-sandalwood-border/90 bg-gradient-to-r from-linen/80 via-paper to-gold-wash/50 p-4 sm:p-4.5 flex items-center justify-between gap-3 shadow-2xs">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5 font-serif text-xs font-bold text-ink">
                <BarChart3 className="size-4 text-gold-antique" />
                <span>Deep Devotional Analytics (Analysis 2.0)</span>
              </div>
              <p className="text-[11px] text-ink/75 leading-tight">
                Inspect 52-week annual heatmap, 4 Vedic Praharas, Sankalpa trajectory &amp; export private reports.
              </p>
            </div>
            <Link
              href="/sadhana/analytics"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gold-border/80 bg-paper px-3 py-2 text-xs font-bold text-gold-ink hover:bg-gold-wash shadow-2xs transition-all shrink-0 active:scale-95"
            >
              <span>Open Analytics</span>
              <ExternalLink className="size-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
