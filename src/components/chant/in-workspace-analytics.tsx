"use client";

import * as React from "react";
import {
  BarChart3,
  Flame,
  History,
  Sparkles,
  Trophy,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ProgressBar } from "@/components/ui/progress";
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
}: InWorkspaceAnalyticsProps) {
  if (!isOpen) return null;

  const completed = dailySadhana.completed_rounds;
  const target = dailySadhana.effective_daily_target;
  const remaining = dailySadhana.remaining_balance;
  const extra = dailySadhana.extra_rounds;
  const completionPct = Math.min(100, Math.round((completed / Math.max(1, target)) * 100));

  // Compute lifetime sum if not provided
  const computedLifetime =
    lifetimeRounds ??
    mantraStats.reduce((acc, m) => acc + m.completedRounds, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-parchment-light dark:bg-sacred-ash border border-gold/30 shadow-2xl p-6">
        <div className="flex items-center justify-between pb-4 border-b border-gold/20">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gold" />
            <h2 className="font-display text-xl font-semibold text-ink dark:text-parchment">
              Sādhana Progress & Insights
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-ink-muted hover:text-ink hover:bg-gold/10 transition-colors"
            aria-label="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="mt-5 space-y-6">
          {/* Today's Target Fulfillment Card */}
          <div className="p-4 rounded-xl border border-gold/30 bg-gold/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                Today&apos;s Effective Target
              </span>
              <Badge variant={completed >= target ? "peacock" : "gold"}>
                {completed >= target ? "Target Met" : `${remaining} rounds left`}
              </Badge>
            </div>

            <div className="flex items-baseline justify-between">
              <div className="font-display text-3xl font-bold text-ink dark:text-parchment">
                {completed}{" "}
                <span className="text-base font-normal text-ink-muted">
                  / {target} rounds
                </span>
              </div>
              <span className="text-sm font-semibold text-gold">
                {completionPct}%
              </span>
            </div>

            <ProgressBar
              value={completed}
              max={target}
              label="Today's Sadhana Progress"
              tone={completed >= target ? "peacock" : "gold"}
            />

            <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs">
              <div className="p-2 rounded bg-parchment/60 dark:bg-sacred-stone/40 border border-gold/10">
                <span className="text-ink-muted block text-[10px]">Base Target</span>
                <span className="font-semibold text-ink dark:text-parchment text-sm">
                  {dailySadhana.original_daily_target}
                </span>
              </div>
              <div className="p-2 rounded bg-parchment/60 dark:bg-sacred-stone/40 border border-gold/10">
                <span className="text-ink-muted block text-[10px]">Carried Pending</span>
                <span className="font-semibold text-sacred-saffron text-sm">
                  +{dailySadhana.previous_pending_balance}
                </span>
              </div>
              <div className="p-2 rounded bg-parchment/60 dark:bg-sacred-stone/40 border border-gold/10">
                <span className="text-ink-muted block text-[10px]">Extra / Over-Target</span>
                <span className="font-semibold text-forest text-sm">
                  +{extra}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] text-ink-muted pt-1 border-t border-gold/10">
              <span>Logged submissions: {todayRecords.length}</span>
              <span>Today&apos;s sessions: {todaySessions.length}</span>
            </div>
          </div>

          {/* Consistency & Streaks Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3.5 rounded-xl border border-gold/20 bg-parchment/60 dark:bg-sacred-stone/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-sacred-saffron/10 text-sacred-saffron flex items-center justify-center shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-ink-muted block">Current Streak</span>
                <span className="font-display text-lg font-bold text-ink dark:text-parchment">
                  {currentStreak} {currentStreak === 1 ? "day" : "days"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gold/20 bg-parchment/60 dark:bg-sacred-stone/40 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gold/10 text-gold flex items-center justify-center shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-ink-muted block">Longest Streak</span>
                <span className="font-display text-lg font-bold text-ink dark:text-parchment">
                  {longestStreak} {longestStreak === 1 ? "day" : "days"}
                </span>
              </div>
            </div>

            <div className="p-3.5 rounded-xl border border-gold/20 bg-parchment/60 dark:bg-sacred-stone/40 flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="w-9 h-9 rounded-full bg-forest/10 text-forest flex items-center justify-center shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] text-ink-muted block">Lifetime Rounds</span>
                <span className="font-display text-lg font-bold text-ink dark:text-parchment">
                  {computedLifetime}
                </span>
              </div>
            </div>
          </div>

          {/* Mantra Breakdown */}
          {mantraStats.length > 0 && (
            <div className="space-y-2.5">
              <h3 className="font-display text-sm font-semibold text-ink dark:text-parchment flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-gold" /> Mantra Breakdown
              </h3>
              <div className="space-y-2">
                {mantraStats.map((stat, idx) => (
                  <div
                    key={stat.mantraId ?? `legacy-${idx}`}
                    className="p-3 rounded-lg border border-gold/15 bg-parchment/50 dark:bg-sacred-stone/30 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-semibold text-ink dark:text-parchment block">
                        {stat.mantraName}
                      </span>
                    </div>
                    <Badge variant="gold" className="text-xs">
                      {stat.completedRounds} {stat.completedRounds === 1 ? "round" : "rounds"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Today's Recent Sessions History */}
          <div className="space-y-2.5">
            <h3 className="font-display text-sm font-semibold text-ink dark:text-parchment flex items-center gap-1.5">
              <History className="w-4 h-4 text-gold" /> Today&apos;s Completed Sessions
            </h3>
            {todaySessions.length === 0 ? (
              <p className="text-xs text-ink-muted italic p-3 text-center border border-dashed border-gold/20 rounded-lg">
                No completed sessions yet today. Begin your beads to start recording.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {todaySessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg border border-gold/15 bg-parchment/40 dark:bg-sacred-stone/30 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-medium text-ink dark:text-parchment">
                        {s.method === "japa_mala" ? "108-Bead Mala" : "Manual Counter"}
                      </span>
                      <span className="text-[10px] text-ink-muted block">
                        {new Date(s.started_at).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <Badge variant="neutral" className="text-xs">
                      {s.rounds_completed} {s.rounds_completed === 1 ? "round" : "rounds"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
