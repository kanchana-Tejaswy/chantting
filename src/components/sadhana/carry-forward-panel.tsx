"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, CheckCircle2, Info } from "lucide-react";
import { cn } from "@/lib/cn";
import type {
  CarryForwardLedgerEntry,
  PendingOptionalCarryOffer,
  UnappliedPendingNotice,
} from "@/lib/sadhana/carry-forward";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Input } from "@/components/ui/input";

type PolicyId = "automatic" | "optional" | "fresh_daily" | "custom";

const POLICIES: ReadonlyArray<{
  id: PolicyId;
  title: string;
  summary: string;
  example: string;
}> = [
  {
    id: "automatic",
    title: "Automatically carry forward",
    summary: "Add yesterday's unfinished rounds to today's target.",
    example: "16 base target + 5 yesterday unfinished = 21 today's effective target.",
  },
  {
    id: "optional",
    title: "Ask me every day",
    summary: "Let me decide whether to carry forward or skip.",
    example: "Each morning, choose between 21 (carry 5 pending) or 16 (start fresh).",
  },
  {
    id: "fresh_daily",
    title: "Start fresh every day",
    summary: "Keep today's target at my original daily target.",
    example: "Always starts at 16 base target. Past unfinished rounds remain logged in history.",
  },
  {
    id: "custom",
    title: "Set a carry-forward limit",
    summary: "Carry pending rounds up to my chosen limit.",
    example: "With limit of 4, if 7 rounds were pending, 4 carry forward (target 20) and 3 stay in history.",
  },
];

export interface CarryForwardPanelProps {
  todayDate: string;
  currentPolicy: PolicyId;
  todayPolicyApplied: PolicyId;
  currentMaxCarryCap?: number;
  todayCompletedRounds: number;
  pendingOptionalOffer: PendingOptionalCarryOffer | null;
  unappliedPendingNotice: UnappliedPendingNotice | null;
  ledger: CarryForwardLedgerEntry[];
  originalDailyTarget?: number;
  previousPendingBalance?: number;
  effectiveDailyTarget?: number;
  remainingBalance?: number;
}

