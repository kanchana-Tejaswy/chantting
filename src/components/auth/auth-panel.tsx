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
import { createClient } from "@/lib/supabase/client";
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

function GoogleMark() {
  return (
    <svg
      className="size-4 shrink-0"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path
        fill="#4285F4"
        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96Z"
      />
    </svg>
  );
}

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
  const [googlePending, setGooglePending] = React.useState(false);
  const [oauthError, setOauthError] = React.useState<string | undefined>(
    undefined
  );

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

  const isAnyPending =
    signInPending ||
    signUpPending ||
    forgotPending ||
    resendPending ||
    googlePending;

  function switchMode(nextMode: AuthMode) {
    if (isAnyPending) return;
    setMode(nextMode);
    setDismissedTabNotice(true);
    setOauthError(undefined);
  }

  async function handleGoogleSignIn() {
    if (isAnyPending) return;
    setOauthError(undefined);
    setDismissedTabNotice(false);
    setGooglePending(true);

    try {
      const supabase = createClient();
      const origin =
        typeof window !== "undefined" ? window.location.origin : "";
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) {
        const normalized = error.message.toLowerCase();
        setOauthError(
          normalized.includes("provider is not enabled")
            ? "Google sign-in is not yet enabled on this server. Please continue with email and password."
            : error.message
        );
        setGooglePending(false);
      }
    } catch {
      setOauthError(
        "Unable to connect to Google right now. Please try again or sign in with email."
      );
      setGooglePending(false);
    }
  }

  const activeState =
    mode === "signin"
      ? signInState
      : mode === "signup"
        ? signUpState
        : forgotState;

  const activeError = dismissedTabNotice
    ? undefined
    : oauthError ??
      resendState.error ??
      activeState.error ??
      (mode === "signin" ? callbackError : undefined);

  const activeMessage = dismissedTabNotice
    ? undefined
    : resendState.message ?? activeState.message;
  const pendingEmail = activeState.pendingEmail ?? (email.trim() || undefined);

  return (
    <div className="w-full max-w-[440px] animate-ks-login-panel">
      <Card
        surface="elevated"
        className="border-[#D4B475]/50 bg-[#FBF7EE]/94 text-[#2B1F15] backdrop-blur-md shadow-[0_24px_60px_-16px_rgba(20,12,6,0.48)]"
      >
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-[10px] border border-[#D4B475]/40 bg-[#2B1F15] text-[#E5BF73]">
              <LotusEmblem size={20} />
            </span>
            <div>
              <CardTitle className="font-display text-2xl tracking-[-0.015em] text-[#2B1F15]">
                {mode === "signin"
                  ? "Sign in to SMARAN"
                  : mode === "signup"
                    ? "Create your SMARAN account"
                    : "Reset your password"}
              </CardTitle>
              <CardDescription className="text-[#5F4D3D]">
                Remember Him. Stay Connected.
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Mode Switcher */}
          <div
            role="tablist"
            aria-label="Authentication method"
            className="grid grid-cols-3 gap-1 rounded-[12px] border border-[#D9C7AA] bg-[#F2E9D8]/85 p-1"
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
                  disabled={isAnyPending}
                  onClick={() => switchMode(tab.id)}
                  className={cn(
                    "min-h-10 cursor-pointer rounded-[8px] px-2 text-xs font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-60 sm:text-sm",
                    selected
                      ? "bg-[#FFFDF8] text-[#2B1F15] shadow-sacred-sm"
                      : "text-[#635040] hover:text-[#2B1F15]"
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
              className="rounded-[10px] border border-[#2F5D46]/30 bg-[#EBF3EC] px-3.5 py-2.5 text-xs leading-relaxed text-[#224735]"
            >
              {activeMessage}
            </div>
          )}

          {!dismissedTabNotice &&
            activeState.needsEmailVerification &&
            pendingEmail && (
              <form
                action={resendAction}
                onSubmit={() => {
                  setDismissedTabNotice(false);
                  setOauthError(undefined);
                }}
              >
                <input type="hidden" name="email" value={pendingEmail} />
                <Button
                  type="submit"
                  variant="outline"
                  size="sm"
                  loading={resendPending}
                  disabled={isAnyPending}
                  className="w-full"
                >
                  Resend verification email
                </Button>
              </form>
            )}

          {mode !== "forgot" && (
            <>
              <Button
                type="button"
                variant="outline"
                size="lg"
                loading={googlePending}
                disabled={isAnyPending}
                onClick={handleGoogleSignIn}
                className="w-full border-[#CEB893] bg-[#FFFDF8] text-[#2B1F15] hover:border-[#B89864] hover:bg-[#F6EDE0]"
              >
                {!googlePending && <GoogleMark />}
                Continue with Google
              </Button>

              <div className="relative flex items-center py-0.5">
                <div className="grow border-t border-[#DFCFB4]" />
                <span className="mx-3 shrink-0 text-[11px] font-medium tracking-[0.06em] uppercase text-[#76624F]">
                  or continue with email
                </span>
                <div className="grow border-t border-[#DFCFB4]" />
              </div>
            </>
          )}

          {mode === "signin" && (
            <form
              action={signInAction}
              onSubmit={() => {
                setDismissedTabNotice(false);
                setOauthError(undefined);
              }}
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
                  className="border-[#D8C6A8] bg-[#FFFDF8] text-[#2B1F15] placeholder:text-[#8E7A66]"
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
                  className="border-[#D8C6A8] bg-[#FFFDF8] text-[#2B1F15] placeholder:text-[#8E7A66]"
                />
              </FormField>

              <div className="flex items-center justify-between text-xs">
                <button
                  type="button"
                  disabled={isAnyPending}
                  onClick={() => switchMode("signup")}
                  className="cursor-pointer font-medium text-[#5F4D3D] transition-colors hover:text-[#2B1F15] hover:underline disabled:cursor-not-allowed disabled:opacity-50"
                >
                  New here? Create account
                </button>
                <button
                  type="button"
                  disabled={isAnyPending}
                  onClick={() => switchMode("forgot")}
                  className="cursor-pointer font-medium text-[#9A5B25] underline underline-offset-2 transition-colors hover:text-[#7A4417] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Forgot password?
                </button>
              </div>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                loading={signInPending}
                disabled={isAnyPending}
                className="w-full font-semibold text-[#24170D]"
              >
                Sign in
              </Button>
            </form>
          )}

          {mode === "signup" && (
            <form
              action={signUpAction}
              onSubmit={() => {
                setDismissedTabNotice(false);
                setOauthError(undefined);
              }}
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
                  className="border-[#D8C6A8] bg-[#FFFDF8] text-[#2B1F15] placeholder:text-[#8E7A66]"
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
                  className="border-[#D8C6A8] bg-[#FFFDF8] text-[#2B1F15] placeholder:text-[#8E7A66]"
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
                  className="border-[#D8C6A8] bg-[#FFFDF8] text-[#2B1F15] placeholder:text-[#8E7A66]"
                />
              </FormField>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                loading={signUpPending}
                disabled={isAnyPending}
                className="w-full font-semibold text-[#24170D]"
              >
                Create account
              </Button>
            </form>
          )}

          {mode === "forgot" && (
            <form
              action={forgotAction}
              onSubmit={() => {
                setDismissedTabNotice(false);
                setOauthError(undefined);
              }}
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
                  className="border-[#D8C6A8] bg-[#FFFDF8] text-[#2B1F15] placeholder:text-[#8E7A66]"
                />
              </FormField>

              <Button
                type="submit"
                variant="gold"
                size="lg"
                loading={forgotPending}
                disabled={isAnyPending}
                className="w-full font-semibold text-[#24170D]"
              >
                Send reset link
              </Button>
            </form>
          )}

          <div className="flex items-start gap-2 border-t border-[#DFCFB4] pt-3.5 text-xs leading-relaxed text-[#5F4D3D]">
            <ShieldCheck
              className="mt-0.5 size-4 shrink-0 text-[#2E5D47]"
              strokeWidth={1.5}
              aria-hidden="true"
            />
            <p>
              Private chanting records stay personal by default.{" "}
              <Link
                href="/"
                className="font-medium text-[#2B1F15] underline underline-offset-2 hover:text-[#9A5B25]"
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
