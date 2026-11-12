import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import {
  emailOnlySchema,
  isValidIanaTimezone,
  onboardingSchema,
  resetPasswordSchema,
  sanitizeRedirectPath,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/validation";
import {
  buildAuthRedirectPath,
  isProtectedRoute,
} from "@/lib/auth/route-guard";

const mockAuth = {
  getClaims: vi.fn(),
  getUser: vi.fn(),
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  resend: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};

vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn(() => ({
    auth: mockAuth,
  })),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: mockAuth,
  })),
}));

class RedirectError extends Error {
  constructor(public readonly location: string) {
    super(`NEXT_REDIRECT:${location}`);
  }
}

vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new RedirectError(url);
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers({ host: "localhost:3000" })),
}));

import { updateSession } from "@/lib/supabase/proxy";
import {
  requestPasswordResetAction,
  signInWithPasswordAction,
  signOutAction,
  signUpWithPasswordAction,
  updatePasswordAction,
} from "@/app/auth/actions";

describe("Phase 3 auth validation, redirects, and protected routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "sb_publishable_test_key_12345";
  });

  it("validates auth and onboarding schemas accurately", () => {
    expect(
      signInSchema.safeParse({
        email: "Devotee@Example.ORG ",
        password: "password123",
      }).success
    ).toBe(true);

    expect(
      signUpSchema.safeParse({
        displayName: "Radhika",
        email: "bad-email",
        password: "short",
      }).success
    ).toBe(false);

    expect(
      resetPasswordSchema.safeParse({
        password: "new-password-123",
        confirmPassword: "different-password",
      }).success
    ).toBe(false);

    expect(
      emailOnlySchema.safeParse({ email: "devotee@example.org" }).success
    ).toBe(true);

    expect(isValidIanaTimezone("Asia/Kolkata")).toBe(true);
    expect(isValidIanaTimezone("Invalid/Zone")).toBe(false);

    const parsedCustom = onboardingSchema.safeParse({
      displayName: "Aradhya",
      timezone: "Asia/Kolkata",
      dailyRoundTarget: "16",
      carryForwardPolicy: "custom",
      maxCarryCap: "12",
    });
    expect(parsedCustom.success).toBe(true);
    if (parsedCustom.success) {
      expect(parsedCustom.data.customCarryRule).toEqual({ max_carry_cap: 12 });
    }
  });

  it("prevents open redirects and detects protected routes", () => {
    expect(sanitizeRedirectPath("/sadhana")).toBe("/sadhana");
    expect(sanitizeRedirectPath("/onboarding?edit=1")).toBe("/onboarding?edit=1");
    expect(sanitizeRedirectPath("https://evil.example")).toBe("/sadhana");
    expect(sanitizeRedirectPath("//evil.example")).toBe("/sadhana");
    expect(sanitizeRedirectPath("/\\evil.example")).toBe("/sadhana");

    expect(isProtectedRoute("/sadhana")).toBe(true);
    expect(isProtectedRoute("/sadhana/chant")).toBe(true);
    expect(isProtectedRoute("/onboarding")).toBe(true);
    expect(isProtectedRoute("/")).toBe(false);
    expect(isProtectedRoute("/auth")).toBe(false);
    expect(isProtectedRoute("/design-system")).toBe(false);

    expect(buildAuthRedirectPath("/sadhana/chant")).toBe(
      "/auth?next=%2Fsadhana%2Fchant"
    );
  });

  it("redirects unauthenticated requests on protected routes in proxy updateSession()", async () => {
    mockAuth.getClaims.mockResolvedValue({ data: null, error: null });

    const req = new NextRequest("http://localhost:3000/sadhana");
    const res = await updateSession(req);
    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe(
      "http://localhost:3000/auth?next=%2Fsadhana"
    );

    const publicReq = new NextRequest("http://localhost:3000/design-system");
    const publicRes = await updateSession(publicReq);
    expect(publicRes.status).toBe(200);
  });

  it("permits authenticated requests on protected routes in proxy updateSession()", async () => {
    mockAuth.getClaims.mockResolvedValue({
      data: { claims: { sub: "11111111-1111-4111-8111-111111111111" } },
      error: null,
    });

    const req = new NextRequest("http://localhost:3000/sadhana");
    const res = await updateSession(req);
    expect(res.status).toBe(200);
  });

  it("handles sign-up verification, unconfirmed sign-in, password reset, and sign-out", async () => {
    // 1. Sign up requiring email confirmation
    mockAuth.signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: null },
      error: null,
    });
    const signUpForm = new FormData();
    signUpForm.set("displayName", "Madhava");
    signUpForm.set("email", "madhava@example.org");
    signUpForm.set("password", "strong-pass-123");
    const signUpResult = await signUpWithPasswordAction({}, signUpForm);
    expect(signUpResult.needsEmailVerification).toBe(true);
    expect(signUpResult.pendingEmail).toBe("madhava@example.org");

    // 2. Auto-confirmed sign up redirects to onboarding
    mockAuth.signUp.mockResolvedValue({
      data: { user: { id: "u1" }, session: { access_token: "tok" } },
      error: null,
    });
    await expect(signUpWithPasswordAction({}, signUpForm)).rejects.toThrow(
      "NEXT_REDIRECT:/onboarding"
    );

    // 3. Unconfirmed sign-in surfaces resend option
    mockAuth.signInWithPassword.mockResolvedValue({
      error: { message: "Email not confirmed" },
    });
    const signInForm = new FormData();
    signInForm.set("email", "madhava@example.org");
    signInForm.set("password", "strong-pass-123");
    const signInErr = await signInWithPasswordAction({}, signInForm);
    expect(signInErr.needsEmailVerification).toBe(true);

    // 4. Forgot password triggers resetPasswordForEmail
    mockAuth.resetPasswordForEmail.mockResolvedValue({ error: null });
    const forgotForm = new FormData();
    forgotForm.set("email", "madhava@example.org");
    const forgotRes = await requestPasswordResetAction({}, forgotForm);
    expect(forgotRes.message).toContain("password reset link");

    // 5. Update password requires active recovery user
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
    const resetForm = new FormData();
    resetForm.set("password", "new-strong-pass-123");
    resetForm.set("confirmPassword", "new-strong-pass-123");
    const resetErr = await updatePasswordAction({}, resetForm);
    expect(resetErr.error).toContain("expired");

    // 6. Existing account sign-up surfaces helpful guidance when identities is empty
    mockAuth.signUp.mockResolvedValue({
      data: { user: { id: "u1", identities: [] }, session: null },
      error: null,
    });
    const dupRes = await signUpWithPasswordAction({}, signUpForm);
    expect(dupRes.error).toContain("already exists");

    // 7. Sign out redirects home
    mockAuth.signOut.mockResolvedValue({ error: null });
    await expect(signOutAction()).rejects.toThrow("NEXT_REDIRECT:/");
  });
});