export function CarryForwardPanel({
  todayDate,
  currentPolicy,
  todayPolicyApplied,
  currentMaxCarryCap,
  todayCompletedRounds,
  pendingOptionalOffer,
  unappliedPendingNotice,
  ledger,
  originalDailyTarget,
  previousPendingBalance,
  effectiveDailyTarget,
  remainingBalance,
}: CarryForwardPanelProps) {
  const router = useRouter();
  const [selectedPolicy, setSelectedPolicy] =
    React.useState<PolicyId>(currentPolicy);
  const [maxCapInput, setMaxCapInput] = React.useState(
    currentMaxCarryCap !== undefined ? String(currentMaxCarryCap) : "16"
  );
  const [applyToToday, setApplyToToday] = React.useState(
    todayCompletedRounds === 0
  );
  const [isSavingPolicy, setIsSavingPolicy] = React.useState(false);
  const [isResolvingOffer, setIsResolvingOffer] = React.useState(false);
  const [showSettings, setShowSettings] = React.useState(true);
  const [feedback, setFeedback] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const handleResolveOffer = async (accept: boolean) => {
    if (!pendingOptionalOffer || isResolvingOffer) return;
    setIsResolvingOffer(true);
    setError(null);
    setFeedback(null);

    try {
      const res = await fetch("/api/sadhana/carry-forward/resolve", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sadhanaDate: pendingOptionalOffer.sadhanaDate,
          accept,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Unable to record decision.");
      }
      setFeedback(
        accept
          ? `Added ${pendingOptionalOffer.pendingRounds} pending rounds into today's effective target.`
          : "Starting fresh today. Prior pending rounds remain recorded in your history."
      );
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply decision."
      );
    } finally {
      setIsResolvingOffer(false);
    }
  };

  const handleSavePolicy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSavingPolicy) return;

    setIsSavingPolicy(true);
    setError(null);
    setFeedback(null);

    const parsedCap =
      selectedPolicy === "custom" ? Number.parseInt(maxCapInput, 10) : null;

    if (
      selectedPolicy === "custom" &&
      (Number.isNaN(parsedCap) || (parsedCap ?? -1) < 0 || (parsedCap ?? 0) > 500)
    ) {
      setError("Custom cap must be a whole number between 0 and 500.");
      setIsSavingPolicy(false);
      return;
    }

    try {
      const res = await fetch("/api/sadhana/carry-forward/policy", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          policy: selectedPolicy,
          maxCarryCap: parsedCap,
          applyToToday,
          todayDate,
        }),
      });
      const json = (await res.json()) as { error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? "Could not update policy.");
      }
      setFeedback(
        applyToToday
          ? "Carry-forward policy updated and applied to today. Historical days remain unchanged."
          : "Carry-forward policy saved for upcoming days. Today's and past records remain unchanged."
      );
      setShowSettings(false);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save policy."
      );
    } finally {
      setIsSavingPolicy(false);
    }
  };

  return (
    <section aria-labelledby="carry-forward-heading" className="space-y-4">
      {/* Optional Carry-Forward Decision Banner */}
      {pendingOptionalOffer && (
        <Card surface="elevated" className="border-gold-border/50 bg-gold-wash/60">
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle className="text-lg">
                Optional carry-forward awaiting your decision
              </CardTitle>
              <Badge variant="gold" className="tabular-nums">
                +{pendingOptionalOffer.pendingRounds} from{" "}
                {pendingOptionalOffer.fromDate}
              </Badge>
            </div>
            <CardDescription className="text-ink opacity-90">
              You ended {pendingOptionalOffer.fromDate} with{" "}
              <strong className="font-medium tabular-nums">
                {pendingOptionalOffer.pendingRounds} unfinished rounds
              </strong>
              . Choose whether to include them in today&apos;s target or begin
              with your base target. Either way, prior records stay intact.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              size="md"
              loading={isResolvingOffer}
              onClick={() => void handleResolveOffer(true)}
            >
              Carry forward (+{pendingOptionalOffer.pendingRounds})
            </Button>
            <Button
              variant="secondary"
              size="md"
              disabled={isResolvingOffer}
              onClick={() => void handleResolveOffer(false)}
            >
              Start fresh today
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Unapplied Overflow / Cap Transparency Notice */}
      {unappliedPendingNotice && !pendingOptionalOffer && (
        <div className="flex items-start gap-2.5 rounded-[12px] border border-sandalwood-border bg-linen px-4 py-3 text-xs leading-relaxed text-ink-muted">
          <Info
            className="mt-0.5 size-4 shrink-0 text-gold-ink"
            strokeWidth={1.75}
            aria-hidden={true}
          />
          <span>
            Prior day ({unappliedPendingNotice.fromDate}) ended with{" "}
            <strong className="font-medium text-ink tabular-nums">
              {unappliedPendingNotice.sourceRemaining}
            </strong>{" "}
            pending rounds:{" "}
            <strong className="font-medium text-ink tabular-nums">
              {unappliedPendingNotice.carriedAmount}
            </strong>{" "}
            applied today and{" "}
            <strong className="font-medium text-ink tabular-nums">
              {unappliedPendingNotice.unappliedRounds}
            </strong>{" "}
            exceeding today&apos;s{" "}
            <span className="capitalize">
              {unappliedPendingNotice.policyApplied.replace("_", " ")}
            </span>{" "}
            rule remain recorded in your history (never erased).
          </span>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-[10px] border border-kumkum/30 bg-kumkum-wash px-4 py-2.5 text-xs text-kumkum"
        >
          {error}
        </div>
      )}

      {feedback && (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[10px] border border-peacock-green/25 bg-tulsi-wash px-4 py-2.5 text-xs text-peacock-ink"
        >
          <CheckCircle2 className="size-4 shrink-0" aria-hidden={true} />
          <span>{feedback}</span>
        </div>
      )}

      {/* Policy Controls & Ledger Card */}
      <Card surface="parchment" className="rounded-[20px] p-5 sm:p-6 shadow-sacred-sm">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle id="carry-forward-heading" className="flex items-center gap-2 text-xl font-serif">
              <ArrowRightLeft
                className="size-4 text-peacock-deep"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Carry-Forward Engine &amp; Ledger</span>
            </CardTitle>
            <CardDescription className="text-sm">
              Saved preference:{" "}
              <strong className="font-semibold capitalize text-ink">
                {currentPolicy.replace("_", " ")}
              </strong>
              {currentPolicy === "custom" && currentMaxCarryCap !== undefined
                ? ` (cap: ${currentMaxCarryCap} rounds)`
                : ""}
              {" · "}Today applied:{" "}
              <strong className="font-semibold capitalize text-ink">
                {todayPolicyApplied.replace("_", " ")}
              </strong>
            </CardDescription>
            <div className="mt-2 flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-sandalwood-border/70 bg-linen/80 px-2.5 py-0.5 text-[11px] font-medium text-ink-muted">
                <span className="font-semibold text-ink">Formula:</span>
                <span>Base Target + Carried Balance = Effective Target</span>
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSettings((prev) => !prev)}
            className="rounded-[10px] active:scale-[0.96]"
          >
            {showSettings ? "Close policy settings" : "Change policy"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Five Core Sādhana Metrics Clearly Distinguished */}
          <div className="rounded-[16px] border border-sandalwood-border/80 bg-linen/70 p-4">
            <div className="mb-2.5 flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-xs font-semibold uppercase tracking-wider text-peacock-deep">
                Today&apos;s Target &amp; Progress Breakdown
              </span>
              <span className="text-[11px] font-medium text-ink-muted tabular-nums">
                Formula: Base ({originalDailyTarget ?? 16}) + Carried ({previousPendingBalance ?? 0}) = Effective ({effectiveDailyTarget ?? 16})
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-5">
              <div className="rounded-[12px] border border-sandalwood-border/70 bg-paper p-3 shadow-sacred-xs">
                <p className="text-[11px] font-medium text-ink-muted">1. Daily Base Target</p>
                <p className="mt-0.5 font-serif text-2xl font-semibold text-ink tabular-nums">
                  {originalDailyTarget ?? 16}
                </p>
                <p className="text-[10px] text-ink-muted">Your baseline goal</p>
              </div>

              <div className="rounded-[12px] border border-gold-border/40 bg-gold-wash/50 p-3 shadow-sacred-xs">
                <p className="text-[11px] font-medium text-gold-ink">2. Previous Pending</p>
                <p className="mt-0.5 font-serif text-2xl font-semibold text-gold-ink tabular-nums">
                  +{previousPendingBalance ?? 0}
                </p>
                <p className="text-[10px] text-ink-muted">Carried from prior day</p>
              </div>

              <div className="rounded-[12px] border border-peacock-deep/30 bg-tulsi-wash/60 p-3 shadow-sacred-xs">
                <p className="text-[11px] font-medium text-peacock-ink">3. Effective Target</p>
                <p className="mt-0.5 font-serif text-2xl font-semibold text-peacock-deep tabular-nums">
                  ={effectiveDailyTarget ?? 16}
                </p>
                <p className="text-[10px] text-ink-muted">Base + Carried</p>
              </div>

              <div className="rounded-[12px] border border-peacock-green/40 bg-tulsi-wash/70 p-3 shadow-sacred-xs">
                <p className="text-[11px] font-medium text-peacock-ink">4. Completed Today</p>
                <p className="mt-0.5 font-serif text-2xl font-semibold text-peacock-deep tabular-nums">
                  {todayCompletedRounds}
                </p>
                <p className="text-[10px] text-ink-muted">Rounds offered</p>
              </div>

              <div className="col-span-2 rounded-[12px] border border-sandalwood-border/70 bg-paper p-3 shadow-sacred-xs sm:col-span-1">
                <p className="text-[11px] font-medium text-ink-muted">5. Remaining Rounds</p>
                <p className="mt-0.5 font-serif text-2xl font-semibold text-ink tabular-nums">
                  {remainingBalance !== undefined
                    ? remainingBalance
                    : Math.max(0, (effectiveDailyTarget ?? 16) - todayCompletedRounds)}
                </p>
                <p className="text-[10px] text-ink-muted">Left to finish</p>
              </div>
            </div>
          </div>

          {showSettings && (
            <form
              onSubmit={(e) => void handleSavePolicy(e)}
              className="space-y-4 rounded-[16px] border border-sandalwood-border/80 bg-linen/70 p-4 sm:p-5"
            >
              <div className="space-y-1">
                <p className="text-sm font-semibold text-ink">Choose your rollover policy</p>
                <p className="text-xs text-ink-muted">
                  Select how SMARAN should handle unfinished rounds when a new calendar day begins.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                {POLICIES.map((p) => {
                  const active = selectedPolicy === p.id;
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "flex cursor-pointer flex-col justify-between gap-2.5 rounded-[14px] border p-4 transition-all duration-150",
                        active
                          ? "border-peacock-deep/80 bg-paper shadow-sacred-sm ring-1 ring-peacock-deep/20"
                          : "border-sandalwood-border/70 bg-paper/60 hover:bg-paper hover:border-sandalwood-strong"
                      )}
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <input
                            type="radio"
                            name="carryPolicy"
                            value={p.id}
                            checked={active}
                            onChange={() => setSelectedPolicy(p.id)}
                            className="size-4 accent-peacock-deep"
                          />
                          <span className="text-sm font-semibold text-ink">
                            {p.title}
                          </span>
                        </div>
                        <p className="pl-6 text-xs leading-relaxed text-ink-muted">
                          {p.summary}
                        </p>
                      </div>

                      <div className="ml-6 rounded-[8px] border border-sandalwood-border/60 bg-linen/70 px-2.5 py-1.5 text-[11px] text-ink-muted leading-relaxed">
                        <strong className="font-semibold text-peacock-deep">Example: </strong>
                        <span>{p.example}</span>
                      </div>
                    </label>
                  );
                })}
              </div>

              {selectedPolicy === "custom" && (
                <FormField
                  id="cf-max-cap"
                  label="Maximum rounds carried forward per day"
                  hint="Any pending rounds above this cap remain in prior daily records."
                >
                  <Input
                    id="cf-max-cap"
                    type="number"
                    min={0}
                    max={500}
                    value={maxCapInput}
                    onChange={(e) => setMaxCapInput(e.target.value)}
                    className="max-w-48 tabular-nums rounded-[10px]"
                  />
                </FormField>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink">
                <input
                  type="checkbox"
                  checked={applyToToday}
                  onChange={(e) => setApplyToToday(e.target.checked)}
                  className="mt-0.5 size-4 rounded accent-peacock-deep"
                />
                <span>
                  Also re-evaluate today&apos;s target ({todayDate}) using this
                  policy. Historical days before today are never altered.
                </span>
              </label>

              <div className="flex flex-wrap justify-end gap-2.5 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                  className="rounded-[10px]"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isSavingPolicy}
                  className="rounded-[10px] active:scale-[0.96]"
                >
                  Save policy
                </Button>
              </div>
            </form>
          )}

          {ledger.length === 0 ? (
            <p className="rounded-[12px] border border-sandalwood-border/70 bg-linen/60 px-4 py-3.5 text-xs text-ink-muted leading-relaxed">
              No day-to-day rollovers recorded yet. Transitions appear here as
              new local days open.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-[12px] border border-sandalwood-border/60">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sandalwood-border/80 bg-linen/50 text-ink-muted">
                    <th className="py-2.5 px-3.5 font-semibold">Transition</th>
                    <th className="py-2.5 px-3.5 font-semibold">Policy</th>
                    <th className="py-2.5 px-3.5 font-semibold">Prior Pending</th>
                    <th className="py-2.5 px-3.5 font-semibold">Carried</th>
                    <th className="py-2.5 px-3.5 font-semibold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sandalwood-border/60">
                  {ledger.slice(0, 7).map((entry) => {
                    const unapplied =
                      entry.source_remaining_balance - entry.carried_amount;
                    return (
                      <tr key={entry.id} className="transition-colors hover:bg-linen/40">
                        <td className="py-3 px-3.5 font-semibold text-ink tabular-nums whitespace-nowrap">
                          {entry.from_date} to {entry.to_date}
                        </td>
                        <td className="py-3 px-3.5 capitalize text-ink-muted">
                          {entry.policy_applied.replace("_", " ")}
                        </td>
                        <td className="py-3 px-3.5 text-ink tabular-nums">
                          {entry.source_remaining_balance}
                        </td>
                        <td className="py-3 px-3.5 font-semibold text-peacock-ink tabular-nums">
                          +{entry.carried_amount}
                          {unapplied > 0 && (
                            <span className="ml-1.5 text-[11px] font-normal text-ink-muted">
                              ({unapplied} unapplied)
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3.5 text-ink-muted">
                          {entry.notes ?? "Recorded automatically"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );
}

