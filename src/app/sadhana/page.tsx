import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { PersonalSadhanaDashboard } from "@/components/sadhana/personal-sadhana-dashboard";
import { Badge } from "@/components/ui/badge";
import { buttonStyles } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { loadPersonalSadhanaDashboard } from "@/lib/sadhana/queries";

export const dynamic = "force-dynamic";

export default async function SadhanaDashboardPage() {
  const result = await loadPersonalSadhanaDashboard();

  if (result.status === "unauthenticated") {
    redirect("/auth?next=/sadhana");
  }

  if (result.status === "needs_onboarding") {
    redirect("/onboarding");
  }

  if (result.status === "schema_not_ready") {
    return (
      <AppShell
        pageTitle="Personal Sādhana"
        userSummary={{
          displayName: result.userEmail ?? "Devotee",
          email: result.userEmail,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="gold" className="w-fit">
                Database Setup Required
              </Badge>
              <CardTitle className="mt-2 font-display text-3xl">
                Supabase migrations have not been applied yet
              </CardTitle>
              <CardDescription>
                Authentication succeeded ({result.userEmail}), but the PostgreSQL
                Sādhana tables and RPCs are not present on the connected
                Supabase instance yet.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-ink-muted">
              <p>
                Apply <code className="text-ink">supabase/migrations/0001</code>{" "}
                through <code className="text-ink">0013</code> via{" "}
                <code className="text-ink">npm run db:push</code> (using the
                IPv4 Session Pooler URL) or the Supabase SQL Editor, then refresh
                this page.
              </p>
              <p className="rounded-[10px] border border-sandalwood-border bg-linen p-3 text-xs text-ink">
                {result.detail}
              </p>
            </CardContent>
            <CardFooter>
              <Link
                href="/"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Return to Sanctum
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  if (result.status === "error") {
    return (
      <AppShell
        pageTitle="Personal Sādhana"
        userSummary={{
          displayName: result.userEmail ?? "Devotee",
          email: result.userEmail,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <Badge variant="kumkum" className="w-fit">
                Unable to load Sādhana
              </Badge>
              <CardTitle className="mt-2">
                Something interrupted loading your dashboard
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p role="alert" className="text-sm text-kumkum">
                {result.message}
              </p>
            </CardContent>
            <CardFooter>
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Try again
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  const maxCarryCap =
    typeof result.preferences.custom_carry_rule?.max_carry_cap === "number"
      ? result.preferences.custom_carry_rule.max_carry_cap
      : undefined;

  return (
    <AppShell
      pageTitle="Lakshya"
      userSummary={{
        displayName: result.profile.display_name,
        email: result.userEmail,
      }}
    >
      <PersonalSadhanaDashboard
        displayName={result.profile.display_name}
        timezone={result.profile.timezone}
        carryForwardPolicy={result.preferences.carry_forward_policy}
        maxCarryCap={maxCarryCap}
        metrics={result.metrics}
        recentSessions={result.recentSessions}
        activeSession={result.activeSession}
        carryForwardLedger={result.carryForwardLedger}
        pendingOptionalOffer={result.pendingOptionalOffer}
        unappliedPendingNotice={result.unappliedPendingNotice}
      />
    </AppShell>
  );
}
