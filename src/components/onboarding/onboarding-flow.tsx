"use client";

import * as React from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import {
  completeOnboardingAction,
  type OnboardingActionState,
} from "@/app/onboarding/actions";
import { cn } from "@/lib/cn";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { Badge } from "@/components/ui/badge";
import { Button, buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Input, Select } from "@/components/ui/input";

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Paris",
  "Australia/Sydney",
  "Asia/Singapore",
  "Asia/Tokyo",
];

const TARGET_PRESETS = [1, 4, 8, 16] as const;

const POLICY_OPTIONS = [
  {
    value: "automatic",
    label: "Automatic carry-forward",
    description:
      "Unfinished rounds carry into tomorrow's target automatically so commitments stay visible.",
  },
  {
    value: "optional",
    label: "Optional carry-forward",
    description:
      "Ask each morning whether to include pending rounds or begin fresh.",
  },
  {
    value: "fresh_daily",
    label: "Fresh daily target",
    description:
      "Start each day with your original target without carrying pending balance forward.",
  },
  {
    value: "custom",
    label: "Custom carry-forward cap",
    description:
      "Carry pending rounds forward up to a maximum daily limit you choose.",
  },
] as const;

const INITIAL_STATE: OnboardingActionState = {};

export interface OnboardingFlowProps {
  initialDisplayName: string;
  initialTimezone: string;
  initialDailyTarget: number;
  initialPolicy: "automatic" | "optional" | "fresh_daily" | "custom";
  initialMaxCarryCap?: number;
  isEditing: boolean;
}

const subscribeNoop = () => () => {};

function getBrowserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

