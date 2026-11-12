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
}> = [
  {
    id: "automatic",
    title: "Automatic",
    summary:
      "Yesterday's remaining rounds carry into today's target automatically.",
  },
  {
    id: "optional",
    title: "Optional",
    summary:
      "Prompts you each morning with pending rounds to carry forward or skip.",
  },
  {
    id: "fresh_daily",
    title: "Fresh daily",
    summary:
      "Starts each day at your base target; prior unfinished rounds stay logged in history.",
  },
  {
    id: "custom",
    title: "Custom cap",
    summary:
      "Carries forward pending rounds up to a daily cap without discarding overflow history.",
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
  const [showSettings, setShowSettings] = React.useState(false);
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
      <Card surface="parchment">
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle id="carry-forward-heading" className="flex items-center gap-2 text-lg">
              <ArrowRightLeft
                className="size-4 text-peacock-deep"
                strokeWidth={1.75}
                aria-hidden={true}
              />
              <span>Carry-Forward Engine &amp; Ledger</span>
            </CardTitle>
            <CardDescription>
              Saved preference:{" "}
              <strong className="font-medium capitalize text-ink">
                {currentPolicy.replace("_", " ")}
              </strong>
              {currentPolicy === "custom" && currentMaxCarryCap !== undefined
                ? ` (cap: ${currentMaxCarryCap} rounds)`
                : ""}
              {" · "}Today applied:{" "}
              <strong className="font-medium capitalize text-ink">
                {todayPolicyApplied.replace("_", " ")}
              </strong>
            </CardDescription>
          </div>

          <Button
            variant="secondary"
            size="sm"
            onClick={() => setShowSettings((prev) => !prev)}
          >
            {showSettings ? "Close policy settings" : "Change policy"}
          </Button>
        </CardHeader>

        <CardContent className="space-y-5">
          {showSettings && (
            <form
              onSubmit={(e) => void handleSavePolicy(e)}
              className="space-y-4 rounded-[12px] border border-sandalwood-border bg-linen p-4"
            >
              <div className="grid gap-2.5 sm:grid-cols-2">
                {POLICIES.map((p) => {
                  const active = selectedPolicy === p.id;
                  return (
                    <label
                      key={p.id}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-[10px] border p-3 transition-colors duration-150",
                        active
                          ? "border-peacock-deep bg-paper shadow-sacred-sm"
                          : "border-sandalwood-border bg-ivory/70 hover:bg-paper"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-ink">
                        <input
                          type="radio"
                          name="carryPolicy"
                          value={p.id}
                          checked={active}
                          onChange={() => setSelectedPolicy(p.id)}
                          className="accent-peacock-deep"
                        />
                        {p.title}
                      </span>
                      <span className="text-xs leading-relaxed text-ink-muted">
                        {p.summary}
                      </span>
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
                    className="max-w-48 tabular-nums"
                  />
                </FormField>
              )}

              <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-ink">
                <input
                  type="checkbox"
                  checked={applyToToday}
                  onChange={(e) => setApplyToToday(e.target.checked)}
                  className="mt-0.5 accent-peacock-deep"
                />
                <span>
                  Also re-evaluate today&apos;s target ({todayDate}) using this
                  policy. Historical days before today are never altered.
                </span>
              </label>

              <div className="flex flex-wrap justify-end gap-2.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowSettings(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  loading={isSavingPolicy}
                >
                  Save policy
                </Button>
              </div>
            </form>
          )}

          {ledger.length === 0 ? (
            <p className="rounded-[10px] border border-sandalwood-border bg-linen px-4 py-3 text-xs text-ink-muted">
              No day-to-day rollovers recorded yet. Transitions appear here as
              new local days open.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-sandalwood-border text-ink-muted">
                    <th className="py-2 pr-3 font-medium">Transition</th>
                    <th className="py-2 pr-3 font-medium">Policy</th>
                    <th className="py-2 pr-3 font-medium">Prior Pending</th>
                    <th className="py-2 pr-3 font-medium">Carried</th>
                    <th className="py-2 font-medium">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-sandalwood-border/60">
                  {ledger.slice(0, 7).map((entry) => {
                    const unapplied =
                      entry.source_remaining_balance - entry.carried_amount;
                    return (
                      <tr key={entry.id}>
                        <td className="py-2.5 pr-3 font-medium text-ink tabular-nums whitespace-nowrap">
                          {entry.from_date} to {entry.to_date}
                        </td>
                        <td className="py-2.5 pr-3 capitalize text-ink-muted">
                          {entry.policy_applied.replace("_", " ")}
                        </td>
                        <td className="py-2.5 pr-3 text-ink tabular-nums">
                          {entry.source_remaining_balance}
                        </td>
                        <td className="py-2.5 pr-3 font-medium text-peacock-ink tabular-nums">
                          +{entry.carried_amount}
                          {unapplied > 0 && (
                            <span className="ml-1.5 text-[11px] font-normal text-ink-muted">
                              ({unapplied} unapplied)
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-ink-muted">
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

