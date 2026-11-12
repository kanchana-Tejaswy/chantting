"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import {
  emailOnlySchema,
  resetPasswordSchema,
  sanitizeRedirectPath,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/validation";

export interface AuthActionState {
  error?: string;
  message?: string;
  needsEmailVerification?: boolean;
  pendingEmail?: string;
}

function safeRevalidateRootLayout() {
  try {
    revalidatePath("/", "layout");
  } catch {
    // Non-Next test runners execute actions outside a static generation store
  }
}

function formatFriendlyAuthError(rawMessage: string): string {
  const lower = rawMessage.toLowerCase();
  if (lower.includes("invalid login credentials")) {
    return "Incorrect email or password. Use the eye icon to verify your password, or select Reset if needed.";
  }
  if (lower.includes("email not confirmed")) {
    return "Your email address is not confirmed yet. Check your inbox or spam folder for the verification link, or click Resend below.";
  }
  if (lower.includes("rate limit") || lower.includes("too many requests")) {
    return "Too many email requests in a short period. Please wait a few minutes and try again.";
  }
  return rawMessage;
}

async function getRequestOrigin(): Promise<string> {
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSite) {
    try {
      const parsed = new URL(configuredSite);
      if (parsed.protocol === "https:" || parsed.protocol === "http:") {
        return parsed.origin;
      }
    } catch {
      // Fall through to validated host allowlist
    }
  }

  const headerStore = await headers();
  const rawHost =
    headerStore.get("x-forwarded-host") ??
    headerStore.get("host") ??
    "localhost:3000";
  const hostOnly = rawHost.split(",")[0]!.trim();
  const hostname = hostOnly.replace(/:\d+$/, "").toLowerCase();

  const isLocalHost =
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "[::1]";
  const isTrustedPreview = hostname.endsWith(".vercel.app");

  if (!isLocalHost && !isTrustedPreview) {
    return "http://localhost:3000";
  }

  const rawProto = headerStore.get("x-forwarded-proto") ?? (isLocalHost ? "http" : "https");
  const proto = rawProto === "https" ? "https" : "http";
  return `${proto}://${hostOnly}`;
}

export async function signInWithPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your sign-in details.",
    };
  }

  const nextPath = sanitizeRedirectPath(
    formData.get("next")?.toString(),
    "/sadhana"
  );

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error) {
    const lower = error.message.toLowerCase();
    return {
      error: formatFriendlyAuthError(error.message),
      needsEmailVerification: lower.includes("email not confirmed"),
      pendingEmail: lower.includes("email not confirmed")
        ? parsed.data.email
        : undefined,
    };
  }

  safeRevalidateRootLayout();
  redirect(nextPath);
}

export async function signUpWithPasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = signUpSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      error:
        parsed.error.issues[0]?.message ??
        "Please review your registration details.",
    };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: {
        full_name: parsed.data.displayName,
      },
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
    },
  });

  if (error) {
    return { error: formatFriendlyAuthError(error.message) };
  }

  // Supabase returns an empty identities array without an error when anti-enumeration is active
  if (Array.isArray(data.user?.identities) && data.user.identities.length === 0) {
    return {
      error:
        "An account with this email already exists. Switch to Sign in, or use Reset if you forgot your password.",
      pendingEmail: parsed.data.email,
    };
  }

  // If email confirmation is disabled on the project, session is returned immediately
  if (data.session) {
    safeRevalidateRootLayout();
    redirect("/onboarding");
  }

  return {
    message:
      "Account created. Please verify your email using the confirmation link we sent, then sign in to finish onboarding.",
    needsEmailVerification: true,
    pendingEmail: parsed.data.email,
  };
}

export async function resendVerificationAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = emailOnlySchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please enter a valid email.",
    };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: {
      emailRedirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/onboarding")}`,
    },
  });

  if (error) {
    return { error: formatFriendlyAuthError(error.message) };
  }

  return {
    message: `Verification email re-sent to ${parsed.data.email}.`,
    needsEmailVerification: true,
    pendingEmail: parsed.data.email,
  };
}

export async function requestPasswordResetAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = emailOnlySchema.safeParse({
    email: formData.get("email"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please enter a valid email address.",
    };
  }

  const origin = await getRequestOrigin();
  const supabase = await createClient();

  const { error } = await supabase.auth.resetPasswordForEmail(
    parsed.data.email,
    {
      redirectTo: `${origin}/auth/callback?next=${encodeURIComponent("/auth/reset-password")}`,
    }
  );

  if (error) {
    return { error: formatFriendlyAuthError(error.message) };
  }

  return {
    message:
      "If an account matches that address, a password reset link has been sent to your email.",
  };
}

export async function updatePasswordAction(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const parsed = resetPasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Please check your new password.",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error:
        "Your password reset link has expired or is invalid. Request a new reset link to continue.",
    };
  }

  const { error } = await supabase.auth.updateUser({
    password: parsed.data.password,
  });

  if (error) {
    return { error: formatFriendlyAuthError(error.message) };
  }

  safeRevalidateRootLayout();
  redirect("/sadhana");
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  safeRevalidateRootLayout();
  redirect("/");
}
