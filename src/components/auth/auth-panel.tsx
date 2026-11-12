"use client";

import * as React from "react";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import {
  requestPasswordResetAction,
  resendVerificationAction,
  signInWithPasswordAction,
  signUpWithPasswordAction,
  type AuthActionState,
} from "@/app/auth/actions";
import { cn } from "@/lib/cn";
import { LotusEmblem } from "@/components/sacred/ornaments";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField, Input, PasswordInput } from "@/components/ui/input";

export type AuthMode = "signin" | "signup" | "forgot";

const INITIAL_STATE: AuthActionState = {};

export function AuthPanel({
  nextPath,
  callbackError,
  initialMode = "signin",
}: {
  nextPath: string;
  callbackError?: string;
  initialMode?: AuthMode;
}) {
  const [mode, setMode] = React.useState<AuthMode>(initialMode);
  const [dismissedTabNotice, setDismissedTabNotice] = React.useState(false);

  // Controlled fields prevent React 19 form resets from clearing user input on errors
  const [displayName, setDisplayName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");

  const [signInState, signInAction, signInPending] = React.useActionState(
    signInWithPasswordAction,
    INITIAL_STATE
  );
  const [signUpState, signUpAction, signUpPending] = React.useActionState(
    signUpWithPasswordAction,
    INITIAL_STATE
  );
  const [forgotState, forgotAction, forgotPending] = React.useActionState(
    requestPasswordResetAction,
    INITIAL_STATE
  );
  const [resendState, resendAction, resendPending] = React.useActionState(
    resendVerificationAction,
    INITIAL_STATE
  );

  function switchMode(nextMode: AuthMode) {
    setMode(nextMode);
    setDismissedTabNotice(true);
  }

  const activeState =
    mode === "signin"
      ? signInState
      : mode === "signup"
        ? signUpState
        : forgotState;

  const activeError = dismissedTabNotice
    ? undefined
    : resendState.error ??
      activeState.error ??
      (mode === "signin" ? callbackError : undefined);

  const activeMessage = dismissedTabNotice
    ? undefined
    : resendState.message ?? activeState.message;
  const pendingEmail = activeState.pendingEmail ?? (email.trim() || undefined);

  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:py-16">
      <Card surface="elevated">
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-[10px] bg-krishna-midnight text-gold-antique">
              <LotusEmblem size={20} />
            </span>
            <div>
              <CardTitle className="font-display text-2xl">
                {mode === "signin"
                  ? "Sign in to Sādhana"
                  : mode === "signup"
                    ? "Create your account"
                    : "Reset your password"}
              </CardTitle>
              <CardDescription>
                Private chanting records synced securely across devices.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-5">
          {/* Mode Switcher */}
          <div
            role="tablist"
            aria-label="Authentication method"
            className="grid grid-cols-3 gap-1 rounded-[12px] border border-sandalwood-border bg-linen p-1"
          >
            {(
              [
                { id: "signin", label: "Sign in" },
                { id: "signup", label: "Sign up" },
                { id: "forgot", label: "Reset" },
              ] as const
            ).map((tab) => {
              const selected = mode === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => switchMode(tab.id)}
                  className={cn(
                    "min-h-10 cursor-pointer rounded-[8px] px-2 text-xs font-medium transition-colors duration-150 sm:text-sm",
                    selected
                      ? "bg-paper text-ink shadow-sacred-sm"
                      : "text-ink-muted hover:text-ink"
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {activeError && (
            <div
              role="alert"
              className="rounded-[10px] border border-kumkum/30 bg-kumkum-wash px-3.5 py-2.5 text-xs leading-relaxed text-kumkum"
            >
              {activeError}
            </div>
          )}

          {activeMessage && (
            <div
              role="status"
              className="rounded-[10px] border border-peacock-green/30 bg-tulsi-wash px-3.5 py-2.5 text-xs leading-relaxed text-peacock-ink"
            >
              {activeMessage}
            </div>
          )}

          {!dismissedTabNotice &&
            activeState.needsEmailVerification &&
            pendingEmail && (
              <form
                action={resendAction}
                onSubmit={() => setDismissedTabNotice(false)}
              >
                <input type="hidden" name="email" value={pendingEmail} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  loading={resendPending}
                  className="w-full"
                >
                  Resend verification email
                </Button>
              </form>
            )}

          {mode === "signin" && (
            <form
              action={signInAction}
              onSubmit={() => setDismissedTabNotice(false)}
              className="space-y-4"
            >
              <input type="hidden" name="next" value={nextPath} />
              <FormField id="signin-email" label="Email" required>
                <Input
                  id="signin-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.org"
                />
              </FormField>

              <FormField id="signin-password" label="Password" required>
                <PasswordInput
                  id="signin-password"
                  name="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  placeholder="Enter your password"
                />
              </FormField>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  onClick={() => switchMode("signup")}
                  className="cursor-pointer font-medium text-ink-muted hover:text-ink hover:underline"
                >
                  New here? Create account
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="cursor-pointer font-medium text-peacock-deep underline underline-offset-2 hover:text-peacock-slate"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={signInPending}
                className="w-full"
              >
                Sign in
              </Button>
            </form>
          )}

          {mode === "signup" && (
            <form
              action={signUpAction}
              onSubmit={() => setDismissedTabNotice(false)}
              className="space-y-4"
            >
              <FormField
                id="signup-name"
                label="Display name"
                hint="Shown to you on your dashboard; never shared publicly by default."
                required
              >
                <Input
                  id="signup-name"
                  name="displayName"
                  type="text"
                  autoComplete="name"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  required
                  maxLength={80}
                  placeholder="Your name"
                />
              </FormField>

              <FormField id="signup-email" label="Email" required>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.org"
                />
              </FormField>

              <FormField
                id="signup-password"
                label="Password"
                hint="Minimum 8 characters. Click the eye icon to verify your typing."
                required
              >
                <PasswordInput
                  id="signup-password"
                  name="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  maxLength={128}
                  placeholder="At least 8 characters"
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={signUpPending}
                className="w-full"
              >
                Create account
              </Button>
            </form>
          )}

          {mode === "forgot" && (
            <form
              action={forgotAction}
              onSubmit={() => setDismissedTabNotice(false)}
              className="space-y-4"
            >
              <FormField
                id="forgot-email"
                label="Account email"
                hint="We will send a password recovery link to reset your password."
                required
              >
                <Input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="you@example.org"
                />
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="lg"
                loading={forgotPending}
                className="w-full"
              >
                Send reset link
              </Button>
            </form>
          )}

          <div className="flex items-start gap-2 border-t border-sandalwood-border pt-4 text-xs leading-relaxed text-ink-muted">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-peacock-ink"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p>
              Conservative privacy defaults protect all personal chanting
              history.{" "}
              <Link
                href="/"
                className="font-medium text-ink underline underline-offset-2"
              >
                Return to Sanctum
              </Link>
              .
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
