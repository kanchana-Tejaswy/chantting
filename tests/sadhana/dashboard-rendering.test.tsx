import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  usePathname: () => "/sadhana",
  useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }),
}));

import { AuthPanel } from "@/components/auth/auth-panel";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { PersonalSadhanaDashboard } from "@/components/sadhana/personal-sadhana-dashboard";
import SadhanaLoading from "@/app/sadhana/loading";

describe("Phase 3 component rendering & empty/active states", () => {
  it("renders AuthPanel with Sign in, Sign up, Reset tabs and password visibility eye toggles", () => {
    const html = renderToStaticMarkup(
      <AuthPanel nextPath="/sadhana" callbackError="Session expired" />
    );
    expect(html).toContain("Sign in to Sādhana");
    expect(html).toContain("Forgot password?");
    expect(html).toContain("Session expired");
    expect(html).toContain('aria-label="Show password"');

    const signUpHtml = renderToStaticMarkup(
      <AuthPanel nextPath="/sadhana" initialMode="signup" />
    );
    expect(signUpHtml).toContain("Create your account");
    expect(signUpHtml).toContain('aria-label="Show password"');
  });

  it("renders ResetPasswordForm with accessible password fields and visibility toggles", () => {
    const html = renderToStaticMarkup(
      <ResetPasswordForm email="devotee@example.org" />
    );
    expect(html).toContain("Choose a new password");
    expect(html).toContain("devotee@example.org");
    expect(html).toContain("Confirm new password");
    expect(html).toContain('aria-label="Show password"');
  });

  it("renders OnboardingFlow with Phase 1 carry-forward policies and daily target controls", () => {
    const html = renderToStaticMarkup(
      <OnboardingFlow
        initialDisplayName="Govinda"
        initialTimezone="Asia/Kolkata"
        initialDailyTarget={16}
        initialPolicy="automatic"
        isEditing={false}
      />
    );
    expect(html).toContain("Set your daily Sādhana");
    expect(html).toContain("Automatic carry-forward");
    expect(html).toContain("Optional carry-forward");
    expect(html).toContain("Fresh daily target");
    expect(html).toContain("Custom carry-forward cap");
    expect(html).toContain("16 rounds");
  });

  it("renders thoughtful empty state on PersonalSadhanaDashboard for new users", () => {
    const html = renderToStaticMarkup(
      <PersonalSadhanaDashboard
        displayName="Govinda"
        timezone="Asia/Kolkata"
        carryForwardPolicy="automatic"
        metrics={{
          todayDate: "2026-11-11",
          todayPolicyApplied: "automatic",
          originalTarget: 16,
          carriedForwardBalance: 0,
          effectiveTarget: 16,
          completedRounds: 0,
          pendingRounds: 16,
          extraRounds: 0,
          completionPercentage: 0,
          currentStreak: 0,
          lifetimeRounds: 0,
          recordedDays: 1,
          targetMetDays: 0,
          consistencyRatePct: 0,
          averageDailyRounds: 0,
          recentDays: [
            {
              date: "2026-11-11",
              completedRounds: 0,
              effectiveTarget: 16,
              originalTarget: 16,
              pendingBalance: 0,
              targetMet: false,
              hasActivity: false,
            },
          ],
        }}
        recentSessions={[]}
      />
    );

    expect(html).toContain("Hare Krishna, Govinda");
    expect(html).toContain("Your chanting journal begins gently");
    expect(html).toContain("Start chanting");
    expect(html).toContain('href="/sadhana/chant"');
  });

  it("renders distinct original, carried-forward, and effective targets plus recent activity", () => {
    const html = renderToStaticMarkup(
      <PersonalSadhanaDashboard
        displayName="Govinda"
        timezone="Asia/Kolkata"
        carryForwardPolicy="automatic"
        metrics={{
          todayDate: "2026-11-11",
          todayPolicyApplied: "automatic",
          originalTarget: 16,
          carriedForwardBalance: 11,
          effectiveTarget: 27,
          completedRounds: 14,
          pendingRounds: 13,
          extraRounds: 0,
          completionPercentage: 52,
          currentStreak: 4,
          lifetimeRounds: 128,
          recordedDays: 8,
          targetMetDays: 6,
          consistencyRatePct: 75,
          averageDailyRounds: 16,
          recentDays: [
            {
              date: "2026-11-11",
              completedRounds: 14,
              effectiveTarget: 27,
              originalTarget: 16,
              pendingBalance: 11,
              targetMet: false,
              hasActivity: true,
            },
          ],
        }}
        recentSessions={[
          {
            id: "sess-1",
            sadhana_date: "2026-11-11",
            method: "japa_mala",
            status: "completed",
            current_bead_count: 0,
            rounds_completed: 14,
            started_at: "2026-11-11T05:00:00Z",
            last_activity_at: "2026-11-11T06:30:00Z",
          },
        ]}
      />
    );

    expect(html).toContain("Includes 11 carried forward");
    expect(html).toContain("16 + 11 = 27 rounds");
    expect(html).toContain("Digital Japa Mala");
    expect(html).toContain("128");
  });

  it("renders structural loading skeleton", () => {
    const html = renderToStaticMarkup(<SadhanaLoading />);
    expect(html).toContain('aria-busy="true"');
  });
});

