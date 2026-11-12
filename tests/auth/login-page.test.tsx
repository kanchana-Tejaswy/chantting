import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mockAuth = {
  getUser: vi.fn(),
  signInWithOAuth: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({
    auth: mockAuth,
  })),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn(() => ({
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

import AuthPage from "@/app/auth/page";
import { AuthPanel } from "@/components/auth/auth-panel";

describe("SMARAN full-screen login page (/auth)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuth.getUser.mockResolvedValue({ data: { user: null }, error: null });
  });

  it("renders full-screen Vrindavan composition with brand identity, headline, email, password toggle, and Google login", async () => {
    const element = await AuthPage({
      searchParams: Promise.resolve({
        next: "/sadhana/chant",
        error: "Access denied by provider",
      }),
    });
    const html = renderToStaticMarkup(element);

    // Full-screen artwork & composition landmarks
    expect(html).toContain("/media/vrindavan-login-bg.jpg");
    expect(html).toContain("SMARAN");
    expect(html).toContain("स्मरण");
    expect(html).toContain("Remember Him. Stay Connected.");
    expect(html).toContain("A space for chanting, learning and devotion.");
    expect(html).toContain("Return to SMARAN");

    // Auth methods & callback error
    expect(html).toContain("Sign in to SMARAN");
    expect(html).toContain("Continue with Google");
    expect(html).toContain('aria-label="Show password"');
    expect(html).toContain("Forgot password?");
    expect(html).toContain("New here? Create account");
    expect(html).toContain("Access denied by provider");
    expect(html).toContain('value="/sadhana/chant"');

    // Footer links point only to valid existing routes
    expect(html).toContain('href="/gita"');
    expect(html).toContain('href="/library"');
  });

  it("supports signup and forgot-password initial modes cleanly", async () => {
    const signupPage = await AuthPage({
      searchParams: Promise.resolve({ mode: "signup" }),
    });
    const signupHtml = renderToStaticMarkup(signupPage);
    expect(signupHtml).toContain("Create your SMARAN account");
    expect(signupHtml).toContain("Continue with Google");

    const forgotHtml = renderToStaticMarkup(
      <AuthPanel nextPath="/sadhana" initialMode="forgot" />
    );
    expect(forgotHtml).toContain("Reset your password");
    expect(forgotHtml).toContain("Send reset link");
    expect(forgotHtml).not.toContain("Continue with Google");
  });

  it("redirects signed-in users safely and rejects open redirects", async () => {
    mockAuth.getUser.mockResolvedValue({
      data: { user: { id: "user-123" } },
      error: null,
    });

    await expect(
      AuthPage({
        searchParams: Promise.resolve({ next: "https://evil.example/steal" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/sadhana");

    await expect(
      AuthPage({
        searchParams: Promise.resolve({ next: "/sadhana/chant" }),
      })
    ).rejects.toThrow("NEXT_REDIRECT:/sadhana/chant");
  });
});