export function OnboardingFlow({
  initialDisplayName,
  initialTimezone,
  initialDailyTarget,
  initialPolicy,
  initialMaxCarryCap,
  isEditing,
}: OnboardingFlowProps) {
  const browserTimezone = React.useSyncExternalStore(
    subscribeNoop,
    getBrowserTimezone,
    () => initialTimezone
  );
  const autoTimezone =
    !isEditing && initialTimezone === "UTC" ? browserTimezone : initialTimezone;

  const [displayName, setDisplayName] = React.useState(initialDisplayName);
  const [customTimezone, setCustomTimezone] = React.useState<string | null>(null);
  const timezone = customTimezone ?? autoTimezone;
  const [dailyTarget, setDailyTarget] = React.useState(String(initialDailyTarget));
  const [policy, setPolicy] = React.useState(initialPolicy);
  const [maxCarryCap, setMaxCarryCap] = React.useState(
    initialMaxCarryCap !== undefined ? String(initialMaxCarryCap) : "16"
  );

  const timezoneChoices = React.useMemo(() => {
    const set = new Set(COMMON_TIMEZONES);
    if (timezone) set.add(timezone);
    return Array.from(set);
  }, [timezone]);

  const [state, action, pending] = React.useActionState(
    completeOnboardingAction,
    INITIAL_STATE
  );

  if (state.completed && state.summary) {
    return (
      <div className="mx-auto max-w-xl px-5 py-12 sm:py-16">
        <Card surface="elevated">
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="flex size-11 items-center justify-center rounded-[12px] bg-tulsi-wash text-peacock-ink">
                <CheckCircle2 className="size-6" strokeWidth={1.75} aria-hidden={true} />
              </span>
              <div>
                <Badge variant="peacock">Commitment Saved</Badge>
                <CardTitle className="mt-1.5 font-display text-3xl">
                  Your Sādhana space is ready
                </CardTitle>
              </div>
            </div>
            <CardDescription className="mt-2">
              Preferences are stored privately in your profile and synced across
              sessions.
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-3">
            <dl className="grid gap-3 rounded-[12px] border border-sandalwood-border bg-linen p-4 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-xs text-ink-muted">Display name</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {state.summary.displayName}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Timezone</dt>
                <dd className="mt-0.5 font-medium text-ink">
                  {state.summary.timezone}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Daily target</dt>
                <dd className="mt-0.5 font-medium text-ink tabular-nums">
                  {state.summary.dailyRoundTarget} rounds / day
                </dd>
              </div>
              <div>
                <dt className="text-xs text-ink-muted">Carry-forward policy</dt>
                <dd className="mt-0.5 font-medium capitalize text-ink">
                  {state.summary.carryForwardPolicy.replace("_", " ")}
                </dd>
              </div>
            </dl>
          </CardContent>

          <CardFooter>
            <Link
              href="/sadhana"
              className={buttonStyles({ variant: "primary", size: "lg" })}
            >
              Open Personal Dashboard
            </Link>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-5 py-10 sm:py-14">
      <Card surface="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-krishna-midnight text-gold-antique">
              <LotusEmblem size={20} />
            </span>
            <div>
              <CardTitle className="font-display text-3xl">
                {isEditing
                  ? "Update daily commitment"
                  : "Set your daily Sādhana"}
              </CardTitle>
              <CardDescription>
                Welcome to SMARAN (स्मरण). Only essential preferences are
                asked—keeping your practice quiet and timezone-accurate.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <form action={action} className="space-y-6">
            {state.error && (
              <div
                role="alert"
                className="rounded-[10px] border border-kumkum/30 bg-kumkum-wash px-3.5 py-2.5 text-xs leading-relaxed text-kumkum"
              >
                {state.error}
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                id="onboarding-name"
                label="Display name"
                hint="How your dashboard greets you."
                required
              >
                <Input
                  id="onboarding-name"
                  name="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={80}
                />
              </FormField>

              <FormField
                id="onboarding-timezone"
                label="Preferred timezone"
                hint="Determines midnight day rollovers."
                required
              >
                <Select
                  id="onboarding-timezone"
                  name="timezone"
                  value={timezone}
                  onChange={(e) => setCustomTimezone(e.target.value)}
                >
                  {timezoneChoices.map((tz) => (
                    <option key={tz} value={tz}>
                      {tz}
                    </option>
                  ))}
                </Select>
              </FormField>
            </div>

            <div className="space-y-3">
              <FormField
                id="onboarding-target"
                label="Daily chanting target (rounds)"
                hint="Select a gentle starting commitment between 1 and 192 rounds."
                required
              >
                <div className="flex flex-wrap gap-2 pb-1">
                  {TARGET_PRESETS.map((preset) => {
                    const active = Number(dailyTarget) === preset;
                    return (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setDailyTarget(String(preset))}
                        className={cn(
                          "min-h-10 cursor-pointer rounded-[10px] border px-3.5 text-sm font-medium tabular-nums transition-colors duration-150",
                          active
                            ? "border-peacock-deep bg-peacock-deep text-ink-on-dark"
                            : "border-sandalwood-border bg-paper text-ink hover:bg-linen"
                        )}
                      >
                        {preset} {preset === 1 ? "round" : "rounds"}
                      </button>
                    );
                  })}
                </div>
                <Input
                  id="onboarding-target"
                  name="dailyRoundTarget"
                  type="number"
                  min={1}
                  max={192}
                  step={1}
                  value={dailyTarget}
                  onChange={(e) => setDailyTarget(e.target.value)}
                  required
                  className="tabular-nums"
                />
              </FormField>
            </div>

            <fieldset className="space-y-2.5">
              <legend className="text-sm font-medium text-ink">
                Carry-forward preference
              </legend>
              <div className="grid gap-2.5 sm:grid-cols-2">
                {POLICY_OPTIONS.map((option) => {
                  const selected = policy === option.value;
                  return (
                    <label
                      key={option.value}
                      className={cn(
                        "flex cursor-pointer flex-col gap-1 rounded-[12px] border p-3.5 transition-colors duration-150",
                        selected
                          ? "border-peacock-deep bg-tulsi-wash/60"
                          : "border-sandalwood-border bg-paper hover:bg-linen/70"
                      )}
                    >
                      <span className="flex items-center gap-2 text-sm font-medium text-ink">
                        <input
                          type="radio"
                          name="carryForwardPolicy"
                          value={option.value}
                          checked={selected}
                          onChange={() => setPolicy(option.value)}
                          className="accent-peacock-deep"
                        />
                        {option.label}
                      </span>
                      <span className="text-xs leading-relaxed text-ink-muted">
                        {option.description}
                      </span>
                    </label>
                  );
                })}
              </div>

              {policy === "custom" && (
                <FormField
                  id="onboarding-cap"
                  label="Maximum carried-forward rounds per day"
                  hint="Caps how many pending rounds add to a single day."
                  className="pt-2"
                >
                  <Input
                    id="onboarding-cap"
                    name="maxCarryCap"
                    type="number"
                    min={0}
                    max={500}
                    value={maxCarryCap}
                    onChange={(e) => setMaxCarryCap(e.target.value)}
                    className="tabular-nums"
                  />
                </FormField>
              )}
            </fieldset>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-sandalwood-border pt-4">
              {isEditing ? (
                <Link
                  href="/sadhana"
                  className={buttonStyles({ variant: "secondary", size: "md" })}
                >
                  Cancel
                </Link>
              ) : (
                <span className="text-xs text-ink-muted">
                  You can adjust these anytime.
                </span>
              )}

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={pending}
              >
                {isEditing ? "Save preferences" : "Save and continue"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

