import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AccountWorkspace } from "@/components/account/account-workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { loadAccountWorkspace } from "@/lib/account/queries";
import { signOutAction } from "@/app/auth/actions";

export const dynamic = "force-dynamic";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const sp = await searchParams;
  const result = await loadAccountWorkspace();

  if (result.status === "unauthenticated") {
    redirect("/auth?next=/account");
  }

  if (result.status === "deactivated") {
    return (
      <AppShell pageTitle="Account Deactivated">
        <div className="mx-auto max-w-xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="neutral" className="w-fit">
                Account Scrubbed
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                This account has been deactivated
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm text-ink-muted">
              <p>
                Personal chanting history, study notes, and identifiers have been
                removed. Please sign out to clear this browser session.
              </p>
              <form action={signOutAction}>
                <button
                  type="submit"
                  className="inline-flex min-h-11 cursor-pointer items-center rounded-[10px] bg-peacock-deep px-4 text-sm font-medium text-ink-on-dark"
                >
                  Sign out
                </button>
              </form>
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "schema_not_ready") {
    return (
      <AppShell pageTitle="Account & Privacy">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="gold" className="w-fit">
                Database Setup Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Migrations 0001–0012 must be applied first
              </CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-ink-muted">
              {result.detail}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "error") {
    return (
      <AppShell pageTitle="Account & Privacy">
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load Account Settings</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {result.message}
            </CardContent>
          </Card>
        </div>
      </AppShell>
    );
  }

  const validTabs = [
    "profile",
    "notifications",
    "milestones",
    "privacy",
  ] as const;
  const initialTab = validTabs.includes(
    sp.tab as (typeof validTabs)[number]
  )
    ? (sp.tab as (typeof validTabs)[number])
    : "profile";

  return (
    <AppShell
      pageTitle="Account & Privacy"
      userSummary={{
        displayName: result.profile.display_name,
        email: result.userEmail,
      }}
      reducedMotion={result.preferences.reduced_motion_preference}
    >
      <AccountWorkspace
        userEmail={result.userEmail}
        profile={result.profile}
        preferences={result.preferences}
        memberships={result.memberships}
        notifications={result.notifications}
        unreadNotificationCount={result.unreadNotificationCount}
        milestones={result.milestones}
        milestoneStats={result.milestoneStats}
        initialTab={initialTab}
      />
    </AppShell>
  );
}

