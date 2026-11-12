import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { AnalyticsView } from "@/components/sadhana/analytics-view";
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
import { loadSadhanaAnalyticsData } from "@/lib/sadhana/queries";

export const dynamic = "force-dynamic";

export default async function SadhanaAnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const params = await searchParams;
  const parsedYear = params.year ? Number.parseInt(params.year, 10) : undefined;
  const validYear =
    parsedYear !== undefined &&
    Number.isInteger(parsedYear) &&
    parsedYear >= 2000 &&
    parsedYear <= 2100
      ? parsedYear
      : undefined;

  const result = await loadSadhanaAnalyticsData(validYear);

  if (result.status === "unauthenticated") {
    redirect("/auth?next=/sadhana/analytics");
  }

  if (result.status === "needs_onboarding") {
    redirect("/onboarding");
  }

  if (result.status === "schema_not_ready") {
    return (
      <AppShell
        pageTitle="Analytics & Heatmap"
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
                Apply <code className="text-ink">supabase/migrations/0001</code>{" "}
                through <code className="text-ink">0009</code> before viewing
                analytics.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-xs text-ink-muted">
              {result.detail}
            </CardContent>
            <CardFooter>
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "secondary", size: "md" })}
              >
                Return to Dashboard
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
        pageTitle="Analytics & Heatmap"
        userSummary={{
          displayName: result.userEmail ?? "Devotee",
          email: result.userEmail,
        }}
      >
        <div className="mx-auto max-w-2xl px-5 py-12">
          <Card surface="parchment">
            <CardHeader>
              <CardTitle>Could not load analytics</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-kumkum">
              {result.message}
            </CardContent>
            <CardFooter>
              <Link
                href="/sadhana"
                className={buttonStyles({ variant: "primary", size: "md" })}
              >
                Return to Dashboard
              </Link>
            </CardFooter>
          </Card>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell
      pageTitle="Consistency & Analytics"
      userSummary={{
        displayName: result.displayName,
        email: result.userEmail,
      }}
    >
      <AnalyticsView
        displayName={result.displayName}
        timezone={result.timezone}
        analytics={result.analytics}
        initialDayDetail={result.initialDayDetail}
      />
    </AppShell>
  );
}

