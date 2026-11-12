import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadOnboardingContext } from "@/lib/sadhana/queries";

export const dynamic = "force-dynamic";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ edit?: string }>;
}) {
  const params = await searchParams;
  const isEditMode = params.edit === "1";

  const context = await loadOnboardingContext();

  if (context.status === "unauthenticated") {
    redirect("/auth?next=/onboarding");
  }

  if (context.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Setup Required">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Database migrations pending</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-ink-muted">
              <p>
                Signed in as {context.userEmail ?? "devotee"}, but the Supabase
                schema has not been applied yet.
              </p>
              <p className="text-xs">{context.detail}</p>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (context.status === "error") {
    return (
      <AppShell pageTitle="Onboarding Error">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load profile</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {context.message}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (context.alreadyCompleted && !isEditMode) {
    redirect("/sadhana");
  }

  const maxCarryCap =
    typeof context.preferences.custom_carry_rule?.max_carry_cap === "number"
      ? context.preferences.custom_carry_rule.max_carry_cap
      : undefined;

  return (
    <AppShell
      pageTitle="Daily Commitment Setup"
      userSummary={{
        displayName: context.profile.display_name,
        email: context.userEmail,
      }}
    >
      <OnboardingFlow
        initialDisplayName={context.profile.display_name}
        initialTimezone={context.profile.timezone}
        initialDailyTarget={context.preferences.daily_round_target}
        initialPolicy={context.preferences.carry_forward_policy}
        initialMaxCarryCap={maxCarryCap}
        isEditing={isEditMode}
      />
    </AppShell>
  );
}

